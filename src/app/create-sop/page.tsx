// app/create-sop/page.tsx  (SERVER component)
import CreateSopForm from "./CreateSopForm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getNextSopId(): Promise<string> {
  try {
    // Build the absolute origin for this request (works locally, Vercel, Firebase Studio, etc.)
    const h = await headers();
    const proto = h.get("x-forwarded-proto") ?? "http";
    const host = h.get("x-forwarded-host") ?? h.get("host")!;
    const origin = `${proto}://${host}`;

    const res = await fetch(`${origin}/api/sop`, { cache: "no-store" });
    if (!res.ok) throw new Error("Bad status");
    const data = await res.json();
    return data?.nextSopId ?? "sop-???";
  } catch {
    return "sop-???"; // graceful fallback
  }
}

export default async function Page() {
  const initialSopId = await getNextSopId(); // ← already computed BEFORE render
  return <CreateSopForm initialSopId={initialSopId} />;
}
