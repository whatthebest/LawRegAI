"use client";

import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import SopWorkflowBuilder from "@/components/SopWorkflowBuilder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Download, GitBranch, Route, Sparkles, UserCheck, Zap } from "lucide-react";

type StepGuide = {
  title: string;
  description: string;
  icon: LucideIcon;
};

const workflowSteps: StepGuide[] = [
  {
    title: "Map the happy path",
    description: "Drop sequence steps to capture the standard flow before adding branches.",
    icon: Route,
  },
  {
    title: "Layer on decisions",
    description: "Switch step types to decision nodes and connect yes / no outcomes.",
    icon: GitBranch,
  },
  {
    title: "Assign accountability",
    description: "Specify SLA, owner, reviewer, and approver so responsibilities stay clear.",
    icon: UserCheck,
  },
  {
    title: "Save & export",
    description: "Use the action tray inside the canvas to export JSON when the map is final.",
    icon: Download,
  },
];

const quickTips = [
  "Drag from the left rail to add steps or drop files on a node to attach reference material.",
  "Hover an edge to relabel decision outcomes or switch arrow styles from the edge menu.",
  "Use the auto-number control to resequence steps after rearranging the layout.",
];

export default function CreateSopWorkflowBetaPage() {
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
                  Beta Canvas
                </div>
                <h1 className="text-4xl font-bold text-slate-900">Create SOP Workflow (Beta)</h1>
                <p className="max-w-2xl text-base text-slate-600">
                  Design an end-to-end SOP journey that mirrors your operations. Visualize every handoff,
                  capture decision logic, and export a reusable workflow ready for automation.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full gap-2 rounded-full border border-transparent bg-white/80 px-5 text-slate-700 shadow-sm transition hover:bg-white sm:w-auto"
                >
                  <Link href="/sops">
                    <ArrowLeft className="h-4 w-4" />
                    Back to SOPs
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full rounded-full bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 px-6 py-5 text-sm font-semibold text-white shadow-lg transition hover:from-sky-500/90 hover:via-blue-500/90 hover:to-indigo-500/90 sm:w-auto"
                >
                  <a href="#workflow-builder" className="flex items-center justify-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Start Building
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-xl backdrop-blur">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-sky-400 via-blue-400 to-indigo-400" />
              <CardHeader className="relative z-10 pb-4">
                <CardTitle>Workflow Checklist</CardTitle>
                <CardDescription>Follow these anchors to get from blank canvas to export.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4">
                {workflowSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.title}
                      className="flex items-start gap-4 rounded-2xl border border-slate-100/80 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                    >
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500/15 to-indigo-500/15 text-sky-700">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-800">
                          {index + 1}. {step.title}
                        </p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-slate-50 via-white to-sky-50/70 shadow-xl">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-100/40 via-white/0 to-indigo-100/30" />
              <CardHeader className="relative z-10 pb-4">
                <CardTitle>Quick Tips</CardTitle>
                <CardDescription>Keep the canvas responsive and readable for stakeholders.</CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-3">
                {quickTips.map((tip) => (
                  <div
                    key={tip}
                    className="flex items-start gap-3 rounded-2xl border border-slate-100/70 bg-white/80 p-4 text-sm text-slate-600 shadow-sm"
                  >
                    <Zap className="mt-1 h-4 w-4 text-sky-500" />
                    <span>{tip}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card
            id="workflow-builder"
            className="relative overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-[0_35px_70px_rgba(15,23,42,0.14)] backdrop-blur"
          >
            <div className="pointer-events-none absolute -top-20 -left-16 h-60 w-60 rounded-full bg-sky-200/40 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full bg-indigo-200/40 blur-[140px]" />
            <CardHeader className="relative z-10 flex flex-col gap-2 pb-4">
              <CardTitle>Workflow Canvas</CardTitle>
              <CardDescription>
                Drag, connect, and configure every SOP step. Use the toolbar on the right for auto-numbering,
                exporting, and layout utilities.
              </CardDescription>
            </CardHeader>
            <CardContent className="relative z-10 space-y-4">
              <div className="rounded-2xl border border-slate-100/70 bg-slate-50/60 p-2 shadow-inner">
                <SopWorkflowBuilder />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </MainLayout>
  );
}
