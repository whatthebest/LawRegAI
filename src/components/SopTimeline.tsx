"use client";

import { SOPStep } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { CheckCircle, Circle, Clock, FileText } from "lucide-react";
import { Badge } from "./ui/badge";

const statusIcons = {
  Approved: <CheckCircle className="h-5 w-5 text-green-500" />,
  Review: <Clock className="h-5 w-5 text-yellow-500" />,
  Draft: <FileText className="h-5 w-5 text-gray-500" />,
};

const getStatusVariant = (status: SOPStep['status']) => {
    switch (status) {
        case 'Approved': return 'default';
        case 'Review': return 'secondary';
        case 'Draft': return 'outline';
        default: return 'outline';
    }
}

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
                    {statusIcons[step.status] || <Circle className="h-3 w-3 text-primary" />}
                </div>
            </div>
            <Card className="ml-8 w-full shadow-sm">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="font-bold text-xl">{step.title}</CardTitle>
                            <CardDescription>Step {index + 1}</CardDescription>
                        </div>
                        <Badge variant={getStatusVariant(step.status)}>{step.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-4">{step.detail}</p>
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="font-semibold">Owner:</span>
                            <span>{step.owner}</span>
                        </div>
                         <div className="flex items-center gap-2">
                            <span className="font-semibold">SLA:</span>
                            <span>{step.sla} day{step.sla !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
          </div>
        ))}
      </div>
    </div>
  );
}
