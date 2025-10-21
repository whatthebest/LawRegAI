import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { Brain, BarChart3, Users } from "lucide-react";

type HeroCTA = {
  href: string;
  label: string;
  variant?: "default" | "ghost";
};

type HeroCard = {
  title: string;
  description: string;
};

type HeroHighlight = {
  icon: LucideIcon;
  title: string;
  description: string;
  accent?: {
    container: string;
    icon: string;
  };
};

export type HeroContent = {
  badge: string;
  title: string;
  description: string;
  cards: HeroCard[];
  ctas: HeroCTA[];
  highlights: HeroHighlight[];
  highlightsTitle?: string;
  highlightsDescription?: string;
};

const defaultContent: HeroContent = {
  badge: "Integrated Workspace",
  title: "Integrated Hub",
  description:
    "Discover a smart operating layer that unifies projects, learning, analytics, and collaboration. Each module is designed to accelerate regulatory readiness and knowledge sharing across your organization.",
  cards: [
    {
      title: "Work smarter together",
      description:
        "Launch AI playbooks, monitor compliance initiatives, and close feedback loops in one canvas.",
    },
    {
      title: "Tailored for compliance",
      description:
        "Governance policies, training, and analytics align with regulatory teams and senior leadership.",
    },
  ],
  ctas: [
    { href: "/summary-bot", label: "Launch Summary file BOT (Beta)" },
    { href: "/tasks", label: "View Project Tracker", variant: "ghost" },
  ],
  highlights: [
    {
      icon: Brain,
      title: "AI Augmentation",
      description: "Automated summaries shrink review time by 45% across recent deployments.",
      accent: {
        container: "border-sky-100 bg-white/80",
        icon: "bg-sky-50 text-sky-600",
      },
    },
    {
      icon: BarChart3,
      title: "Real-time Oversight",
      description: "Live dashboards highlight priority initiatives and compliance gaps.",
      accent: {
        container: "border-indigo-100 bg-white/80",
        icon: "bg-indigo-50 text-indigo-600",
      },
    },
    {
      icon: Users,
      title: "Community Insights",
      description: "Shared playbooks and best practices keep teams aligned and informed.",
      accent: {
        container: "border-emerald-100 bg-white/80",
        icon: "bg-emerald-50 text-emerald-600",
      },
    },
  ],
  highlightsTitle: "Hub Highlights",
  highlightsDescription: "Consolidated insights from the connected modules.",
};

type IntegratedWorkspaceHeroProps = {
  content?: HeroContent;
};

export default function IntegratedWorkspaceHero({
  content,
}: IntegratedWorkspaceHeroProps) {
  const data = content ?? defaultContent;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/70 bg-gradient-to-br from-sky-50 via-white to-indigo-50 p-8 shadow-2xl">
      <div className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-purple-200/40 blur-3xl" />
      <div className="relative grid gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-5">
          <Badge
            variant="outline"
            className="rounded-full border-slate-200/60 bg-white/70 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
          >
            {data.badge}
          </Badge>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 md:text-4xl">
            {data.title}
          </h1>
          <p className="text-base text-slate-600 md:text-lg">
            {data.description}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {data.cards.map((card) => (
              <Card key={card.title} className="rounded-2xl border-white/70 bg-white/80 backdrop-blur">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-slate-800">{card.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-slate-600">{card.description}</CardContent>
              </Card>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {data.ctas.map((cta) => (
              <Button
                key={`${cta.href}-${cta.label}`}
                asChild
                variant={cta.variant ?? "default"}
                className={`rounded-full px-6 ${cta.variant === "ghost" ? "text-slate-700" : ""}`}
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            ))}
          </div>
        </div>
        <Card className="relative overflow-hidden rounded-3xl border-white/70 bg-white/85 shadow-xl backdrop-blur">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-100/60 via-white/30 to-indigo-100/60" />
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-lg text-slate-800">
              {data.highlightsTitle ?? "Highlights"}
            </CardTitle>
            {data.highlightsDescription && (
              <CardDescription className="text-sm text-slate-500">
                {data.highlightsDescription}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="relative z-10 space-y-4 text-sm text-slate-600">
            {data.highlights.map((highlight) => (
              <div
                key={highlight.title}
                className={`flex items-start gap-3 rounded-2xl border p-3 ${
                  highlight.accent?.container ?? "border-sky-100 bg-white/80"
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                    highlight.accent?.icon ?? "bg-sky-50 text-sky-600"
                  }`}
                >
                  <highlight.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-800">{highlight.title}</p>
                  <p>{highlight.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
