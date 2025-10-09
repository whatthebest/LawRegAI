"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Activity, ArrowRight, BarChart3, CheckCircle2, FileText, FolderKanban, Image as ImageIcon, MousePointer2, Palette, PenTool, ShieldCheck, Sparkles, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SOP } from "@/lib/types";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return r.json();
});

const normalizeEmail = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.normalize("NFC").trim().toLowerCase();
  return trimmed.length ? trimmed : undefined;
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
};

export default function HomePage() {
  const { user } = useAuth();
  const isManager = user?.systemRole === "Manager";
  const isRegTechTeam = user?.systemRole === "RegTechTeam";

  const { data: projectsData, error: projectsError, isLoading: projectsLoading } = useSWR("/api/projects", fetcher);
  const { data: sopsData, error: sopsError, isLoading: sopsLoading } = useSWR("/api/sops", fetcher);
  const { data: usersData } = useSWR(isManager ? "/api/users" : null, fetcher);

  // Normalize arrays to avoid undefined during initial render
  const projects = Array.isArray(projectsData) ? projectsData : [];
  const sops = Array.isArray(sopsData) ? sopsData : [];

  const userEmailKey = normalizeEmail(user?.email);
  const userDirectory = useMemo(() => {
    if (!Array.isArray(usersData)) return {} as Record<string, { managerEmail?: string; managerName?: string }>;
    const map: Record<string, { managerEmail?: string; managerName?: string }> = {};
    for (const entry of usersData as any[]) {
      const emailKey = normalizeEmail((entry as any)?.email ?? (entry as any)?.Email);
      if (!emailKey) continue;
      const managerEmail = normalizeEmail((entry as any)?.managerEmail ?? (entry as any)?.manager_email);
      const managerName = typeof (entry as any)?.managerName === 'string' ? (entry as any).managerName : undefined;
      map[emailKey] = { managerEmail, managerName };
    }
    return map;
  }, [usersData]);

  // Build My Action Items from DB tasks of Active projects
  const activeProjects = useMemo(() => (
    (projects || []).filter((p: any) => p.status === "Active")
  ), [projects]);

  const { data: flatTasks } = useSWR<DbTask[]>(
    activeProjects && activeProjects.length > 0
      ? ["home-projectTasks", activeProjects.map((p: any) => p?.projectId || p?.id || p?.key || "").join(",")]
      : null,
    async () => {
      const list = await Promise.all(
        activeProjects.map(async (p: any) => {
          const pid = p?.projectId || p?.id || p?.key;
          if (!pid) return [] as DbTask[];
          try {
            const r = await fetch(`/api/projects/${pid}/tasks`, { cache: "no-store" });
            if (!r.ok) return [] as DbTask[];
            const arr = (await r.json()) as any[];
            return arr.map((t) => ({ ...t, projectId: pid, projectName: p.name })) as DbTask[];
          } catch {
            return [] as DbTask[];
          }
        })
      );
      return list.flat();
    }
  );

  const { toReviewTasks, toApproveTasks, projectsInProgress, sopsInReview } = useMemo(() => {
    const allSopsInReview: SOP[] = (sops || []).filter((s: SOP) => s.status === "In Review");

    const relevantSops = allSopsInReview.filter((sop) => {
      if (isRegTechTeam) return true;

      if (!userEmailKey) return false;

      const managerEmail = normalizeEmail(sop.managerEmail);
      const submitterEmail = normalizeEmail(sop.submittedByEmail);
      const responsibleEmail = normalizeEmail(sop.responsiblePerson);
      const ownerEmail = normalizeEmail(sop.owner);

      const participantEmails = [managerEmail, submitterEmail, responsibleEmail, ownerEmail].filter(Boolean) as string[];
      if (participantEmails.includes(userEmailKey)) {
        return true;
      }

      if (isManager) {
        if (submitterEmail) {
          const derivedManager = userDirectory[submitterEmail]?.managerEmail;
          if (derivedManager && derivedManager === userEmailKey) {
            return true;
          }
        }
      }

      return false;
    });

    const projectsInProgress = (projects || []).filter((p: any) => (
      p.status === "Active" || p.status === "In Progress"
    ));

    const mine = (flatTasks || []).filter((t) => t.reviewer === user?.email || t.approver === user?.email);
    const toReviewTasks = mine.filter((t) => t.reviewer === user?.email && t.status === "Review");
    const toApproveTasks = mine.filter((t) => t.approver === user?.email && t.status === "ReadyToApprove");

    return { toReviewTasks, toApproveTasks, projectsInProgress, sopsInReview: relevantSops };
  }, [user, userEmailKey, projects, sops, flatTasks, isManager, isRegTechTeam, userDirectory]);
  const summaryStats = [
    {
      label: "Projects In Progress",
      value: projectsInProgress.length,
      icon: FolderKanban,
      subtext: "Active work items",
      accent: "from-sky-500 via-sky-400 to-blue-500",
    },
    {
      label: "SOPs In Review",
      value: sopsInReview.length,
      icon: FileText,
      subtext: "Pending manager approval",
      accent: "from-violet-500 via-purple-400 to-fuchsia-500",
    },
    {
      label: "Tasks to Review",
      value: toReviewTasks.length,
      icon: CheckCircle2,
      subtext: "Steps waiting for your review",
      accent: "from-emerald-500 via-teal-400 to-green-500",
    },
    {
      label: "Tasks to Approve",
      value: toApproveTasks.length,
      icon: ShieldCheck,
      subtext: "Steps waiting for your approval",
      accent: "from-amber-500 via-orange-400 to-yellow-500",
    },
  ];

  const uiComponentHighlights = [
    {
      icon: Sparkles,
      title: "shadcn/ui",
      description: "High-quality, accessible components built on Radix UI.",
      accent: "text-sky-500",
    },
    {
      icon: PenTool,
      title: "Lucide React",
      description: "Beautiful & consistent icon library for any workflow.",
      accent: "text-indigo-500",
    },
    {
      icon: Activity,
      title: "Framer Motion",
      description: "Production-ready motion and animation primitives.",
      accent: "text-emerald-500",
    },
    {
      icon: Palette,
      title: "Next Themes",
      description: "Dark mode orchestration in just a few lines of code.",
      accent: "text-purple-500",
    },
  ];

  const advancedUiHighlights = [
    {
      icon: Table,
      title: "TanStack Table",
      description: "Headless building blocks for powerful data grids.",
      accent: "text-sky-500",
    },
    {
      icon: MousePointer2,
      title: "DND Kit",
      description: "Modern drag-and-drop engine for React interfaces.",
      accent: "text-amber-500",
    },
    {
      icon: BarChart3,
      title: "Recharts",
      description: "Composable charting, powered by React and D3.",
      accent: "text-fuchsia-500",
    },
    {
      icon: ImageIcon,
      title: "Sharp",
      description: "High performance image pipelines for crisp previews.",
      accent: "text-rose-500",
    },
  ];

  if (projectsLoading || sopsLoading) {
    return (
      <MainLayout>
        <div className="py-24 text-center text-muted-foreground">Loading your dashboard…</div>
      </MainLayout>
    );
  }

  if (projectsError || sopsError) {
    return (
      <MainLayout>
        <div className="py-24 text-center text-destructive">
          Failed to load data. Please try again or contact support.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <section className="relative overflow-hidden rounded-3xl border border-white/60 bg-gradient-to-br from-sky-50 via-white to-indigo-100 p-8 shadow-2xl">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
        <div className="absolute -bottom-20 -right-24 h-72 w-72 rounded-full bg-purple-200/40 blur-3xl" />
        <div className="relative flex flex-col gap-8">
          <div className="space-y-4 text-center sm:text-left">
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl lg:text-5xl">
              Welcome, {user?.name ?? "there"}!
            </h1>
            <p className="max-w-2xl text-sm text-slate-600 md:text-base">
              Here's your personal command center. Track SOP lifecycles, orchestrate reviews, and deliver consistent compliance with confidence.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {summaryStats.map((stat) => {
              const StatIcon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="group relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 p-6 shadow-lg backdrop-blur transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl"
                >
                  <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${stat.accent}`} />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{stat.label}</p>
                      <div className="mt-3 text-3xl font-semibold text-slate-900">{stat.value}</div>
                      <p className="mt-1 text-xs text-slate-500">{stat.subtext}</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-white to-slate-100 text-slate-700 shadow-inner">
                      <StatIcon className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-10">
        <Card className="lg:col-span-2 border border-white/60 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
            <CardDescription>A list of your recent projects.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
          {projects.slice(0, 4).map((project: any, index: number) => {
            const slug = project?.projectId || project?.id || project?.key || String(index);
            return (
            <Card key={`${slug}-${index}`} className="border border-slate-200/70 bg-white/80 shadow-md backdrop-blur-sm transition-shadow hover:shadow-xl">
              <CardHeader>
                <CardTitle className="flex justify-between items-center text-lg">
                  {project.name}
                  <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'} className="rounded-full border-none bg-slate-900/10 text-slate-700 backdrop-blur" >
                    {project.status}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {sops.find((s: SOP) => s.id === project.sop)?.title}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2 h-10">
                  {project.description}
                </p>
              </CardContent>
              <CardFooter>
                <Link href={`/projects/${slug}`} passHref>
                  <Button variant="outline" size="sm" className="w-full rounded-full border-none bg-gradient-to-r from-sky-500/10 to-indigo-500/10 text-sky-700 hover:from-sky-500/20 hover:to-indigo-500/20">View Project</Button>
                </Link>
              </CardFooter>
            </Card>
          )})}
          </CardContent>
           <CardFooter>
              <Link href="/tasks" passHref className="w-full">
                <Button variant="ghost" className="w-full gap-2 rounded-full border border-transparent bg-white/70 text-slate-700 hover:bg-white">
                    View All Projects <ArrowRight className="w-4 h-4" />
                </Button>
            </Link>
           </CardFooter>
        </Card>

        <Card className="border border-white/60 bg-white/90 shadow-xl backdrop-blur">
            <CardHeader>
                <CardTitle>My Action Items</CardTitle>
                <CardDescription>SOP steps assigned to you for review or approval.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-semibold mb-2">To Review ({toReviewTasks.length})</h4>
                 {toReviewTasks.length > 0 ? (
                  <div className="space-y-2">
                    {toReviewTasks.slice(0, 2).map((task: any) => (
                      <Link href={`/projects/${task.projectId}`} key={`${task.projectId}-${task.taskId}`} className="block">
                        <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                            <p className="text-xs text-muted-foreground">{task.projectName}</p>
                            <p className="font-medium text-sm truncate">Step {task.stepOrder}: {task.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No items to review.</p>
                )}
              </div>
               <div>
                <h4 className="text-sm font-semibold mb-2">To Approve ({toApproveTasks.length})</h4>
                 {toApproveTasks.length > 0 ? (
                  <div className="space-y-2">
                    {toApproveTasks.slice(0, 2).map((task: any) => (
                      <Link href={`/projects/${task.projectId}`} key={`${task.projectId}-${task.taskId}`} className="block">
                         <div className="rounded-2xl border border-slate-200/60 bg-white/70 p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                           <p className="text-xs text-muted-foreground">{task.projectName}</p>
                           <p className="font-medium text-sm truncate">Step {task.stepOrder}: {task.title}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No items to approve.</p>
                )}
              </div>
            </CardContent>
            <CardFooter>
              {/* <Link href="/tasks" passHref className="w-full">
                <Button variant="ghost" className="w-full gap-2 rounded-full border border-transparent bg-white/70 text-slate-700 hover:bg-white">
                    Go to Work Tracker <ArrowRight className="w-4 h-4" />
                </Button>
              </Link> */}
            </CardFooter>
        </Card>
      </div>

    </MainLayout>
  );
}




