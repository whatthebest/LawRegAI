// src/app/template-document/edit/[id]/page.tsx
import EditTemplateForm from "./EditTemplateForm";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  return <EditTemplateForm templateId={params.id} />;
}
