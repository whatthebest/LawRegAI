
"use client";

import { SOPStep } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { CheckCircle, Circle, Clock, FileText, GitBranch, ChevronsRight } from "lucide-react";

export function SopTimeline({ steps }: { steps: SOPStep[] }) {
  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border -translate-x-1/2"></div>

      <div className="space-y-8">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex items-start">
             <div className="absolute left-4 top-2.5 h-full -translate-x-1/2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-background border-2 border-primary">
                    <Circle className="h-3 w-3 text-primary" />
                </div>
            </div>
            <Card className="ml-8 w-full shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-bold text-xl">{step.title}</CardTitle>
                            <CardDescription>Step {step.stepOrder}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">{step.detail}</p>
                    
                    {step.stepType === 'Decision' && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm bg-muted/50 p-3 rounded-md">
                            <div className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-primary" />
                                <strong>Decision Path</strong>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold">Yes &rarr;</span>
                                <span>Step {step.nextStepYes}</span>
                            </div>
                             <div className="flex items-center gap-2">
                                <span className="font-semibold">No &rarr;</span>
                                <span>Step {step.nextStepNo}</span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
