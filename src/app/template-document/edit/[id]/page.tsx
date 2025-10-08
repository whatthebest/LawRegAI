// src/app/template-document/edit/[id]/page.tsx
import { safeDecodeURIComponent } from "@/lib/urls";
import EditTemplateForm from "./EditTemplateForm";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  const templateId = safeDecodeURIComponent(params.id);

  return <EditTemplateForm templateId={templateId} />;
}
