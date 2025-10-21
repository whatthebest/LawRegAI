"use client";

import Link from "next/link";
import MainLayout from "@/components/MainLayout";
import IntegratedWorkspaceHero from "@/components/IntegratedWorkspaceHero";
import { Card, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Brain,
  ClipboardList,
  GraduationCap,
  BarChart3,
  BookOpen,
  FileText,
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
    title: "Summary file BOT (Beta)",
    description:
      "Automated digestion of BOT regulations with summaries, citations, and export-ready drafts.",
    badge: "Beta",
    badgeClass: "bg-amber-100 text-amber-700",
    accent: "from-amber-400 via-orange-500 to-rose-500",
    icon: FileText,
    href: "/summary-bot",
  },
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
    <MainLayout hideSidebar>
      <div className="space-y-10">
        <IntegratedWorkspaceHero />

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
