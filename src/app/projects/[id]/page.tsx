"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import type { VariantProps } from "class-variance-authority";
import { useParams } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import { SopTimeline } from "@/components/SopTimeline";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, User, Clock, Shield, CheckCircle2, BadgeCheck } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogDescription, DialogClose,
} from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge, badgeVariants } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { SOP, SOPStep, SOPStepStatus } from "@/lib/types";

// ---------- fetcher (ปรับ error message ให้อ่านง่าย) ----------
const fetcher = async (url: string) => {
  const r = await fetch(url, { cache: "no-store" });
  if (!r.ok) {
    let msg = `Fetch failed: ${r.status}`;
    try { const j = await r.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  return r.json();
};

// ---------- เพิ่มสถานะภายใน (ขยายจากของเดิม) ----------
type ExtraStatus = "ReadyToApprove" | "ApprovedFinal";
type AnyStatus = SOPStepStatus | ExtraStatus;

// ---------- Types ----------
type FileDoc = { id: string; name: string; size: number; url: string };
type TaskWithDocs = Omit<SOPStep, "status"> & {
  /** stable local id used only on this page (not the SOP step id) */
  _tid: string;
  /** original step id if exists */
  stepId?: string;
  status: AnyStatus;
  documents?: FileDoc[];
};
// Helper to generate stable local task id
const makeTaskId = (projId: string, idx: number, step: SOPStep) => {
  const base = (step as any).id ?? (step as any).stepId ?? (step as any).stepOrder ?? idx;
  return `${projId}__${String(base)}`; // stable across renders per project + step
};

type ProjectRow = {
  key?: string;
  projectId: string;
  projectIndex: number;
  name: string;
  description?: string;
  status: "Active" | "Completed" | "OnHold";
  sop?: string;           // sopId
  startDate?: string;     // yyyy-mm-dd
  completeDate?: string;  // yyyy-mm-dd
  createdAt: number;
  updatedAt: number;
};

// ---------- Badge helpers ----------
const getStatusBadgeVariant = (
  status: AnyStatus
): VariantProps<typeof badgeVariants>["variant"] => {
  switch (status) {
    case "Approved": return "secondary";
    case "Review": return "secondary";
    case "ReadyToApprove": return "outline";
    case "ApprovedFinal": return "default";
    default: return "secondary";
  }
};

const getStatusBadgeText = (status: AnyStatus): string => {
  switch (status) {
    case "Approved": return "In Progress";
    case "Review": return "Ready to Review";
    case "ReadyToApprove": return "Ready to Approve";
    case "ApprovedFinal": return "Approved";
    default: return "Pending";
  }
};

// ---------- Form ----------
interface ProjectFormValues {
  name: string;
  description: string;
  sop: string;
  startDate?: string;
  completeDate?: string;
}

export default function ProjectDetailPage() {
  // ใช้ useParams ฝั่ง client อย่างเดียว
  const { id } = useParams<{ id: string }>() as { id: string };
  const projectId = id;

  // ----- โหลด Project เดียว + SOP ของมัน -----
  const {
    data: project,
    error: projectErr,
    isLoading: loadingProject,
  } = useSWR<ProjectRow>(projectId ? `/api/projects/${projectId}` : null, fetcher);

  const {
    data: sop,
    error: sopErr,
    isLoading: loadingSop,
  } = useSWR<SOP>(project?.sop ? `/api/sops/${project.sop}` : null, fetcher);

  // รายการ SOP ทั้งหมด ใช้ใน Edit dialog
  const { data: allSops } = useSWR<SOP[]>(`/api/sops`, fetcher);

  // ----- UI states -----
  const [tasks, setTasks] = useState<TaskWithDocs[]>([]);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [showDoneAnim, setShowDoneAnim] = useState(false);

  const {
    control,
    register: registerProject,
    handleSubmit: handleSubmitProject,
    reset: resetProject,
    watch,
    setValue,
  } = useForm<ProjectFormValues>({
    defaultValues: {
      name: "",
      description: "",
      sop: "",
      startDate: "",
      completeDate: "",
    },
  });

  // ----- ตั้งค่า form + tasks เมื่อ project/sop มา -----
  useEffect(() => {
    if (project) {
      resetProject({
        name: project.name ?? "",
        description: project.description ?? "",
        sop: project.sop ?? "",
        startDate: project.startDate ?? "",
        completeDate: project.completeDate ?? "",
      });
    }
  }, [project, resetProject]);

  useEffect(() => {
    if (sop && projectId) {
      setTasks(
        (sop.steps ?? []).map((step, i) => ({
          ...step,
          _tid: makeTaskId(projectId, i, step),
          stepId: (step as any).id ?? (step as any).stepId,
          status: ((step as any).status as AnyStatus) || "Draft",
          documents: [],
        })) as TaskWithDocs[]
      );
    } else {
      setTasks([]);
    }
  }, [sop, projectId]);

  // ----- Loading / Error States -----
  if (loadingProject || (project && project.sop && loadingSop)) {
    return (
      <MainLayout>
        <div className="p-8 text-muted-foreground">Loading project…</div>
      </MainLayout>
    );
  }
  if (projectErr) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto mt-16">
          <Card>
            <CardHeader>
              <CardTitle>Project not found</CardTitle>
              <CardDescription>Failed to load this project. {(projectErr as Error).message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link href="/tasks">&larr; Back to Work Tracker</Link></Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // ----- ถ้าไม่มี project จริง ๆ -----
  if (!project) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto mt-16">
          <Card>
            <CardHeader>
              <CardTitle>Project not found</CardTitle>
              <CardDescription>We couldn’t find this project. It may have been removed or the URL is wrong.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild><Link href="/tasks">&larr; Back to Work Tracker</Link></Button>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // ----- Actions -----
  const handleStatusChange = (taskTid: string, newStatus: AnyStatus) => {
    setTasks((prev) => prev.map((t) => (t._tid === taskTid ? { ...t, status: newStatus } : t)));
  };

  const handleEditProject = async (data: ProjectFormValues) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          sop: data.sop || undefined,
          startDate: data.startDate || undefined,
          completeDate: data.completeDate || undefined,
        }),
      });
      if (!res.ok) {
        let msg = `Save failed (${res.status})`;
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      await mutate(`/api/projects/${projectId}`); // รีโหลดหน้า detail
      await mutate(`/api/projects`);              // เผื่อ list หน้า tasks
      // ถ้าเปลี่ยน SOP ให้รีโหลด SOP ใหม่
      const updated = await res.json();
      if (updated?.sop) {
        await mutate(`/api/sops/${updated.sop}`);
      }
      setIsEditProjectOpen(false);
    } catch (e: any) {
      alert(e?.message || "Failed to save project");
    }
  };

  const stampTodayToCompleteDate = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    const isoDate = `${y}-${m}-${d}`;
    setValue("completeDate", isoDate);
    return isoDate;
  };

  const confirmFinishProject = async () => {
    if (!allApproved) return;
    const isoDate = stampTodayToCompleteDate();

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Completed", completeDate: isoDate }),
      });
      if (!res.ok) throw new Error(`Finish failed (${res.status})`);
      await mutate(`/api/projects/${projectId}`);
      await mutate(`/api/projects`);

      // Animation
      setShowDoneAnim(true);
      setIsFinishOpen(false);
      setTimeout(() => setShowDoneAnim(false), 1800);
    } catch (e: any) {
      alert(e?.message || "Failed to finish project");
    }
  };

  // ------- Docs (client-only mock) -------
  const getId = () =>
    (globalThis as any)?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  const handleAddDocuments = (taskTid: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    setTasks((prev) =>
      prev.map((t) => {
        if (t._tid !== taskTid) return t;
        const nextDocs: FileDoc[] = [
          ...(t.documents || []),
          ...files.map((f) => ({
            id: `${taskTid}-${getId()}`,
            name: f.name,
            size: f.size,
            url: URL.createObjectURL(f),
          })),
        ];
        return { ...t, documents: nextDocs };
      })
    );
  };

  const handleRemoveDocument = (taskTid: string, docId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t._tid !== taskTid) return t;
        const target = (t.documents || []).find((d) => d.id === docId);
        if (target) { try { URL.revokeObjectURL(target.url); } catch {} }
        const nextDocs = (t.documents || []).filter((d) => d.id !== docId);
        return { ...t, documents: nextDocs };
      })
    );
  };

  // ------- Finish Project flow -------
  const allApproved =
    tasks.length > 0 && tasks.every((t) => t.status === "ApprovedFinal");

  return (
    <MainLayout>
      {/* ===== Header ===== */}
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2 max-w-4xl">
          <Link href="/tasks" className="text-sm text-primary hover:underline">
            &larr; Back to Work Tracker
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <h1 className="text-4xl font-bold text-primary">{project.name}</h1>
            {project?.status && (
              <Badge variant="default" className="h-6">
                {project.status}
              </Badge>
            )}
          </div>
          <p className="text-lg text-muted-foreground">{project.description}</p>
        </div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Button className="gap-2" onClick={() => setIsFinishOpen(true)} disabled={!tasks.length}>
                  <CheckCircle2 className="w-4 h-4" />
                  Finish Project
                </Button>
              </span>
            </TooltipTrigger>
            {!tasks.length && <TooltipContent>ต้องมี Task อย่างน้อย 1 รายการ</TooltipContent>}
          </Tooltip>
        </TooltipProvider>

        {/* Finish Confirm */}
        <AlertDialog open={isFinishOpen} onOpenChange={setIsFinishOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Finish this project?</AlertDialogTitle>
              <AlertDialogDescription>
                ระบบจะปิดโปรเจคได้เมื่อ <b>ทุก Task เป็น Approved</b>
                {allApproved ? (
                  <span className="block mt-2 text-green-600">
                    ✓ พร้อมปิดโปรเจค
                  </span>
                ) : (
                  <span className="block mt-2 text-red-600">
                    ✗ ยังมี Task ที่ไม่ใช่ Approved
                  </span>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction type="button" disabled={!allApproved} onClick={confirmFinishProject}>
                Confirm Finish
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Done animation */}
        {showDoneAnim && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30">
            <div className="bg-white rounded-2xl p-8 shadow-xl flex flex-col items-center justify-center gap-3 animate-in fade-in zoom-in duration-300">
              <div className="relative">
                <div className="absolute inset-0 rounded-full animate-ping bg-green-500/30" />
                <div className="rounded-full bg-green-500 p-4 text-white">
                  <BadgeCheck className="w-10 h-10" />
                </div>
              </div>
              <div className="text-xl font-semibold text-green-700">Done!</div>
              <div className="text-sm text-muted-foreground">
                Project marked as <b>Completed</b>.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <Card>
            {/* ===== Header + Edit ===== */}
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Project To-Do List</CardTitle>
                <CardDescription>
                  {sop ? <>Tasks generated from the linked SOP: "{sop.title}"</> : "No SOP linked."}
                </CardDescription>
              </div>

              <Dialog open={isEditProjectOpen} onOpenChange={setIsEditProjectOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Project
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Project</DialogTitle>
                    <DialogDescription>Update the project details and linked SOP.</DialogDescription>
                  </DialogHeader>

                  <form onSubmit={handleSubmitProject(handleEditProject)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="projectName">Project Name</Label>
                      <Input id="projectName" {...registerProject("name", { required: "Project name is required" })} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="projectDescription">Project Description</Label>
                      <Textarea id="projectDescription" {...registerProject("description", { required: "Description is required" })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4 col-span-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input id="start-date" type="date" {...registerProject("startDate")} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="complete-date">Complete Date</Label>
                        <Input id="complete-date" type="date" {...registerProject("completeDate")} />
                      </div>
                    </div>

                    {/* เลือก SOP */}
                    <div className="space-y-2">
                      <Label htmlFor="projectSop">Relevant SOP</Label>
                      <Controller
                        control={control}
                        name="sop"
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger id="projectSop">
                              <SelectValue placeholder="Select an SOP" />
                            </SelectTrigger>
                            <SelectContent>
                              {(allSops ?? []).map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Preview สั้นๆ */}
                    <div className="rounded-lg border p-3 text-sm">
                      <div className="font-semibold">
                        {(allSops ?? []).find((s) => s.id === watch("sop"))?.title ?? "—"}
                      </div>
                      <ul className="mt-1 list-disc pl-4">
                        {(allSops ?? [])
                          .find((s) => s.id === watch("sop"))
                          ?.steps.slice(0, 3)
                          .map((st, i) => <li key={i}>{(st as any).title ?? st}</li>) || null}
                      </ul>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <DialogClose asChild>
                        <Button type="button" variant="ghost">Cancel</Button>
                      </DialogClose>
                      <Button type="submit">Save Changes</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>

            {/* ===== Tasks ===== */}
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {sop && tasks.length > 0 ? (
                  tasks.map((task) => (
                    <Card key={task._tid} className="p-4 pt-10 relative">
                      <Badge variant={getStatusBadgeVariant(task.status)} className="absolute top-3 left-3">
                        {getStatusBadgeText(task.status)}
                      </Badge>

                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-2 min-w-0">
                          <div className="flex justify-between items-center">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Label className="text-lg font-semibold truncate cursor-pointer">
                                    {task.title}
                                  </Label>
                                </TooltipTrigger>
                                <TooltipContent><p>{task.title}</p></TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Select
                                value={task.status as string}
                                onValueChange={(value) => handleStatusChange(task._tid, value as AnyStatus)}
                              >
                                <SelectTrigger className="w-[220px] h-8">
                                  <SelectValue placeholder="Set status" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Draft">Not Started</SelectItem>
                                  <SelectItem value="Approved">In Progress</SelectItem>
                                  <SelectItem value="Review">Ready to Review</SelectItem>
                                  <SelectItem value="ReadyToApprove">Ready to Approve</SelectItem>
                                  <SelectItem value="ApprovedFinal">Approved</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground break-words">{task.detail}</p>

                          {/* Documents (client only) */}
                          <div className="mt-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Documents</Label>
                              <div className="relative">
                                <Input
                                  id={`file-${task._tid}`}
                                  type="file"
                                  multiple
                                  className="absolute inset-0 opacity-0 cursor-pointer"
                                  onChange={(e) => handleAddDocuments(task._tid, e.target.files)}
                                />
                                <Button variant="outline" size="sm">Add Document</Button>
                              </div>
                            </div>

                            {task.documents && task.documents.length > 0 ? (
                              <ul className="space-y-2">
                                {task.documents.map((doc) => (
                                  <li key={doc.id} className="flex items-center justify-between rounded-md border p-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium">{doc.name}</p>
                                      <p className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Link href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm underline">Download</Link>
                                      <Button variant="ghost" size="sm" onClick={() => handleRemoveDocument(task._tid, doc.id)}>Remove</Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-xs text-muted-foreground">No documents yet.</p>
                            )}
                          </div>

                          <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs pt-2">
                            <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> SLA: {task.sla} days</div>
                            <div className="flex items-center gap-1.5"><User className="w-3 h-3" /> Owner: {task.owner}</div>
                            <div className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Reviewer: {task.reviewer}</div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {sopErr ? "Failed to load SOP." : "This SOP has no steps defined."}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: SOP Guideline */}
        <div className="space-y-6 md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>SOP Guideline</CardTitle>
              <CardDescription>{sop?.title ?? "—"}</CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              {sop ? <SopTimeline steps={sop.steps} /> : <p className="text-sm text-muted-foreground">No SOP linked.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}
