// src/app/template-document/page.tsx
import CreateTemplateForm from "./CreateTemplateForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <CreateTemplateForm />;
}
