// app/api/projects/[id]/tasks/[taskId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const pk = process.env.FIREBASE_PRIVATE_KEY!;
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;
  const privateKey = pk.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

function sanitize(v: any): any {
  if (v === undefined) return undefined;
  if (typeof v === "number" && Number.isNaN(v)) return undefined;
  if (Array.isArray(v)) return v.map(sanitize).filter((x) => x !== undefined);
  if (v && typeof v === "object") {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      const s = sanitize(val);
      if (s !== undefined) out[k] = s;
    }
    return out;
  }
  return v;
}

async function findProjectKeyById(projectId: string): Promise<string | null> {
  const db = getDatabase(getFirebaseAdminApp());
  const direct = await db.ref(`projects/${projectId}`).get().catch(() => null as any);
  if (direct?.exists?.()) return projectId;
  const snap = await db
    .ref("projects")
    .orderByChild("projectId")
    .equalTo(projectId)
    .limitToFirst(1)
    .get();
  if (!snap.exists()) return null;
  let key: string | null = null;
  snap.forEach((ch) => { key = ch.key as string; return true; });
  return key;
}

/* ----------- PUT /api/projects/[id]/tasks/[taskId] ----------- */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await ctx.params;
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = await req.json();
  const body = sanitize(raw) ?? {};
  const allowed: Record<string, any> = {};
  if (typeof body.status === "string" && body.status) allowed.status = body.status;
  if (typeof body.title === "string") allowed.title = body.title;
  if (typeof body.detail === "string") allowed.detail = body.detail;
  if (typeof body.owner === "string") allowed.owner = body.owner;
  if (typeof body.reviewer === "string") allowed.reviewer = body.reviewer;
  if (typeof body.approver === "string") allowed.approver = body.approver;
  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  allowed.updatedAt = Date.now();

  const ref = db.ref(`projects/${key}/tasks/${taskId}`);
  const exists = (await ref.get()).exists();
  if (!exists) return NextResponse.json({ error: "task not found" }, { status: 404 });
  await ref.update(allowed);
  const snap = await ref.get();
  return NextResponse.json({ taskId, ...snap.val() });
}

/* ----------- GET /api/projects/[id]/tasks/[taskId] ----------- */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await ctx.params;
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });
  const snap = await db.ref(`projects/${key}/tasks/${taskId}`).get();
  if (!snap.exists()) return NextResponse.json({ error: "task not found" }, { status: 404 });
  return NextResponse.json({ taskId, ...snap.val() }, { headers: { "Cache-Control": "no-store" } });
}
