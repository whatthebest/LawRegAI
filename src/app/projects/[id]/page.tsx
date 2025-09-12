/* eslint-disable */
"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Edit, User, Clock, Shield, CheckCircle2, BadgeCheck, Trash2 } from "lucide-react";
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

  // Resolve linked SOP id/key from the project, regardless of field naming
  const linkedSopId = useMemo(() => {
    const p: any = project || {};
    return (p.sop ?? p.sopId ?? p.sopKey ?? "").toString().trim();
  }, [project]);

  const {
    data: sop,
    error: sopErr,
    isLoading: loadingSop,
  } = useSWR<SOP>(linkedSopId ? `/api/sops/${linkedSopId}` : null, fetcher);

  // Load project tasks (materialized from SOP)
  type ProjectTaskRow = {
    taskId: string;
    stepOrder?: number;
    title?: string;
    detail?: string;
    stepType?: string;
    nextStepYes?: string;
    nextStepNo?: string;
    sla?: number;
    owner?: string;
    reviewer?: string;
    approver?: string;
    status?: string;
    documents?: any[] | Record<string, any> | undefined;
  };
  const { data: projectTasks, isLoading: loadingTasks, error: tasksErr } = useSWR<ProjectTaskRow[]>(
    projectId ? `/api/projects/${projectId}/tasks` : null,
    fetcher
  );

  // รายการ SOP ทั้งหมด ใช้ใน Edit dialog
  const { data: allSops } = useSWR<SOP[]>(`/api/sops`, fetcher);

  // ----- UI states -----
  const [tasks, setTasks] = useState<TaskWithDocs[]>([]);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isFinishOpen, setIsFinishOpen] = useState(false);
  const [showDoneAnim, setShowDoneAnim] = useState(false);
  const [savingTask, setSavingTask] = useState<Record<string, boolean>>({});
  const [taskToDelete, setTaskToDelete] = useState<TaskWithDocs | null>(null);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

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
    if (projectTasks && projectId) {
      const list = (projectTasks ?? []).map((t, i) => {
        const docs = t?.documents
          ? Array.isArray(t.documents)
            ? t.documents
            : Object.values(t.documents as Record<string, any>)
          : [];
        const base: any = {
          id: t.taskId,
          stepOrder: t.stepOrder ?? i + 1,
          title: t.title ?? "",
          detail: t.detail ?? "",
          stepType: (t.stepType as any) ?? "Sequence",
          nextStepYes: t.nextStepYes,
          nextStepNo: t.nextStepNo,
          sla: t.sla ?? 1,
          owner: t.owner ?? "",
          reviewer: t.reviewer ?? "",
          approver: t.approver ?? "",
        } as SOPStep;
        const stepAny: any = base;
        return {
          ...base,
          _tid: `${projectId}__${t.taskId}`,
          stepId: t.taskId,
          status: (t.status as AnyStatus) ?? ("Draft" as AnyStatus),
          documents: docs as FileDoc[],
        } as TaskWithDocs;
      });
      setTasks(list);
    } else if (!loadingTasks) {
      setTasks([]);
    }
  }, [projectTasks, projectId, loadingTasks]);

  // ----- Loading / Error States -----
  if (loadingProject || (project && project.sop && loadingSop) || loadingTasks) {
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
  const persistTaskStatus = async (task: TaskWithDocs, newStatus: AnyStatus) => {
    const headers = { "Content-Type": "application/json" };

    const stepId = task.stepId;

    const candidates: { url: string; method: "PUT" | "PATCH"; body: any }[] = [];

    // Primary: project task endpoint by stepId
    if (stepId) {
      candidates.push({
        url: `/api/projects/${projectId}/tasks/${encodeURIComponent(stepId)}`,
        method: "PUT",
        body: { status: newStatus },
      });
      // Convenience fallback
      candidates.push({
        url: `/api/projects/${projectId}/tasks`,
        method: "PUT",
        body: { stepId, status: newStatus },
      });
      // Last resort: project-level PUT with stepId
      candidates.push({
        url: `/api/projects/${projectId}`,
        method: "PUT",
        body: { stepId, status: newStatus },
      });
    }

    for (const req of candidates) {
      try {
        const res = await fetch(req.url, {
          method: req.method,
          headers,
          body: JSON.stringify(req.body),
        });
        if (res.ok) return true;
        // Log server-provided error text for debugging
        try {
          const t = await res.text();
          console.error(`[persistTaskStatus] ${req.method} ${req.url} -> ${res.status}`, t);
        } catch {}
      } catch (e) {
        console.error(`[persistTaskStatus] failed ${req.method} ${req.url}`, e);
      }
    }
    return false;
  };

  const handleStatusChange = async (taskTid: string, newStatus: AnyStatus) => {
    // optimistic UI
    let targetTask: TaskWithDocs | undefined;
    setTasks((prev) =>
      prev.map((t) => {
        if (t._tid === taskTid) {
          targetTask = t;
          return { ...t, status: newStatus };
        }
        return t;
      })
    );
    setSavingTask((s) => ({ ...s, [taskTid]: true }));
    try {
      if (targetTask) {
        const ok = await persistTaskStatus(targetTask, newStatus);
        if (!ok) {
          // revert on failure
          setTasks((prev) => prev.map((t) => (t._tid === taskTid ? { ...t, status: targetTask!.status } : t)));
          alert("Failed to save status.\nPlease confirm which endpoint should update a step:\n1) PATCH /api/sops/:sopId/steps { stepId, status }\n2) PUT /api/sops/:sopId/steps/:stepId { status }\n3) PUT /api/sops/:sopId { stepId, status }\n(or project-level /api/projects/:id/tasks...)");
        } else {
          // refresh project/related data
          await mutate(`/api/projects/${projectId}/tasks`);
          await mutate(`/api/projects/${projectId}`);
        }
      }
    } finally {
      setSavingTask((s) => {
        const next = { ...s };
        delete next[taskTid];
        return next;
      });
    }
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

  const confirmDeleteTask = async () => {
    if (!taskToDelete || !taskToDelete.stepId) return;
    try {
      const res = await fetch(
        `/api/projects/${projectId}/tasks/${encodeURIComponent(taskToDelete.stepId)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      setTasks((prev) => prev.filter((t) => t._tid !== taskToDelete!._tid));
      setTaskToDelete(null);
      await mutate(`/api/projects/${projectId}/tasks`);
    } catch (e: any) {
      alert(e?.message || "Failed to delete task");
    }
  };


  // ------- Docs (client-only mock) -------
  const getId = () =>
    (globalThis as any)?.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

  const handleAddDocuments = async (taskTid: string, fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const t = tasks.find((x) => x._tid === taskTid);
    if (!t?.stepId) return;

    const form = new FormData();
    Array.from(fileList).forEach((f) => form.append("file", f));
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${encodeURIComponent(t.stepId)}/documents`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`Upload failed (${res.status})`);
      const data = await res.json();
      const uploaded: FileDoc[] = (data?.uploaded ?? []) as FileDoc[];
      if (uploaded.length) {
        setTasks((prev) => prev.map((x) => (x._tid === taskTid ? { ...x, documents: [ ...(x.documents ?? []), ...uploaded ] } : x)));
      }
    } catch (e: any) {
      alert(e?.message || "Failed to upload document(s)");
    }
  };

  const handleRemoveDocument = async (taskTid: string, docId: string) => {
    const t = tasks.find((x) => x._tid === taskTid);
    if (!t?.stepId) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks/${encodeURIComponent(t.stepId)}/documents/${encodeURIComponent(docId)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`Remove failed (${res.status})`);
      setTasks((prev) => prev.map((x) => (x._tid === taskTid ? { ...x, documents: (x.documents || []).filter((d) => d.id !== docId) } : x)));
    } catch (e: any) {
      alert(e?.message || "Failed to remove document");
    }
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

        {/* Delete Task Confirm */}
        <AlertDialog open={!!taskToDelete} onOpenChange={(o) => { if (!o) setTaskToDelete(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this task?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The task and its documents will be removed from this project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={confirmDeleteTask}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Project deletion moved to Tasks page */}

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
                  {sop ? <>Tasks generated from the linked SOP: "{sop.title}"</> : (linkedSopId ? "Loading SOP…" : "No SOP linked.")}
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
                        {(
                          (allSops ?? []).find((s) => s.id === watch("sop"))?.steps?.slice(0, 3) ?? []
                        ).map((st, i) => (
                          <li key={i}>{(st as any)?.title ?? String(st)}</li>
                        ))}
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
                {tasks.length > 0 ? (
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
                                onValueChange={async (value) => { await handleStatusChange(task._tid, value as AnyStatus); }}
                                disabled={!!savingTask[task._tid]}
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

                          <div className="flex items-center justify-between pt-2 gap-2">
                            <div className="flex items-center flex-wrap gap-x-4 gap-y-2 text-xs">
                              <div className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> SLA: {task.sla} days</div>
                              <div className="flex items-center gap-1.5"><User className="w-3 h-3" /> Owner: {task.owner}</div>
                              <div className="flex items-center gap-1.5"><Shield className="w-3 h-3" /> Reviewer: {task.reviewer}</div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              aria-label="Delete task"
                              className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                              onClick={() => setTaskToDelete(task)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="py-10 flex flex-col items-center gap-4 text-center text-muted-foreground">
                    <p className="text-sm">
                      {linkedSopId
                        ? sopErr
                          ? "Failed to load SOP."
                          : "This SOP has no steps defined."
                        : "No tasks yet. Create your first task."}
                    </p>
                    {!linkedSopId && (
                      <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full max-w-[640px] bg-muted text-foreground hover:bg-blue-50 hover:text-blue-700"
                          >
                            + Add Task
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Add Task</DialogTitle>
                            <DialogDescription>Create a task for this project (no SOP).</DialogDescription>
                          </DialogHeader>
                          <AddTaskForm
                            onCreated={() => {
                              setIsAddTaskOpen(false);
                              mutate(`/api/projects/${projectId}/tasks`);
                            }}
                            projectId={projectId}
                          />
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                )}
              </div>

              {/* Add Task at bottom (full-width) when no SOP and there are tasks already */}
              {!linkedSopId && tasks.length > 0 && (
                <div className="pt-2">
                  <Dialog open={isAddTaskOpen} onOpenChange={setIsAddTaskOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full bg-muted text-foreground hover:bg-blue-50 hover:text-blue-700"
                      >
                        + Add Task
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Task</DialogTitle>
                        <DialogDescription>Create a task for this project (no SOP).</DialogDescription>
                      </DialogHeader>

                      <AddTaskForm
                        onCreated={() => {
                          setIsAddTaskOpen(false);
                          mutate(`/api/projects/${projectId}/tasks`);
                        }}
                        projectId={projectId}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: SOP Guideline */}
        <div className="space-y-6 md:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>SOP Guideline</CardTitle>
              <CardDescription>
                {sop?.title ?? (linkedSopId ? "—" : "Project Tasks")}
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto">
              {sop ? (
                <SopTimeline steps={sop.steps} />
              ) : tasks.length > 0 ? (
                <SopTimeline
                  steps={tasks.map((t) => ({
                    id: t.stepId || t._tid,
                    stepOrder: t.stepOrder,
                    title: t.title,
                    detail: t.detail,
                    stepType: t.stepType as any,
                    nextStepYes: (t as any).nextStepYes,
                    nextStepNo: (t as any).nextStepNo,
                    sla: t.sla,
                    owner: t.owner,
                    reviewer: t.reviewer,
                    approver: t.approver,
                    status: (t.status as any) || "Draft",
                    attachments: [],
                  }))}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No SOP linked.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}

// ----- Add Task Form Component -----
function AddTaskForm({ projectId, onCreated }: { projectId: string; onCreated: () => void }) {
  const { register, handleSubmit, control, watch, formState: { isSubmitting } } = useForm<any>({
    defaultValues: {
      title: "",
      detail: "",
      stepType: "Sequence",
      sla: 1,
      owner: "",
      reviewer: "",
      approver: "",
    },
  });

  const onSubmit = async (data: any) => {
    const payload: any = {
      title: String(data.title || ""),
      detail: String(data.detail || ""),
      stepType: data.stepType === "Decision" ? "Decision" : "Sequence",
      sla: Number(data.sla) || 1,
      owner: String(data.owner || ""),
      reviewer: String(data.reviewer || ""),
      approver: String(data.approver || ""),
    };
    if (payload.stepType === "Decision") {
      if (data.nextStepYes) payload.nextStepYes = String(data.nextStepYes);
      if (data.nextStepNo) payload.nextStepNo = String(data.nextStepNo);
    }
    const res = await fetch(`/api/projects/${projectId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      let msg = `Create failed (${res.status})`;
      try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
      alert(msg);
      return;
    }
    onCreated();
  };

  const stepType = watch("stepType");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="task-title">Title</Label>
        <Input id="task-title" {...register("title", { required: true })} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="task-detail">Detail</Label>
        <Textarea id="task-detail" {...register("detail")} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Step Type</Label>
          <Controller
            control={control}
            name="stepType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select step type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sequence">Sequence</SelectItem>
                  <SelectItem value="Decision">Decision</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-sla">SLA (days)</Label>
          <Input id="task-sla" type="number" min={0} {...register("sla", { valueAsNumber: true })} />
        </div>
      </div>

      {stepType === "Decision" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="task-next-yes">Next step (Yes)</Label>
            <Input id="task-next-yes" {...register("nextStepYes")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-next-no">Next step (No)</Label>
            <Input id="task-next-no" {...register("nextStepNo")} />
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="task-owner">Owner</Label>
          <Input id="task-owner" placeholder="owner@email" {...register("owner")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-reviewer">Reviewer</Label>
          <Input id="task-reviewer" placeholder="reviewer@email" {...register("reviewer")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="task-approver">Approver</Label>
          <Input id="task-approver" placeholder="approver@email" {...register("approver")} />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isSubmitting}>Create Task</Button>
      </div>
    </form>
  );
}
