// src/app/sops/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowRight, Search, FilePlus2, Check, X, List, UserCheck, Workflow, FileText, PlusCircle } from "lucide-react";
import type { SOP, SOPDepartment, SOPStatus } from "@/lib/types";
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateRecord[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // show spinner only if load takes >300ms
  const showSpinner = useDelayedSpinner(loading, 300);
  const templatesSpinner = useDelayedSpinner(templatesLoading, 300);

  useEffect(() => {
    setActiveTab(queryTab);
  }, [queryTab]);

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
          fetchTemplates(), // Fetch templates alongside SOPs
        ]);

        if (!alive) return;

        const ok: SOP[] = [];
        const errs: string[] = [];

        // SOPs
        [results[0], results[1]].forEach((r, idx) => {
          const tag = idx === 0 ? "Approved" : "In Review";
          if (r.status === "fulfilled") ok.push(...(r.value as SOP[]));
          else errs.push(`${tag}: ${r.reason instanceof Error ? r.reason.message : String(r.reason)}`);
        });
        
        // Templates
        const templateResult = results[2];
        if (templateResult.status === 'fulfilled') {
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
    const actionPast = newStatus === "Approved" ? "approved" : "rejected";

    // optimistic move
    setReviewSops((prev) => prev.filter((x) => (x.sopId ?? x.id) !== sopId));
    if (newStatus === "Approved") {
      setSops((prev) => [{ ...current, status: "Approved", updatedAt: new Date().toISOString() } as SOP, ...prev]);
    }

    try {
      const updated = await patchSopStatus(sopId, newStatus);
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
        setReviewSops((prev) => prev.filter((x) => (x.sopId ?? x.id) !== (updated.sopId ?? updated.id)));
      }
      toast({ title: `SOP ${actionPast}`, description: `The SOP was successfully ${actionPast}.` });
    } catch (err: any) {
      // rollback
      setReviewSops((prev) => [current, ...prev]);
      if (newStatus === "Approved") setSops((prev) => prev.filter((x) => (x.sopId ?? x.id) !== sopId));
      toast({
        title: "Update failed",
        description: err?.message?.toLowerCase().includes("timed out") ? "Unable to update SOP. Please try again." : err?.message || "Could not update SOP status.",
        variant: "destructive",
      });
      console.error("Error updating SOP status", err);
    }
  };

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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="list" className="gap-2">
            <List className="w-4 h-4" /> List of SOPs
          </TabsTrigger>
          <TabsTrigger value="manager" className="gap-2">
            <UserCheck className="w-4 h-4" /> Manager Review
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

        {/* Manager Review */}
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
                  {reviewSops.map((sop) => (
                    <AccordionItem value={sop.id ?? sop.sopId} key={sop.id ?? sop.sopId} className="border-b-0">
                      <Card className="shadow-md">
                        <AccordionTrigger className="p-6 text-left hover:no-underline">
                          <div className="flex justify-between w-full items-center">
                            <div className="space-y-1">
                              <h3 className="font-bold text-lg text-primary">{sop.title}</h3>
                              <p className="text-sm text-muted-foreground">
                                {sop.department} &bull; Submitted by {sop.responsiblePerson ?? sop.submittedBy ?? "—"}
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
                              <Textarea placeholder="Add comments for the creator (optional)..." />
                              <div className="flex gap-4">
                                <Button onClick={() => handleApproval(sop.sopId ?? sop.id, "Approved")} className="gap-2 bg-green-600 hover:bg-green-700">
                                  <Check className="w-4 h-4" /> Approve
                                </Button>
                                <Button onClick={() => handleApproval(sop.sopId ?? sop.id, "Draft")} variant="destructive" className="gap-2">
                                  <X className="w-4 h-4" /> Reject
                                </Button>
                              </div>
                            </div>
                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {!showSpinner && reviewSops.length === 0 && (
                <p className="text-center text-muted-foreground py-12">There are no SOPs awaiting review.</p>
              )}
            </CardContent>
          </Card>
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
