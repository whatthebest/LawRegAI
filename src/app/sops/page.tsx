// src/app/sops/page.tsx (your file)
"use client";

import { useState, useMemo, useEffect, Suspense, useRef } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, Search, FilePlus2, Check, X, List, UserCheck, Workflow, FileText, PlusCircle } from 'lucide-react';
import type { SOP, SOPDepartment, SOPStatus } from '@/lib/types';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { SopTimeline } from '@/components/SopTimeline';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ✅ NEW: use real backend helpers
import { fetchSopsByStatus, patchSopStatus } from '@/lib/api/sops';

// You can still import mockTemplates if templates remain mocked:
import { mockTemplates, sopDepartments, sopStatuses } from '@/lib/mockData';

const getStatusVariant = (status: SOPStatus) => {
  switch (status) {
    case 'Approved': return 'default';
    case 'In Review': return 'secondary';
    case 'Draft': return 'outline';
    case 'Archived': return 'destructive';
    default: return 'outline';
  }
};

function SopsPageContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'list';

  const [departmentFilter, setDepartmentFilter] = useState<SOPDepartment | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<SOPStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const [sops, setSops] = useState<SOP[]>([]);
  const [reviewSops, setReviewSops] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Keep a flag to avoid setState on unmounted
  const mountedRef = useRef(true);
  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // REPLACE your useEffect(() => { const load = async () => { ... } }, []) with THIS:

useEffect(() => {
  let alive = true;

  // ❶ A small watchdog so the UI can’t stay in loading forever
  //    (fires if something unexpected blocks the finally)
  const watchdog = setTimeout(() => {
    if (!alive) return;
    console.error("watchdog: forcing loader off after 12s");
    setError((e) => e ?? "Request took too long. Please try again.");
    setLoading(false);
  }, 12_000);

  (async () => {
    setLoading(true);
    setError(null);
    console.log("[SOPs] load start");

    try {
      // ❷ Use allSettled so one failing status doesn't block the rest
      const results = await Promise.allSettled([
        fetchSopsByStatus("Approved"),
        fetchSopsByStatus("In Review"),
      ]);

      if (!alive) return;

      const ok: SOP[] = [];
      const errs: string[] = [];

      results.forEach((r, idx) => {
        const tag = idx === 0 ? "Approved" : "In Review";
        if (r.status === "fulfilled") {
          ok.push(...r.value);
        } else {
          const msg =
            r.reason instanceof Error ? r.reason.message : String(r.reason);
          errs.push(`${tag}: ${msg}`);
        }
      });

      // Optional sort: latest first
      ok.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setSops(ok.filter(s => s.status === "Approved"));
      setReviewSops(ok.filter(s => s.status === "In Review"));

      if (errs.length) {
        console.warn("[SOPs] partial failures:", errs.join(" | "));
        setError(`Some sections failed — ${errs.join(" | ")}`);
      }
    } catch (e) {
      if (!alive) return;
      const msg = e instanceof Error ? e.message : "Unknown error";
      console.error("[SOPs] load failed:", msg);
      setError(
        msg.toLowerCase().includes("timed out")
          ? "Unable to load SOPs. Please try again."
          : msg
      );
    } finally {
      if (alive) {
        console.log("[SOPs] load finally — clearing loader");
        clearTimeout(watchdog);
        setLoading(false); // ← guarantees the spinner clears
      }
    }
  })();

  return () => {
    alive = false;
    clearTimeout(watchdog);
  };
}, []);


  const filteredSops = useMemo(() => {
    return sops
      .filter(sop => departmentFilter === 'all' || sop.department === departmentFilter)
      .filter(sop => statusFilter === 'all' || sop.status === statusFilter)
      .filter(sop => sop.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [sops, departmentFilter, statusFilter, searchTerm]);

  // ✅ REAL Approve/Reject using PATCH
  const handleApproval = async (sopId: string, newStatus: 'Approved' | 'Draft') => {
    // Find the SOP in the review list
    const current = reviewSops.find(x => (x.sopId ?? x.id) === sopId);
    if (!current) {
      toast({ title: 'Not found', description: 'SOP not in review list.' });
      return;
    }

    const actionPast = newStatus === 'Approved' ? 'approved' : 'rejected';

    // Optimistic UI: move/update first
    setReviewSops(prev => prev.filter(x => (x.sopId ?? x.id) !== sopId));
    if (newStatus === 'Approved') {
      setSops(prev => [
        { ...current, status: 'Approved', updatedAt: new Date().toISOString() } as SOP,
        ...prev,
      ]);
    }

    try {
      const updated = await patchSopStatus(sopId, newStatus);

      // Reconcile with server response (in case backend adds timestamps/normalizes fields)
      setSops(prev => {
        // If approved, update/merge it in the list
        if (newStatus === 'Approved') {
          const idx = prev.findIndex(x => (x.sopId ?? x.id) === (updated.sopId ?? updated.id));
          if (idx >= 0) {
            const clone = [...prev];
            clone[idx] = { ...clone[idx], ...updated };
            return clone;
          }
          return [{ ...(updated as SOP) }, ...prev];
        }
        // If rejected->Draft: ensure it’s not in Approved list
        return prev.filter(x => (x.sopId ?? x.id) !== (updated.sopId ?? updated.id));
      });

      // If rejected → Draft, ensure it disappears from the review tab (already removed optimistically)
      if (newStatus === 'Draft') {
        setReviewSops(prev => prev.filter(x => (x.sopId ?? x.id) !== (updated.sopId ?? updated.id)));
      }

      toast({
        title: `SOP ${actionPast}`,
        description: `The SOP was successfully ${actionPast}.`,
      });
    } catch (err: any) {
      // Rollback optimistic update
      setReviewSops(prev => [current, ...prev]);
      if (newStatus === 'Approved') {
        setSops(prev => prev.filter(x => (x.sopId ?? x.id) !== sopId));
      }
      const description = err?.message?.toLowerCase().includes('timed out')
      ? 'Unable to update SOP. Please try again.'
      : err?.message || 'Could not update SOP status.';
      toast({
        title: 'Update failed',
        description,
        variant: 'destructive',
      });
            // Optional: log to monitoring/analytics service
            console.error('Error updating SOP status', err);
    }
  };

  if (loading) return <div>Loading SOPs...</div>;
  if (error)   return <div className="text-red-500">{error}</div>;

  return (
    <MainLayout>
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">SOPs & Templates</h1>
          <p className="text-lg text-muted-foreground">Browse, search, and manage all procedures and templates.</p>
        </div>
        <Link href="/create-sop" passHref>
          <Button className='gap-2'><FilePlus2 className='w-4 h-4'/> Create New SOP</Button>
        </Link>
      </div>

      <Tabs defaultValue={initialTab}>
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
                  <Select value={departmentFilter} onValueChange={(value) => setDepartmentFilter(value as SOPDepartment | 'all')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {sopDepartments.map(dept => <SelectItem key={dept} value={dept}>{dept}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SOPStatus | 'all')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {sopStatuses.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
                    filteredSops.map(sop => (
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
                                  <SopTimeline steps={sop.steps} />
                                </div>
                              </DialogContent>
                            </Dialog>
                            <span>{sop.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>{sop.department}</TableCell>
                        <TableCell>
                          {(() => {
                            const dt = new Date(sop.createdAt);
                            return isNaN(dt.getTime()) ? '-' : format(dt, 'MMMM d, yyyy');
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/sops/${sop.sopId ?? sop.id}`} passHref>
                            <Button variant="ghost" size="sm" className='gap-1'>
                              View
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center h-24">
                        No SOPs found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
              <Accordion type="multiple" className="w-full space-y-4">
                {reviewSops.map(sop => (
                  <AccordionItem value={sop.id ?? sop.sopId} key={sop.id ?? sop.sopId} className="border-b-0">
                    <Card className="shadow-md">
                      <AccordionTrigger className="p-6 text-left hover:no-underline">
                        <div className="flex justify-between w-full items-center">
                          <div className="space-y-1">
                            <h3 className="font-bold text-lg text-primary">{sop.title}</h3>
                            <p className="text-sm text-muted-foreground">{sop.department} &bull; Submitted by {sop.responsiblePerson ?? sop.submittedBy ?? '—'}</p>
                          </div>
                          <div className='flex items-center gap-4'>
                            <Badge variant={getStatusVariant(sop.status)}>{sop.status}</Badge>
                            <span className="text-sm text-muted-foreground">
                              {(() => {
                                const dt = new Date(sop.createdAt);
                                return isNaN(dt.getTime()) ? '-' : format(dt, 'MMM d, yyyy');
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
                            <SopTimeline steps={sop.steps} />
                          </div>
                          <Separator />
                          <div className="space-y-4">
                            <h4 className="font-semibold">Manager Action</h4>
                            <Textarea placeholder="Add comments for the creator (optional)..." />
                            <div className="flex gap-4">
                              <Button
                                onClick={() => handleApproval(sop.sopId ?? sop.id, 'Approved')}
                                className="gap-2 bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-4 h-4" /> Approve
                              </Button>
                              <Button
                                onClick={() => handleApproval(sop.sopId ?? sop.id, 'Draft')}
                                variant="destructive"
                                className="gap-2"
                              >
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

              {reviewSops.length === 0 && (
                <p className="text-center text-muted-foreground py-12">There are no SOPs awaiting review.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates (still mocked) */}
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
                  {mockTemplates.length > 0 ? (
                    mockTemplates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.title}</TableCell>
                        <TableCell className="text-muted-foreground max-w-sm truncate">{template.description}</TableCell>
                        <TableCell>{format(new Date(template.createdAt), "MMMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/template-document/edit/${template.id}`}>Edit</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center h-24">
                        No templates found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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

