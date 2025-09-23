// src/app/template-document/edit/[id]/page.tsx
import EditTemplateForm from "./EditTemplateForm";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { id: string } }) {
  let decodedTemplateId = params.id;

  try {
    decodedTemplateId = decodeURIComponent(params.id);
  } catch {
    // If decoding fails, fall back to the original identifier
  }

  return <EditTemplateForm templateId={decodedTemplateId} />;
}
