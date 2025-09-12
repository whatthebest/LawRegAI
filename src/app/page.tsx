"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import MainLayout from "@/components/MainLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { ListChecks, CheckSquare, UserCog, Bot, FolderKanban, Clock, FileCheck2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SOP } from "@/lib/types";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => {
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return r.json();
});

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

  const { data: projectsData, error: projectsError, isLoading: projectsLoading } = useSWR("/api/projects", fetcher);
  const { data: sopsData, error: sopsError, isLoading: sopsLoading } = useSWR("/api/sops", fetcher);

  // Normalize arrays to avoid undefined during initial render
  const projects = Array.isArray(projectsData) ? projectsData : [];
  const sops = Array.isArray(sopsData) ? sopsData : [];

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
    const sopsInReview: SOP[] = (sops || []).filter((s: SOP) => s.status === "In Review");
    const projectsInProgress = (projects || []).filter((p: any) => (
      p.status === "Active" || p.status === "In Progress"
    ));

    const mine = (flatTasks || []).filter((t) => t.reviewer === user?.email || t.approver === user?.email);
    const toReviewTasks = mine.filter((t) => t.reviewer === user?.email && t.status === "Review");
    const toApproveTasks = mine.filter((t) => t.approver === user?.email && t.status === "ReadyToApprove");

    return { toReviewTasks, toApproveTasks, projectsInProgress, sopsInReview };
  }, [user, projects, sops, flatTasks]);

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
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-primary">
          Welcome, {user?.name}!
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Here's your personal dashboard. Track your projects, review tasks, and manage SOPs all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Projects In Progress</CardTitle>
            <FolderKanban className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectsInProgress.length}</div>
            <p className="text-xs text-muted-foreground">Active work items</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SOPs In Review</CardTitle>
            <FileCheck2 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sopsInReview.length}</div>
            <p className="text-xs text-muted-foreground">Pending manager approval</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks to Review</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{toReviewTasks.length}</div>
            <p className="text-xs text-muted-foreground">Steps waiting for your review</p>
          </CardContent>
        </Card>
         <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tasks to Approve</CardTitle>
            <CheckSquare className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{toApproveTasks.length}</div>
            <p className="text-xs text-muted-foreground">Steps waiting for your approval</p>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>My Projects</CardTitle>
            <CardDescription>A list of your recent projects.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
          {projects.slice(0, 4).map((project: any, index: number) => {
            const slug = project?.projectId || project?.id || project?.key || String(index);
            return (
            <Card key={`${slug}-${index}`}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center text-lg">
                  {project.name}
                  <Badge variant={project.status === 'Completed' ? 'default' : 'secondary'}>
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
                  <Button variant="outline" size="sm" className="w-full">View Project</Button>
                </Link>
              </CardFooter>
            </Card>
          )})}
          </CardContent>
           <CardFooter>
              <Link href="/tasks" passHref className="w-full">
                <Button variant="ghost" className="w-full gap-2">
                    View All Projects <ArrowRight className="w-4 h-4" />
                </Button>
            </Link>
           </CardFooter>
        </Card>

        <Card>
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
                        <div className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
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
                         <div className="p-3 border rounded-md hover:bg-muted/50 transition-colors">
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
                <Button variant="ghost" className="w-full gap-2">
                    Go to Work Tracker <ArrowRight className="w-4 h-4" />
                </Button>
              </Link> */}
            </CardFooter>
        </Card>
      </div>

    </MainLayout>
  );
}
