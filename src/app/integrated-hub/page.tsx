"use client";

import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Brain,
  ClipboardList,
  GraduationCap,
  BarChart3,
  BookOpen,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type HubFeature = {
  title: string;
  description: string;
  badge: string;
  badgeClass: string;
  accent: string;
  icon: LucideIcon;
  href: string;
  comingSoon?: boolean;
  comingSoonClass?: string;
};

const features: HubFeature[] = [
  {
    title: "Smart Assistance",
    description:
      "AI-powered regulatory change pipeline for intake, impact assessment, and GRC export.",
    badge: "AI-Powered",
    badgeClass: "bg-slate-900/5 text-slate-900",
    accent: "from-sky-400 via-indigo-500 to-purple-500",
    icon: Brain,
    href: "#",
    comingSoon: true,
    comingSoonClass: "absolute right-[-1] -top-[-190] text-[5px] px-2 py-[20px] leading-none rounded-full whitespace-nowrap",
  },
  {
    title: "Smart Tracker",
    description:
      "Centralized work management with regulatory calendar, SLA tracking, and monitoring.",
    badge: "Core",
    badgeClass: "bg-sky-100 text-sky-700",
    accent: "from-sky-500 via-cyan-500 to-indigo-500",
    icon: ClipboardList,
    href: "#",
    comingSoon: true,
    comingSoonClass: "absolute right-[-1] -top-[-190] text-[5px] px-2 py-[20px] leading-none rounded-full whitespace-nowrap",
  },
  {
    title: "Training Hub",
    description:
      "Compliance learning programs with LMS integration, certification tracking, and skill insights.",
    badge: "Learning",
    badgeClass: "bg-indigo-100 text-indigo-700",
    accent: "from-indigo-500 via-blue-500 to-sky-500",
    icon: GraduationCap,
    href: "#",
    comingSoon: true,
    comingSoonClass: "absolute right-[-1] -top-[-190] text-[5px] px-2 py-[20px] leading-none rounded-full whitespace-nowrap",
  },
  {
    title: "Excellence Hub",
    description:
      "Executive dashboards with KRIs, compliance heatmaps, and performance analytics.",
    badge: "Analytics",
    badgeClass: "bg-emerald-100 text-emerald-700",
    accent: "from-emerald-400 via-teal-500 to-sky-500",
    icon: BarChart3,
    href: "#",
    comingSoon: true,
    comingSoonClass: "absolute right-[-1] -top-[-190] text-[5px] px-2 py-[20px] leading-none rounded-full whitespace-nowrap",
  },
  {
    title: "Knowledgebase",
    description:
      "Central repository for regulations, policies, procedures, and compliance documentation.",
    badge: "Repository",
    badgeClass: "bg-slate-200 text-slate-700",
    accent: "from-slate-400 via-slate-500 to-indigo-500",
    icon: BookOpen,
    href: "#",
    comingSoon: true,
    comingSoonClass: "absolute right-[-1] -top-[-190] text-[5px] px-2 py-[20px] leading-none rounded-full whitespace-nowrap",
  },
  {
    title: "Network & Community",
    description:
      "Collaboration tools, expert networks, and knowledge sharing forums for compliance teams.",
    badge: "Collaboration",
    badgeClass: "bg-amber-100 text-amber-700",
    accent: "from-amber-400 via-orange-500 to-pink-500",
    icon: Users,
    href: "#",
    comingSoon: true,
    comingSoonClass: "absolute right-[-1] -top-[-190] text-[5px] px-2 py-[20px] leading-none rounded-full whitespace-nowrap",
  },
];

export default function IntegratedHubPage() {
  return (
    <MainLayout>
      <div className="space-y-10">
        <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-8 shadow-2xl">
          <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[2fr_1fr]">
            <div className="space-y-5">
              <Badge
                variant="outline"
                className="rounded-full border-slate-200/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
              >
                Integrated Workspace
              </Badge>
              <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
                Integrated Hub
              </h1>
              <p className="text-base text-slate-600 md:text-lg">
                Discover a smart operating layer that unifies projects, learning, analytics,
                and collaboration. Each module is designed to accelerate regulatory readiness
                and knowledge sharing across your organization.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="rounded-2xl border-white/70 bg-white/80 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-slate-800">
                      Work smarter together
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600">
                    Launch AI playbooks, monitor compliance initiatives, and close feedback loops in one canvas.
                  </CardContent>
                </Card>
                <Card className="rounded-2xl border-white/70 bg-white/80 backdrop-blur">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-slate-800">
                      Tailored for compliance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-slate-600">
                    Governance policies, training, and analytics align with regulatory teams and senior leadership.
                  </CardContent>
                </Card>
              </div>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Button asChild className="rounded-full px-6">
                  <Link href="/sops">Launch SOPs Workflow</Link>
                </Button>
                <Button asChild variant="ghost" className="rounded-full px-6 text-slate-700">
                  <Link href="/tasks">View Project Tracker</Link>
                </Button>
              </div>
            </div>
            <Card className="relative overflow-hidden rounded-3xl border-white/70 bg-white/85 shadow-xl backdrop-blur">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-100/60 via-white/30 to-indigo-100/60" />
              <CardHeader className="relative z-10 pb-4">
                <CardTitle className="text-lg text-slate-800">Hub Highlights</CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  Consolidated insights from the connected modules.
                </CardDescription>
              </CardHeader>
              <CardContent className="relative z-10 space-y-4 text-sm text-slate-600">
                <div className="flex items-start gap-3 rounded-2xl border border-sky-100 bg-white/80 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <Brain className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">AI Augmentation</p>
                    <p>Automated summaries shrink review time by 45% across recent deployments.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Real-time Oversight</p>
                    <p>Live dashboards highlight priority initiatives and compliance gaps.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">Community Insights</p>
                    <p>Shared playbooks and best practices keep teams aligned and informed.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold text-slate-900">Explore the modules</h2>
            <p className="text-base text-slate-600">
              Each workspace unlocks capabilities aligned to regulatory execution, talent readiness,
              or collaborative intelligence.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="relative">
                <Card className="relative h-full overflow-hidden rounded-3xl border border-white/70 bg-white/90 shadow-xl transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl">
                  {feature.comingSoon && (
                    <div
                      className={cn(
                        "absolute z-20",
                        feature.comingSoonClass ?? "right-4 top-4"
                      )}
                    >
                      <Badge className="rounded-full bg-rose-500 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                        Coming Soon
                      </Badge>
                    </div>
                  )}
                  <div
                    className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.accent}`}
                  />
                  <CardHeader className="space-y-4 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <feature.icon className="h-6 w-6" />
                      </div>
                      <Badge
                        variant="outline"
                        className={`rounded-full border-transparent px-3 py-1 text-xs font-semibold ${feature.badgeClass}`}
                      >
                        {feature.badge}
                      </Badge>
                    </div>
                    <div>
                      <CardTitle className="text-xl text-slate-900">{feature.title}</CardTitle>
                      <CardDescription className="pt-2 text-sm text-slate-600">
                        {feature.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardFooter className="mt-auto">
                    <Link
                      href={feature.href}
                      className="group inline-flex items-center gap-2 text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                    >
                      Explore
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        </section>
      </div>
    </MainLayout>
  );
}
