"use client";

import MainLayout from "@/components/MainLayout";
import IntegratedWorkspaceHero, {
  type HeroContent,
} from "@/components/IntegratedWorkspaceHero";
import SummaryBotExperience from "@/components/SummaryBotExperience";
import { FileText, RefreshCcw, Sparkles } from "lucide-react";

const summaryHeroContent: HeroContent = {
  badge: "Automation",
  title: "Summary file BOT (Beta)",
  description:
    "Automate the capture of Bank of Thailand circulars, generate structured summaries, and export ready-to-share compliance briefs without leaving this workspace.",
  cards: [
    {
      title: "AI summary pipeline",
      description:
        "Run the latest BOT circular through an AI workflow to extract metadata, impact, and digestible insights.",
    },
    {
      title: "Compliance-ready exports",
      description:
        "Generate editable drafts, download citations, and keep stakeholders aligned with traceable outputs.",
    },
  ],
  ctas: [
    { href: "#summary-bot", label: "Run Summary" },
    { href: "/integrated-hub", label: "View Integrated Hub", variant: "ghost" },
  ],
  highlightsTitle: "Automation highlights",
  highlightsDescription: "Key capabilities unlocked inside the Summary BOT workspace.",
  highlights: [
    {
      icon: Sparkles,
      title: "Guided automation",
      description: "Step-by-step actions streamline ingestion, summarization, and review.",
      accent: {
        container: "border-amber-100 bg-white/80",
        icon: "bg-amber-50 text-amber-600",
      },
    },
    {
      icon: FileText,
      title: "Structured insights",
      description: "Key metadata, change summaries, and citations compiled for immediate use.",
      accent: {
        container: "border-sky-100 bg-white/80",
        icon: "bg-sky-50 text-sky-600",
      },
    },
    {
      icon: RefreshCcw,
      title: "Live BOT listings",
      description: "Refresh the latest circulars at any time to keep your source library current.",
      accent: {
        container: "border-emerald-100 bg-white/80",
        icon: "bg-emerald-50 text-emerald-600",
      },
    },
  ],
};

export default function SummaryBotPage() {
  return (
    <MainLayout>
      <div className="space-y-10">
        <IntegratedWorkspaceHero content={summaryHeroContent} />
        <SummaryBotExperience />
      </div>
    </MainLayout>
  );
}
