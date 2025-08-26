// app/create-sop/page.tsx
import CreateSopForm from "./CreateSopForm";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Build a safe origin for server-side fetch (works locally, Vercel, Firebase, etc.) */
async function resolveOrigin(): Promise<string> {
  const h = await headers(); // ← await fixes TS: Promise<ReadonlyHeaders>
  const proto = h.get("x-forwarded-proto") || "http";
  const host = h.get("x-forwarded-host") || h.get("host");

  // If there's no host in the request (can happen in some environments), fall back to env or localhost
  if (!host) {
    const envUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null);
    return envUrl ?? "http://localhost:3000";
  }
  return `${proto}://${host}`;
}

async function getNextSopId(): Promise<string> {
  try {
    const origin = await resolveOrigin(); // ← await the async resolver
    const res = await fetch(`${origin}/api/sop`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Bad status ${res.status}`);
    const data = await res.json();
    return data?.nextSopId ?? "sop-001";
  } catch (e) {
    console.warn("[create-sop] getNextSopId failed:", e);
    return "sop-001"; // last-resort fallback so UI stays usable
  }
}

export default async function Page() {
  const initialSopId = await getNextSopId(); // compute BEFORE render
  return <CreateSopForm initialSopId={initialSopId} />;
}
