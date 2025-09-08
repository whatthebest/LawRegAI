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
import type { SOP, SOPStep } from "@/lib/types";
import {
  Check,
  Clock,
  PlusCircle,
  FolderKanban,
  Briefcase,
  Bug,
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

interface Task extends SOPStep {
  sopTitle: string;
  sopId: string;
}

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

  // ---------- Tasks derived จาก SOPs ----------
  const tasks = useMemo(() => {
    if (!user || !sops) return [];
    const allTasks: Task[] = [];
    sops.forEach((sop) => {
      sop.steps.forEach((step) => {
        if (
          step.owner === user.email ||
          step.reviewer === user.email ||
          step.approver === user.email
        ) {
          allTasks.push({ ...step, sopTitle: sop.title, sopId: sop.id });
        }
      });
    });
    return allTasks;
  }, [user, sops]);

  const toReviewTasks = tasks.filter(
    (t) => t.reviewer === user?.email && t.status === "Review"
  );
  const toApproveTasks = tasks.filter(
    (t) => t.approver === user?.email && t.status === "Review"
  );
  const completedTasks = tasks.filter(
    (t) =>
      (t.owner === user?.email ||
        t.reviewer === user?.email ||
        t.approver === user?.email) &&
      t.status === "Approved"
  );

  const TaskList = ({
    tasks,
    emptyMessage,
  }: {
    tasks: Task[];
    emptyMessage: string;
  }) => {
    if (tasks.length === 0) {
      return (
        <p className="text-muted-foreground text-center py-8">{emptyMessage}</p>
      );
    }
    return (
      <div className="space-y-4">
        {tasks.map((task) => (
          <Card
            key={`${task.id}-${task.sopId}`}
            className="shadow-sm hover:shadow-md transition-shadow"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="max-w-prose">
                <p className="text-sm text-muted-foreground">
                  SOP: {task.sopTitle}
                </p>
                <p className="font-semibold">
                  Step {task.stepOrder}: {task.title}
                </p>
                <p className="text-sm text-muted-foreground">
                  Status: {task.status}
                </p>
              </div>
              <Link href={`/sops/${task.sopId}`} passHref>
                <Button variant="outline">View SOP</Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // ---------- Loading / Error ----------
  if (loadingProjects || loadingSops) {
    return (
      <MainLayout>
        <div className="p-8 text-muted-foreground">Loading projects & SOPs…</div>
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
              {(projects ?? []).map((project) => (
                <Card key={project.projectId}>
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
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {project.description}
                    </p>
                    {/* ใช้ projectId จาก API */}
                    <Link href={`/projects/${project.projectId}`} passHref>
                      <Button variant="link" className="px-0 pt-4">
                        View Project Details &rarr;
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ----- My Tasks Tab ----- */}
        <TabsContent value="tasks">
          <Tabs defaultValue="review" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
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
    </MainLayout>
  );
}