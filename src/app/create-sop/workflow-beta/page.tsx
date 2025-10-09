"use client";

import MainLayout from "@/components/MainLayout";
import SopWorkflowBuilder from "@/components/SopWorkflowBuilder";

export default function CreateSopWorkflowBetaPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create SOP Workflow (Beta)
          </h1>
          <p className="text-sm text-muted-foreground">
            Drag and connect steps to map your SOP process. Preview or export JSON when you are ready to
            integrate with the form.
          </p>
        </div>
        <SopWorkflowBuilder />
      </div>
    </MainLayout>
  );
}
