// src/app/sops/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, FilePlus2, Check, X, List, UserCheck, Workflow, FileText, PlusCircle, History } from "lucide-react";
import type { SOP, SOPDepartment, SOPStatus, SopStatusEvent } from "@/lib/types";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SopTimeline } from "@/components/SopTimeline";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// real backend helpers
import { fetchSopsByStatus, patchSopStatus } from "@/lib/api/sops";
import { fetchTemplates } from "@/lib/api/templates";
import type { TemplateRecord } from "@/lib/api/templates";


// still-mocked options
import { sopDepartments, sopStatuses } from "@/lib/mockData";

const getStatusVariant = (status: SOPStatus) => {
  switch (status) {
    case "Approved":
      return "default";
    case "In Review":
      return "secondary";
    case "Draft":
      return "outline";
    case "Archived":
      return "destructive";
    default:
      return "outline";
  }
};

const normalizeEmail = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.normalize("NFC").trim().toLowerCase();
  return trimmed.length ? trimmed : undefined;
};

/* ---- UI helpers for smooth loading ---- */
function useDelayedSpinner(active: boolean, delay = 300) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let t: any;
    if (active) t = setTimeout(() => setShow(true), delay);
    else setShow(false);
    return () => clearTimeout(t);
  }, [active, delay]);
  return show;
}

function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-5 gap-4 py-3 border-b">
          <div className="h-4 bg-muted/60 rounded col-span-2" />
          <div className="h-4 bg-muted/60 rounded" />
          <div className="h-4 bg-muted/60 rounded" />
          <div className="h-4 bg-muted/60 rounded" />
        </div>
      ))}
    </div>
  );
}

function SopsPageContent() {
  const searchParams = useSearchParams();
  const queryTab = searchParams.get("tab") || "list";
  const searchKey = searchParams.toString();

  const [activeTab, setActiveTab] = useState(queryTab);

  const [departmentFilter, setDepartmentFilter] = useState<SOPDepartment | "all">("all");
  const [statusFilter, setStatusFilter] = useState<SOPStatus | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const [sops, setSops] = useState<SOP[]>([]);
  const [reviewSops, setReviewSops] = useState<SOP[]>([]);
  const [draftSops, setDraftSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [userDirectory, setUserDirectory] = useState<Record<string, { managerEmail?: string; managerName?: string }>>({});
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [historyDialogSop, setHistoryDialogSop] = useState<SOP | null>(null);

  const { user } = useAuth();
  const isManager = user?.systemRole === "Manager";
  const allowedTabs = useMemo(() => {
    const base = ["list"];
    if (isManager) base.push("manager");
    base.push("history", "templates");
    return base;
  }, [isManager]);
  const showSpinner = useDelayedSpinner(loading, 300);
  const templatesSpinner = useDelayedSpinner(templatesLoading, 300);
  useEffect(() => {
    if (allowedTabs.includes(queryTab)) setActiveTab(queryTab);
    else setActiveTab("list");
  }, [queryTab, allowedTabs]);

  useEffect(() => {
    let alive = true;

    // watchdog to prevent permanent loading
    const watchdog = setTimeout(() => {
      if (!alive) return;
      console.error("watchdog: forcing loader off after 12s");
      setError((e) => e ?? "Request took too long. Please try again.");
      setLoading(false);
    }, 12_000);

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          fetchSopsByStatus("Approved"),
          fetchSopsByStatus("In Review"),
          fetchSopsByStatus("Draft"),
          fetchTemplates(), // Fetch templates alongside SOPs
        ]);

        if (!alive) return;

        const ok: SOP[] = [];
        const errs: string[] = [];

        const statusResults: Array<[PromiseSettledResult<SOP[]>, SOPStatus]> = [
          [results[0], "Approved"],
          [results[1], "In Review"],
          [results[2], "Draft"],
        ];

        statusResults.forEach(([result, tag]) => {
          if (result.status === "fulfilled") ok.push(...(result.value as SOP[]));
          else errs.push(`${tag}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
        });

        const templateResult = results[3];
        if (templateResult.status === "fulfilled") {
          const sortedTemplates = [...(templateResult.value as TemplateRecord[])].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setTemplates(sortedTemplates);
        } else {
          errs.push(`Templates: ${templateResult.reason instanceof Error ? templateResult.reason.message : String(templateResult.reason)}`);
        }

        ok.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setSops(ok.filter((s) => s.status === "Approved"));
        setReviewSops(ok.filter((s) => s.status === "In Review"));
        setDraftSops(ok.filter((s) => s.status === "Draft"));
        setReviewNotes({});

        if (errs.length) setError(`Some sections failed — ${errs.join(" | ")}`);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg.toLowerCase().includes("timed out") ? "Unable to load SOPs. Please try again." : msg);
      } finally {
        if (alive) {
          clearTimeout(watchdog);
          setLoading(false);
          setTemplatesLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
      clearTimeout(watchdog);
    };
  }, []); // Changed to run once on mount

  // This effect is now only for when the templates tab is active, if not already loaded
  useEffect(() => {
    if (activeTab !== "templates" || templates.length > 0) return;

    let alive = true;
    (async () => {
      setTemplatesLoading(true);
      setTemplatesError(null);
      try {
        const list = await fetchTemplates();
        if (!alive) return;
        const sorted = [...list].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTemplates(sorted);
      } catch (e) {
        if (!alive) return;
        const msg = e instanceof Error ? e.message : "Unknown error";
        setTemplatesError(
          msg.toLowerCase().includes("timed out") ? "Unable to load templates. Please try again." : msg
        );
      } finally {
        if (alive) setTemplatesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [activeTab, templates.length]);

  useEffect(() => {
    if (!isManager) return;

    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/users', { cache: 'no-store' });
        if (!alive) return;
        if (!res.ok) throw new Error(await res.text().catch(() => res.statusText));
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const map: Record<string, { managerEmail?: string; managerName?: string }> = {};
        for (const entry of data) {
          const emailKey = normalizeEmail(entry?.email ?? entry?.Email);
          if (!emailKey) continue;
          const managerEmail = normalizeEmail(entry?.managerEmail ?? entry?.manager_email);
          const managerName = typeof entry?.managerName === 'string' ? entry.managerName : undefined;
          map[emailKey] = { managerEmail, managerName };
        }
        setUserDirectory(map);
      } catch (error) {
        console.warn('Failed to load user directory for manager routing', error);
      }
    })();

    return () => { alive = false; };
  }, [isManager]);


  const handleTabChange = (next: string) => {
    setActiveTab(allowedTabs.includes(next) ? next : "list");
  };

  const displayTab = allowedTabs.includes(activeTab) ? activeTab : "list";

  const userEmailKey = normalizeEmail(user?.email);
  const managerEmailKey = userEmailKey;

  const managerReviewSops = useMemo(() => {
    if (!isManager || !managerEmailKey) return [];

    return reviewSops.filter((sop) => {
      const assigned = normalizeEmail(sop.managerEmail);
      if (assigned) return assigned === managerEmailKey;

      const submitterEmail = normalizeEmail(sop.submittedByEmail);
      if (submitterEmail) {
        const mapped = userDirectory[submitterEmail]?.managerEmail;
        if (mapped) return mapped === managerEmailKey;
      }

      return false;
    });
  }, [isManager, managerEmailKey, reviewSops, userDirectory]);

  const filteredSops = useMemo(() => {
    return sops
      .filter((sop) => departmentFilter === "all" || sop.department === departmentFilter)
      .filter((sop) => statusFilter === "all" || sop.status === statusFilter)
      .filter((sop) => sop.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sops, departmentFilter, statusFilter, searchTerm]);

  // Approve/Reject
  const handleApproval = async (sopId: string, newStatus: "Approved" | "Draft") => {
    const current = reviewSops.find((x) => (x.sopId ?? x.id) === sopId);
    if (!current) {
      toast({ title: "Not found", description: "SOP not in review list." });
      return;
    }

    const note = (reviewNotes[sopId] ?? "").trim();
    const actionPast = newStatus === "Approved" ? "approved" : "rejected";

    // optimistic move
    setReviewSops((prev) => prev.filter((x) => (x.sopId ?? x.id) !== sopId));
    if (newStatus === "Approved") {
      setSops((prev) => [{ ...current, status: "Approved", updatedAt: new Date().toISOString() } as SOP, ...prev]);
    }

    try {
      const updated = await patchSopStatus(sopId, newStatus, note || undefined);

      setSops((prev) => {
        if (newStatus === "Approved") {
          const idx = prev.findIndex((x) => (x.sopId ?? x.id) === (updated.sopId ?? updated.id));
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = { ...clone[idx], ...updated };
            return clone;
          }
          return [updated as SOP, ...prev];
        }
        return prev.filter((x) => (x.sopId ?? x.id) !== (updated.sopId ?? updated.id));
      });

      if (newStatus === "Draft") {
        setDraftSops((prev) => {
          const filtered = prev.filter((x) => (x.sopId ?? x.id) !== (updated.sopId ?? updated.id));
          return [updated as SOP, ...filtered];
        });
      } else {
        setDraftSops((prev) => prev.filter((x) => (x.sopId ?? x.id) !== (updated.sopId ?? updated.id)));
      }

      setReviewNotes((prev) => {
        const next = { ...prev };
        delete next[sopId];
        return next;
      });

      toast({ title: `SOP ${actionPast}`, description: `The SOP was successfully ${actionPast}.` });
    } catch (err: any) {
      setReviewSops((prev) => [current, ...prev]);
      if (newStatus === "Approved") {
        setSops((prev) => prev.filter((x) => (x.sopId ?? x.id) !== sopId));
      }
      toast({
        title: "Update failed",
        description: err?.message?.toLowerCase().includes("timed out") ? "Unable to update SOP. Please try again." : err?.message || "Could not update SOP status.",
        variant: "destructive",
      });
      console.error("Error updating SOP status", err);
    }
  };

  const normalizeIso = (value?: string) => {
    if (!value) return undefined;
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return undefined;
    return dt.toISOString();
  };

  const getSubmitterEmail = (sop: SOP): string | undefined => {
    const candidates = [
      sop.submittedByEmail,
      (sop as any)?.submitterEmail,
      sop.ownerEmail,
      sop.owner,
      sop.responsiblePerson,
    ];
    for (const candidate of candidates) {
      const normalized = normalizeEmail(candidate);
      if (normalized) return normalized;
    }
    return undefined;
  };

  const buildStatusHistory = (sop: SOP): SopStatusEvent[] => {
    const raw = Array.isArray(sop.statusHistory) ? sop.statusHistory : [];
    const normalized = raw
      .map((event) => {
        if (!event?.status || !event?.decidedAt) return undefined;
        const decidedAtIso = normalizeIso(event.decidedAt);
        if (!decidedAtIso) return undefined;
        return {
          status: event.status,
          decidedAt: decidedAtIso,
          decidedBy: event.decidedBy,
          decidedByEmail: event.decidedByEmail,
          comment: event.comment,
          action: event.action,
          previousStatus: event.previousStatus,
        } as SopStatusEvent;
      })
      .filter((event): event is SopStatusEvent => Boolean(event));

    if (!normalized.some((evt) => evt.action === "submitted")) {
      normalized.unshift({
        status: sop.status,
        decidedAt: normalizeIso(sop.createdAt) ?? new Date(sop.createdAt).toISOString(),
        decidedBy: sop.submittedBy ?? sop.responsiblePerson,
        decidedByEmail: sop.submittedByEmail,
        action: "submitted",
      });
    }

    return normalized.sort((a, b) => new Date(a.decidedAt).getTime() - new Date(b.decidedAt).getTime());
  };

  const getActionLabel = (event: SopStatusEvent | undefined, status?: SOPStatus) => {
    if (!event) {
      if (status === "In Review") return "Awaiting review";
      return status ?? "Status";
    }
    switch (event.action) {
      case "approved":
        return "Approved";
      case "rejected":
      case "returned":
        return "Rejected";
      case "submitted":
        return "Submitted";
      case "updated":
        return "Updated";
      default:
        return event.status ?? status ?? "Status change";
    }
  };

  const formatDateTime = (value?: string) => {
    if (!value) return "-";
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return "-";
    return format(dt, "MMM d, yyyy p");
  };

  const mySubmissionHistory = useMemo(() => {
    if (!userEmailKey) return [] as SOP[];
    const aggregate = new Map<string, SOP>();
    const all = [...sops, ...reviewSops, ...draftSops];

    all.forEach((sop) => {
      const key = String(sop.sopId ?? sop.id ?? "");
      if (!key) return;
      const submitter = getSubmitterEmail(sop);
      if (submitter !== userEmailKey) return;

      const existing = aggregate.get(key);
      const currentTs = new Date(sop.updatedAt ?? sop.createdAt ?? 0).getTime();
      if (!existing) {
        aggregate.set(key, sop);
        return;
      }
      const existingTs = new Date(existing.updatedAt ?? existing.createdAt ?? 0).getTime();
      if (currentTs > existingTs) {
        aggregate.set(key, sop);
      }
    });

    return Array.from(aggregate.values()).sort((a, b) => {
      const aTs = new Date(a.updatedAt ?? a.createdAt ?? 0).getTime();
      const bTs = new Date(b.updatedAt ?? b.createdAt ?? 0).getTime();
      return bTs - aTs;
    });
  }, [draftSops, reviewSops, sops, userEmailKey]);

  return (
    <MainLayout>
      {error && <div className="p-3 mb-4 text-sm text-red-700 bg-red-50 rounded">{error}</div>}

      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">SOPs & Templates</h1>
          <p className="text-lg text-muted-foreground">Browse, search, and manage all procedures and templates.</p>
        </div>
        <Link href="/create-sop" passHref>
          <Button className="gap-2">
            <FilePlus2 className="w-4 h-4" /> Create New SOP
          </Button>
        </Link>
      </div>

      <Tabs value={displayTab} onValueChange={handleTabChange}>
        <TabsList className={`grid w-full mb-4 ${isManager ? "grid-cols-4" : "grid-cols-3"}`}>
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" /> List of SOPs
          </TabsTrigger>
          {isManager && (
            <TabsTrigger value="manager" className="gap-2">
              <UserCheck className="w-4 h-4" /> Manager Review
            </TabsTrigger>
          )}
          <TabsTrigger value="history" className="gap-2">
            <History className="w-4 h-4" /> Submission History
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-2">
            <FileText className="w-4 h-4" /> Document Templates
          </TabsTrigger>
        </TabsList>

        {/* Approved List */}
        <TabsContent value="list">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1 md:grow-0">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search by SOP title..."
                    className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-4">
                  <Select value={departmentFilter} onValueChange={(v) => setDepartmentFilter(v as SOPDepartment | "all")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {sopDepartments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as SOPStatus | "all")}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {sopStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showSpinner ? (
                <TableSkeleton rows={6} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SOP Title</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSops.length > 0 ? (
                      filteredSops.map((sop) => {
                        const relevantTemplates = templates.filter(
                          t => t.relevantSopId === sop.id || t.relevantSopId === sop.sopId
                        );
                        return (
                          <TableRow key={sop.id ?? sop.sopId}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7">
                                      <Workflow className="w-4 h-4 text-muted-foreground" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="sm:max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>Timeline Preview: {sop.title}</DialogTitle>
                                    </DialogHeader>
                                    <div className="max-h-[70vh] overflow-y-auto p-4">
                                      <SopTimeline steps={sop.steps ?? []} />
                                    </div>
                                  </DialogContent>
                                </Dialog>

                                {relevantTemplates.length > 0 && (
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Relevant Templates for: {sop.title}</DialogTitle>
                                      </DialogHeader>
                                      <div className="max-h-[70vh] overflow-y-auto p-4 space-y-2">
                                        {relevantTemplates.map(template => (
                                          <Link
                                          key={(template.key ?? template.id ?? template.templateId) as string}
                                          href={`/template-document/edit/${encodeURIComponent(
                                            (template.key ?? template.id ?? template.templateId ?? "").toString().trim()
                                          )}`}
                                          className="block"
                                        >
                                            <Card className="hover:bg-muted/50 transition-colors">
                                              <CardContent className="p-3">
                                                <p className="font-semibold">{template.title}</p>
                                                <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                                              </CardContent>
                                          </Card>
                                        </Link>
                                        ))}
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                )}
                                
                                <span>{sop.title}</span>
                              </div>
                            </TableCell>
                            <TableCell>{sop.department}</TableCell>
                            <TableCell>
                              {(() => {
                                const dt = new Date(sop.createdAt);
                                return isNaN(dt.getTime()) ? "-" : format(dt, "MMMM d, yyyy");
                              })()}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Link href={`/sops/${sop.sopId ?? sop.id}`} passHref>
                                <Button variant="ghost" size="sm" className="gap-1">
                                  View
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24">
                          No SOPs found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isManager && (
          <TabsContent value="manager">
            <Card>
            <CardHeader>
                <CardTitle>Manager Review</CardTitle>
                <CardDescription>Review, approve, or reject SOPs that are pending action.</CardDescription>
              </CardHeader>
              <CardContent>
                {showSpinner ? (
                  <div className="space-y-3 animate-pulse">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-20 bg-muted/60 rounded" />
                    ))}
                  </div>
                ) : (
                  <Accordion type="multiple" className="w-full space-y-4">
                    {managerReviewSops.map((sop) => {
                      const noteKey = String(sop.sopId ?? sop.id ?? "");
                      return (
                        <AccordionItem value={sop.id ?? sop.sopId} key={sop.id ?? sop.sopId} className="border-b-0">
                          <Card className="shadow-md">
                            <AccordionTrigger className="p-6 text-left hover:no-underline">
                              <div className="flex justify-between w-full items-center">
                                <div className="space-y-1">
                                  <h3 className="font-bold text-lg text-primary">{sop.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {sop.department} &bull; Submitted by {sop.responsiblePerson ?? sop.submittedBy ?? "Unknown"}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {(() => {
                                      const dt = new Date(sop.createdAt);
                                      return isNaN(dt.getTime()) ? "-" : format(dt, "MMM d, yyyy");
                                    })()}
                                  </span>
                                </div>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="px-6 pb-6">
                              <Separator className="mb-4" />
                              <div className="space-y-6">
                                <div>
                                  <h4 className="font-semibold mb-2">Description</h4>
                                  <p className="text-muted-foreground">{sop.description}</p>
                                </div>
                                <div>
                                  <h4 className="font-semibold mb-2">SOP Timeline & Steps</h4>
                                  <SopTimeline steps={sop.steps ?? []} />
                                </div>
                                <Separator />
                                <div className="space-y-4">
                                  <h4 className="font-semibold">Manager Action</h4>
                                  <Textarea
                                    placeholder="Add comments for the creator (optional)..."
                                    value={reviewNotes[noteKey] ?? ""}
                                    onChange={(e) => setReviewNotes((prev) => ({ ...prev, [noteKey]: e.target.value }))}
                                  />
                                  <div className="flex gap-4">
                                    <Button onClick={() => handleApproval(noteKey, "Approved")} className="gap-2 bg-green-600 hover:bg-green-700">
                                      <Check className="w-4 h-4" /> Approve
                                    </Button>
                                    <Button onClick={() => handleApproval(noteKey, "Draft")} variant="destructive" className="gap-2">
                                      <X className="w-4 h-4" /> Reject
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </AccordionContent>
                        </Card>
                      </AccordionItem>
                      );
                    })}
                  </Accordion>
              )}

              {!showSpinner && managerReviewSops.length === 0 && (
                <p className="text-center text-muted-foreground py-12">There are no SOPs awaiting review.</p>
              )}
            </CardContent>
            </Card>
          </TabsContent>
        )}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <CardTitle>Submission History</CardTitle>
                <CardDescription>Track the SOPs you've submitted and see their manager decisions.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {!userEmailKey ? (
                <p className="text-muted-foreground text-center py-12">Log in to view your submission history.</p>
              ) : mySubmissionHistory.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">You haven't submitted any SOPs yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SOP Title</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Action</TableHead>
                      <TableHead>Manager Comment</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mySubmissionHistory.map((sop) => {
                      const historyEvents = buildStatusHistory(sop);
                      const lastEvent = historyEvents[historyEvents.length - 1];
                      const actionLabel = getActionLabel(lastEvent, sop.status);
                      const actionTime = lastEvent ? formatDateTime(lastEvent.decidedAt) : "-";
                      const managerNote = lastEvent?.comment ?? sop.managerComment ?? "No comment";
                      const linkSlug = sop.sopId ?? sop.id ?? "";
                      return (
                        <TableRow key={sop.sopId ?? sop.id}>
                          <TableCell className="font-medium">
                            <div className="flex flex-col">
                              <span>{sop.title}</span>
                              <span className="text-xs text-muted-foreground">{sop.department}</span>
                            </div>
                          </TableCell>
                          <TableCell>{formatDateTime(sop.createdAt)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{actionLabel}</span>
                              <span className="text-xs text-muted-foreground">{actionTime}</span>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <span className="text-sm text-muted-foreground line-clamp-2">{managerNote}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {linkSlug ? (
                                <Button variant="outline" size="sm" asChild>
                                  <Link href={`/sops/${encodeURIComponent(linkSlug)}`} prefetch={false}>
                                    View
                                  </Link>
                                </Button>
                              ) : (
                                <Button variant="outline" size="sm" disabled>
                                  View
                                </Button>
                              )}
                              <Button variant="ghost" size="sm" onClick={() => setHistoryDialogSop(sop)}>
                                View History
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Dialog open={Boolean(historyDialogSop)} onOpenChange={(open) => !open && setHistoryDialogSop(null)}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Status History: {historyDialogSop?.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                {historyDialogSop ? (
                  buildStatusHistory(historyDialogSop).map((event, index) => (
                    <div key={`${event.decidedAt}-${index}`} className="border rounded-lg p-4 space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant={getStatusVariant(event.status)}>{getActionLabel(event, event.status)}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(event.decidedAt)}</span>
                      </div>
                      {event.decidedBy && (
                        <p className="text-sm text-muted-foreground">By {event.decidedBy}{event.decidedByEmail ? ` (${event.decidedByEmail})` : ''}</p>
                      )}
                      {event.comment && (
                        <p className="text-sm whitespace-pre-wrap">{event.comment}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No history available.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates">
          <Card>
            <CardHeader className="flex flex-row justify-between items-center">
              <div>
                <CardTitle>Template Library</CardTitle>
                <CardDescription>Browse all available document templates.</CardDescription>
              </div>
              <Link href="/template-document/create" passHref>
                <Button className="gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Create New Template
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
            {templatesError && (
                <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {templatesError}
                </div>
              )}
              {templatesSpinner ? (
                <TableSkeleton rows={4} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                    <TableHead>Title</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                    </TableHeader>
                  <TableBody>
                    {templates.length > 0 ? (
                      templates.map((template) => {
                        const rawSlug = (template.key ?? template.id ?? template.templateId ?? "").toString();
                        const slug = rawSlug.normalize("NFC").trim();
                        return (
                          <TableRow key={template.templateId ?? template.id ?? template.key ?? template.title}>
                            <TableCell className="font-medium">{template.title}</TableCell>
                            <TableCell className="text-muted-foreground max-w-sm truncate">{template.description}</TableCell>
                            <TableCell>
                              {(() => {
                                const dt = new Date(template.createdAt);
                                return Number.isNaN(dt.getTime()) ? "-" : format(dt, "MMMM d, yyyy");
                              })()}
                            </TableCell>
                              <TableCell className="text-right">
                                {slug ? (
                                  <Button variant="outline" size="sm" asChild>
                                    <Link href={`/template-document/edit/${encodeURIComponent(slug)}`} prefetch={false}>
                                      Edit
                                    </Link>
                                  </Button>
                                ) : (
                                  <Button variant="outline" size="sm" disabled title="Missing template identifier">
                                    Edit
                                  </Button>
                                )}
                              </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24">
                          No templates found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}

export default function SopsListPage() {
  return <SopsPageContent />;
}



