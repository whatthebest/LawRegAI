"use client";

import { useMemo, useState, useRef } from "react";
import useSWR, { mutate } from "swr";
import { useAuth } from "@/context/AuthContext";
import MainLayout from "@/components/MainLayout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import type { SOP } from "@/lib/types";
import {
  Check,
  Clock,
  PlusCircle,
  FolderKanban,
  Briefcase,
  Bug,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SopTimeline } from "@/components/SopTimeline";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import TimelineDndBoard from "@/components/ui/TimelineDndBoard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const fetcher = (url: string) =>
  fetch(url, { cache: "no-store" }).then((r) => {
    if (!r.ok) throw new Error(`Fetch failed: ${r.status}`);
    return r.json();
  });

/** shape ที่ API /api/projects ส่งกลับ (สอดคล้องโค้ด route.ts ที่คุยไว้) */
type ProjectRow = {
  key?: string;
  projectId: string; // เช่น project-001
  projectIndex: number;
  name: string;
  description?: string;
  status: "Active" | "Completed" | "OnHold";
  sop?: string; // sopId
  startDate?: string; // yyyy-mm-dd
  completeDate?: string;
  createdAt: number;
  updatedAt: number;
};

type DbTask = {
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
  projectId: string;
  projectName?: string;
  sopId?: string;
};

export default function TasksPage() {
  const { user } = useAuth();

  // ---------- ดึงจาก Backend ----------
  const {
    data: projects,
    isLoading: loadingProjects,
    error: projectsErr,
  } = useSWR<ProjectRow[]>("/api/projects", fetcher);
  const { data: sops, isLoading: loadingSops, error: sopsErr } = useSWR<SOP[]>(
    "/api/sops",
    fetcher
  );

  // ---------- Dialog & Select states ----------
  const [isCreateWorkOpen, setCreateWorkOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
  const [selectedSop, setSelectedSop] = useState<SOP | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<{ projectId: string; name: string } | null>(null);

  // sentinel non-empty สำหรับ Radix
  const NONE = "__NONE__";
  const [sopValue, setSopValue] = useState<string | undefined>(undefined);

  // กันเด้ง Warning ตอนกด Save
  const bypassCloseRef = useRef(false);

  const handleSopSelect = (val: string) => {
    if (val === NONE) {
      setSopValue(undefined);
      setSelectedSop(null);
      return;
    }
    setSopValue(val);
    setSelectedSop((sops ?? []).find((s) => s.id === val) ?? null);
  };

  const handleDialogChange = (open: boolean) => {
    if (open) {
      setSelectedSop(null);
      setSopValue(undefined);
      setCreateWorkOpen(true);
    } else {
      if (bypassCloseRef.current) {
        bypassCloseRef.current = false;
        setCreateWorkOpen(false);
        setSelectedSop(null);
        setSopValue(undefined);
      } else {
        setConfirmClose(true);
      }
    }
  };

  const handleConfirmClose = () => {
    setConfirmClose(false);
    setCreateWorkOpen(false);
    setSelectedSop(null);
    setSopValue(undefined);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    try {
      const res = await fetch(`/api/projects/${projectToDelete.projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await mutate("/api/projects");
      setProjectToDelete(null);
    } catch (e: any) {
      alert(e?.message || "Failed to delete project");
    }
  };

  // ---------- Load tasks from all projects (DB) and flatten ----------
  const activeProjects = useMemo(() => (
    (projects || []).filter((p) => p.status === "Active")
  ), [projects]);

  const { data: flatProjectTasks, isLoading: loadingProjectTasks } = useSWR<DbTask[]>(
    projects
      ? [
          "projectTasks",
          (activeProjects || [])
            .map((p: any) => p?.projectId || (p as any)?.id || (p as any)?.key || "")
            .join(","),
        ]
      : null,
    async () => {
      if (!activeProjects || activeProjects.length === 0) return [] as DbTask[];
      const list = await Promise.all(
        activeProjects.map(async (p: any) => {
          const pid = p?.projectId || p?.id || p?.key;
          if (!pid) return [] as DbTask[];
          try {
            const r = await fetch(`/api/projects/${pid}/tasks`, { cache: "no-store" });
            if (!r.ok) return [] as DbTask[];
            const arr = (await r.json()) as any[];
            return arr.map((t) => ({ ...t, projectId: pid, projectName: p.name, sopId: p.sop })) as DbTask[];
          } catch {
            return [] as DbTask[];
          }
        })
      );
      return list.flat();
    }
  );

  const tasks = useMemo(() => {
    if (!user || !flatProjectTasks) return [] as DbTask[];
    return flatProjectTasks.filter(
      (t) => t.owner === user.email || t.reviewer === user.email || t.approver === user.email
    );
  }, [user, flatProjectTasks]);

  const onProcessTasks = tasks.filter((t) => t.status === "Approved"); // In Progress
  const toReviewTasks = tasks.filter((t) => t.reviewer === user?.email && t.status === "Review");
  const toApproveTasks = tasks.filter((t) => t.approver === user?.email && t.status === "ReadyToApprove");
  const completedTasks = tasks.filter((t) => t.status === "ApprovedFinal" || t.status === "Approved");

  // ----- Display helpers -----
  const displayStatus = (status?: string) => {
    switch (status) {
      case "Draft":
        return "Not Started";
      case "Approved":
        return "In Progress";
      case "Review":
        return "Ready to Review";
      case "ReadyToApprove":
        return "Ready to Approve";
      case "ApprovedFinal":
        return "Approved";
      default:
        return status || "-";
    }
  };

  const TaskList = ({ tasks, emptyMessage }: { tasks: DbTask[]; emptyMessage: string }) => {
    if (tasks.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
      );
    }
    return (
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card
            key={`${task.projectId}-${task.taskId}`}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="max-w-prose">
                <p className="text-sm text-muted-foreground">
                  Project: {task.projectName}
                </p>
                <p className="font-semibold">
                  Step {task.stepOrder}: {task.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {displayStatus(task.status)}
                </p>
              </div>
              <Link href={`/projects/${task.projectId}`} passHref>
                <Button variant="outline">View Project</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // ---------- Loading / Error ----------
  if (loadingProjects || loadingSops || loadingProjectTasks) {
    return (
      <MainLayout>
        <div className="p-8 text-muted-foreground">Loading projects & tasks…</div>
      </MainLayout>
    );
  }
  if (projectsErr || sopsErr) {
    return (
      <MainLayout>
        <div className="p-8 text-red-600">
          Failed to load data.
          {projectsErr && (
            <div className="text-sm">
              Projects: {(projectsErr as Error).message}
            </div>
          )}
          {sopsErr && (
            <div className="text-sm">SOPs: {(sopsErr as Error).message}</div>
          )}
        </div>
      </MainLayout>
    );
  }

  // ---------- Handler: Save (POST /api/projects) ----------
  const handleSaveProject = async () => {
    const name = (
      document.getElementById("work-name") as HTMLInputElement
    )?.value?.trim();
    const detail = (
      document.getElementById("work-detail") as HTMLTextAreaElement
    )?.value?.trim();
    const startDate =
      (document.getElementById("start-date") as HTMLInputElement)?.value ||
      undefined;

    if (!name) {
      // แจ้งเตือนแบบง่าย ๆ (ถ้าอยากใช้ toast ก็เสียบได้)
      alert("Project name is required");
      return;
    }

    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        description: detail ?? "",
        startDate,
        sop: sopValue && sopValue !== NONE ? sopValue : undefined,
      }),
    });

    await mutate("/api/projects"); // refresh list
    bypassCloseRef.current = true;
    setCreateWorkOpen(false);
  };

  return (
    <MainLayout>
      <div className="flex justify-between items-start gap-4 mb-8 flex-wrap">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-primary">Project Tracker</h1>
          <p className="text-lg text-muted-foreground">
            Create and manage your projects, and track your assigned SOP tasks.
          </p>
        </div>

        {/* Form Dialog */}
        <Dialog open={isCreateWorkOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <PlusCircle className="w-4 h-4" /> Create Project
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[900px]">
            <DialogHeader>
              <DialogTitle>Create New Project Item</DialogTitle>
              <DialogDescription>
                Define a new Project item and link it to an existing SOP for
                guidance.
              </DialogDescription>
            </DialogHeader>

            {/* 2 columns: left form / right guideline */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Left: form */}
              <div className="space-y-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="work-name" className="text-right">
                    Project Name
                  </Label>
                  <Input
                    id="work-name"
                    placeholder="e.g., Q3 Marketing Campaign"
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="work-detail" className="text-right">
                    Project Detail
                  </Label>
                  <Textarea
                    id="work-detail"
                    placeholder="Describe the goals and context of this work."
                    className="col-span-3 min-h-28"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="start-date" className="text-right">
                    Start Date
                  </Label>
                  <Input id="start-date" type="date" className="col-span-3" />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sop-select" className="text-right">
                    Relevant SOP{" "}
                    <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Select value={sopValue} onValueChange={handleSopSelect}>
                    <SelectTrigger id="sop-select" className="col-span-3">
                      <SelectValue placeholder="Select a relevant SOP (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>- NONE -</SelectItem>
                      {(sops ?? []).map((sop) => (
                        <SelectItem key={sop.id} value={sop.id}>
                          {sop.title} ({sop.id})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end pt-2">
                  <Button onClick={handleSaveProject}>Save</Button>
                </div>
              </div>

              {/* Right: guideline (render เฉพาะตอนมี SOP) */}
              {selectedSop && (
                <div className="hidden md:block">
                  <div className="h-full flex flex-col">
                    <h4 className="font-semibold text-lg">
                      SOP Guideline: {selectedSop.title}
                    </h4>
                    <Separator className="my-3" />
                    <div className="min-h-[320px] max-h-[520px] overflow-y-auto pr-3">
                      <SopTimeline steps={selectedSop.steps} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Warning Dialog (ยืนยันก่อนปิด) */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You are about to close this form. Any unsaved changes will be
              lost. Do you really want to close?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmClose(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirmClose}>
              Yes, Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="w-4 h-4" /> Project List
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <Briefcase className="w-4 h-4" /> My Tasks
          </TabsTrigger>
          <TabsTrigger value="Kanban" className="gap-2">
            <Bug className="w-4 h-4" /> Kanban
          </TabsTrigger>
        </TabsList>

        {/* ----- Projects Tab ----- */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>Project List</CardTitle>
              <CardDescription>
                All the work items and projects you have created.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(projects ?? []).map((project) => {
                const slug = (project as any)?.projectId || (project as any)?.id || (project as any)?.key || "";
                return (
                <Card key={slug} className="flex flex-col">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center text-xl">
                      {project.name}
                      <Badge
                        variant={
                          project.status === "Completed" ? "default" : "secondary"
                        }
                      >
                        {project.status}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      Relevant SOP:{" "}
                      {(sops ?? []).find((s) => s.id === project.sop)?.title ??
                        "—"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto">
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                    <div className="flex items-center justify-between pt-4">
                      {/* ใช้ projectId จาก API */}
                      <Link href={`/projects/${slug}`} passHref>
                        <Button variant="link" className="px-0">
                          View Project Details &rarr;
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="Delete project"
                        className="text-muted-foreground hover:text-red-600 hover:bg-red-50"
                        onClick={() => setProjectToDelete({ projectId: String(slug), name: project.name })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )})}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- My Tasks Tab ----- */}
        <TabsContent value="tasks">
          <Tabs defaultValue="review" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="onprocess" className="gap-2">
                <Briefcase className="w-4 h-4" /> On-Process ({onProcessTasks.length})
              </TabsTrigger>
              <TabsTrigger value="review" className="gap-2">
                <Clock className="w-4 h-4" /> To Review ({toReviewTasks.length})
              </TabsTrigger>
              <TabsTrigger value="approve" className="gap-2">
                <Check className="w-4 h-4" /> To Approve ({toApproveTasks.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <Check className="w-4 h-4" /> Completed ({completedTasks.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="onprocess">
              <TaskList
                tasks={onProcessTasks}
                emptyMessage="No in-progress tasks."
              />
            </TabsContent>
            <TabsContent value="review">
              <TaskList
                tasks={toReviewTasks}
                emptyMessage="You have no steps to review."
              />
            </TabsContent>
            <TabsContent value="approve">
              <TaskList
                tasks={toApproveTasks}
                emptyMessage="You have no steps to approve."
              />
            </TabsContent>
            <TabsContent value="completed">
              <TaskList
                tasks={completedTasks}
                emptyMessage="You have not completed any steps yet."
              />
            </TabsContent>
          </Tabs>
        </TabsContent>

        <TabsContent value="Kanban">
          <TimelineDndBoard />
        </TabsContent>
      </Tabs>

      {/* Delete Project Confirm */}
      <AlertDialog open={!!projectToDelete} onOpenChange={(o) => { if (!o) setProjectToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {projectToDelete?.name ? (
                <>Project "{projectToDelete.name}" and its data will be removed permanently.</>
              ) : (
                <>This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteProject}>
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
