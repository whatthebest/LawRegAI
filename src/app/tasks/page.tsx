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
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  PlusCircle,
  FolderKanban,
  Briefcase,
  Bug,
  Sparkles,
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

/** shape เธ—เธตเน API /api/projects เธชเนเธเธเธฅเธฑเธ (เธชเธญเธ”เธเธฅเนเธญเธเนเธเนเธ” route.ts เธ—เธตเนเธเธธเธขเนเธงเน) */
type ProjectRow = {
  key?: string;
  projectId: string; // เน€เธเนเธ project-001
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

type ProjectStat = {
  label: string;
  value: string;
  subtext: string;
  accent: string;
  icon: LucideIcon;
};

export default function TasksPage() {
  const { user } = useAuth();

  // ---------- เธ”เธถเธเธเธฒเธ Backend ----------
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

  // sentinel non-empty เธชเธณเธซเธฃเธฑเธ Radix
  const NONE = "__NONE__";
  const [sopValue, setSopValue] = useState<string | undefined>(undefined);

  // เธเธฑเธเน€เธ”เนเธ Warning เธ•เธญเธเธเธ” Save
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

  // Load full SOP detail when a value is selected, so steps are normalized even if stored as an object in DB
  const { data: selectedSopFull } = useSWR<SOP>(
    sopValue && sopValue !== NONE ? `/api/sops/${sopValue}` : null,
    fetcher
  );

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

  // Normalize groups to be mutually exclusive
  const onProcessTasks = tasks.filter(
    (t) => t.status === "Approved" || t.status === "In Progress"
  );
  const toReviewTasks = tasks.filter(
    (t) => t.reviewer === user?.email && t.status === "Review"
  );
  const toApproveTasks = tasks.filter(
    (t) => t.approver === user?.email && t.status === "ReadyToApprove"
  );
  // Completed should only include final approval, not in-progress
  const completedTasks = tasks.filter((t) => t.status === "ApprovedFinal");

  const totalProjects = projects?.length ?? 0;
  const activeProjectCount = projects
    ? projects.filter((p) => p.status === "Active").length
    : 0;
  const completedProjectCount = projects
    ? projects.filter((p) => p.status === "Completed").length
    : 0;
  const onHoldProjectCount = projects
    ? projects.filter((p) => p.status === "OnHold").length
    : 0;
  const myTaskCount = tasks.length;
  const attentionCount = toReviewTasks.length + toApproveTasks.length;

  const projectStats = useMemo<ProjectStat[]>(() => {
    const nf = new Intl.NumberFormat();
    return [
      {
        label: "Project Portfolio",
        value: nf.format(totalProjects),
        subtext: "Projects tracked across teams.",
        accent: "from-sky-400 via-blue-400 to-indigo-500",
        icon: FolderKanban,
      },
      {
        label: "Active Projects",
        value: nf.format(activeProjectCount),
        subtext: `${nf.format(onHoldProjectCount)} on hold`,
        accent: "from-emerald-400 via-teal-400 to-cyan-500",
        icon: Briefcase,
      },
      {
        label: "Completed Projects",
        value: nf.format(completedProjectCount),
        subtext: "Marked as finished by owners.",
        accent: "from-violet-400 via-purple-400 to-fuchsia-500",
        icon: CheckCircle2,
      },
      {
        label: "My Assigned Tasks",
        value: nf.format(myTaskCount),
        subtext: `${nf.format(attentionCount)} need attention`,
        accent: "from-amber-400 via-orange-400 to-rose-500",
        icon: BarChart3,
      },
    ];
  }, [
    totalProjects,
    activeProjectCount,
    onHoldProjectCount,
    completedProjectCount,
    myTaskCount,
    attentionCount,
  ]);

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
            className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-md backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400" />
            <CardContent className="relative z-10 flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                  <span>Project</span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="truncate">{task.projectName}</span>
                </div>
                <p className="break-words text-lg font-semibold text-slate-900">
                  Step {task.stepOrder}: {task.title}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Badge className="rounded-full border-none bg-sky-500/10 text-sky-700 backdrop-blur">
                    {displayStatus(task.status)}
                  </Badge>
                  {task.sopId && (
                    <span className="text-xs text-slate-400">
                      SOP: {task.sopId}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-none bg-gradient-to-r from-sky-500/15 to-indigo-500/15 px-5 text-sky-700 hover:from-sky-500/25 hover:to-indigo-500/25"
                  asChild
                >
                  <Link href={`/projects/${task.projectId}`}>
                    View Project
                  </Link>
                </Button>
              </div>
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
        <div className="p-8 text-muted-foreground">Loading projects & tasks</div>
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
      // เนเธเนเธเน€เธ•เธทเธญเธเนเธเธเธเนเธฒเธข เน (เธ–เนเธฒเธญเธขเธฒเธเนเธเน toast เธเนเน€เธชเธตเธขเธเนเธ”เน)
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
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-sky-50 via-white to-indigo-100 p-8 shadow-2xl">
          <div className="pointer-events-none absolute -top-24 -left-28 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-28 h-80 w-80 rounded-full bg-purple-200/40 blur-[140px]" />
          <div className="relative flex flex-col gap-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-xs font-medium uppercase tracking-[0.28em] text-slate-500 backdrop-blur">
                  Project Hub
                </div>
                <h1 className="text-4xl font-bold text-slate-900">Project Tracker</h1>
                <p className="max-w-2xl text-base text-slate-600">
                  Create and manage your projects, align them to SOPs, and keep an eye on every action item in one place.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full gap-2 rounded-full border border-transparent bg-white/80 px-5 text-slate-700 shadow-sm transition hover:bg-white sm:w-auto"
                >
                  <Link href="/sops" className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Browse SOP Library
                  </Link>
                </Button>
                <Dialog open={isCreateWorkOpen} onOpenChange={handleDialogChange}>
                  <DialogTrigger asChild>
                    <Button className="w-full gap-2 rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-500/90 hover:via-blue-500/90 hover:to-indigo-500/90 sm:w-auto">
                      <PlusCircle className="h-4 w-4" />
                      Create Project
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[900px] max-h-none overflow-visible rounded-3xl border border-white/70 bg-white/90 shadow-xl backdrop-blur no-scrollbar">
                    <DialogHeader>
                      <DialogTitle>Create New Project</DialogTitle>
                      <DialogDescription>
                        Define a new project and link it to an existing SOP for guidance.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 md:grid-cols-2">
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
                          <Button onClick={handleSaveProject} className="rounded-full px-6">
                            Save Project
                          </Button>
                        </div>
                      </div>
                      {(selectedSop || selectedSopFull) && (
                        <div className="hidden md:block">
                          <div className="flex h-full flex-col rounded-2xl border border-slate-100/60 bg-white/80 p-4 shadow-inner">
                            <h4 className="text-lg font-semibold text-slate-800">
                              SOP Guideline: {(selectedSopFull ?? selectedSop)?.title}
                            </h4>
                            <Separator className="my-3" />
                            <div className="pr-3">
                              <SopTimeline steps={(selectedSopFull ?? selectedSop)?.steps ?? []} />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {projectStats.map((stat) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`} />
                    <div className="relative flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{stat.label}</p>
                        <div className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</div>
                        <p className="mt-1 text-xs text-slate-500">{stat.subtext}</p>
                      </div>
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-100 text-slate-700 shadow-inner transition group-hover:scale-105">
                        <StatIcon className="h-5 w-5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/30 p-6 shadow-[0_35px_70px_rgba(15,23,42,0.12)]">
          <div className="pointer-events-none absolute -top-32 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -right-24 h-80 w-80 rounded-full bg-indigo-200/35 blur-[140px]" />
          <div className="relative space-y-6">
            <Tabs defaultValue="projects" className="w-full space-y-6">
              <TabsList className="grid w-full gap-2 rounded-2xl border border-white/70 bg-white/80 p-1 backdrop-blur md:grid-cols-3">
                <TabsTrigger
                  value="projects"
                  className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500/15 data-[state=active]:to-indigo-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                >
                  <FolderKanban className="h-4 w-4" />
                  Project List
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/15 data-[state=active]:to-teal-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                >
                  <Briefcase className="h-4 w-4" />
                  My Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="Kanban"
                  className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/15 data-[state=active]:to-orange-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                >
                  <Bug className="h-4 w-4" />
                  Kanban
                </TabsTrigger>
              </TabsList>

              <TabsContent value="projects">
                <Card className="rounded-3xl border border-white/70 bg-white/90 shadow-xl backdrop-blur">
                  <CardHeader className="flex flex-col gap-2">
                    <CardTitle>Project List</CardTitle>
                    <CardDescription>
                      All the work items and projects you have created.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                    {(projects ?? []).length > 0 ? (
                      (projects ?? []).map((project) => {
                        const slug =
                          (project as any)?.projectId ||
                          (project as any)?.id ||
                          (project as any)?.key ||
                          "";
                        if (!slug) return null;
                        return (
                          <Card
                            key={slug}
                            className="relative flex flex-col overflow-hidden rounded-2xl border border-slate-100/80 bg-white/90 shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl"
                          >
                            <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-300 via-blue-300 to-indigo-400" />
                            <CardHeader className="relative z-10 pb-4">
                              <CardTitle className="flex items-center justify-between gap-3 text-lg font-semibold text-slate-900">
                                <span className="truncate">{project.name}</span>
                                <Badge className="rounded-full border-none bg-slate-900/10 text-slate-700 backdrop-blur">
                                  {project.status}
                                </Badge>
                              </CardTitle>
                              <CardDescription className="text-sm text-slate-500">
                                Relevant SOP:{" "}
                                {(sops ?? []).find((s) => s.id === project.sop)?.title ?? "—"}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="relative z-10 mt-auto space-y-4">
                              <p className="text-sm text-muted-foreground line-clamp-3 min-h-[3.5rem]">
                                {project.description?.trim()
                                  ? project.description
                                  : "No description provided."}
                              </p>
                              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                                <div>
                                  <span className="font-medium text-slate-600">Created:</span>{" "}
                                  {project.startDate ?? "—"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="rounded-full border-none bg-gradient-to-r from-sky-500/15 to-indigo-500/15 px-4 text-sky-700 hover:from-sky-500/25 hover:to-indigo-500/25"
                                    asChild
                                  >
                                    <Link href={`/projects/${slug}`}>
                                      View Details
                                    </Link>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="Delete project"
                                    className="rounded-full bg-red-500/10 text-red-500 transition hover:bg-red-500/20"
                                    onClick={() =>
                                      setProjectToDelete({ projectId: String(slug), name: project.name })
                                    }
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200/70 bg-white/70 py-16 text-center text-slate-500">
                        <p className="text-lg font-semibold text-slate-600">No projects yet</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Create your first project to start tracking progress.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="tasks">
                <Card className="rounded-3xl border border-white/70 bg-white/90 shadow-xl backdrop-blur">
                  <CardHeader className="flex flex-col gap-2">
                    <CardTitle>My Action Items</CardTitle>
                    <CardDescription>
                      Steps assigned to you across all active projects.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="review" className="w-full space-y-6">
                      <TabsList className="grid w-full gap-2 rounded-2xl border border-slate-100/80 bg-white/80 p-1 backdrop-blur sm:grid-cols-2 lg:grid-cols-4">
                        <TabsTrigger
                          value="onprocess"
                          className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-sky-500/15 data-[state=active]:to-indigo-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                        >
                          <Briefcase className="h-4 w-4" />
                          On-Process ({onProcessTasks.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="review"
                          className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/15 data-[state=active]:to-teal-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                        >
                          <Clock className="h-4 w-4" />
                          To Review ({toReviewTasks.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="approve"
                          className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/15 data-[state=active]:to-orange-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                        >
                          <Check className="h-4 w-4" />
                          To Approve ({toApproveTasks.length})
                        </TabsTrigger>
                        <TabsTrigger
                          value="completed"
                          className="gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 transition data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500/15 data-[state=active]:to-fuchsia-500/15 data-[state=active]:text-slate-900 data-[state=active]:shadow"
                        >
                          <Check className="h-4 w-4" />
                          Completed ({completedTasks.length})
                        </TabsTrigger>
                      </TabsList>
                      <TabsContent value="onprocess">
                        <TaskList tasks={onProcessTasks} emptyMessage="No in-progress tasks." />
                      </TabsContent>
                      <TabsContent value="review">
                        <TaskList tasks={toReviewTasks} emptyMessage="You have no steps to review." />
                      </TabsContent>
                      <TabsContent value="approve">
                        <TaskList tasks={toApproveTasks} emptyMessage="You have no steps to approve." />
                      </TabsContent>
                      <TabsContent value="completed">
                        <TaskList tasks={completedTasks} emptyMessage="You have not completed any steps yet." />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="Kanban">
                <Card className="rounded-3xl border border-white/70 bg-white/90 shadow-xl backdrop-blur">
                  <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center text-muted-foreground">
                    <Bug className="h-6 w-6 text-slate-400" />
                    <p>Kanban view coming soon.</p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>

      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl border border-white/70 bg-white/95 shadow-xl backdrop-blur">
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You are about to close this form. Any unsaved changes will be lost. Do you really want to close?
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

      <AlertDialog
        open={!!projectToDelete}
        onOpenChange={(open) => {
          if (!open) setProjectToDelete(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl border border-white/70 bg-white/95 shadow-xl backdrop-blur">
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
            <AlertDialogCancel className="rounded-full px-6">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive px-6 text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteProject}
            >
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}

