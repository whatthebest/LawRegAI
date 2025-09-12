// app/api/projects/[id]/tasks/route.ts
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
  // direct key support
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

/* ----------- GET /api/projects/[id]/tasks ----------- */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });
  const snap = await db.ref(`projects/${key}/tasks`).get();
  const list: any[] = [];
  if (snap.exists()) {
    const val = snap.val() as Record<string, any>;
    for (const [taskId, v] of Object.entries(val)) {
      list.push({ taskId, ...v });
    }
  }
  return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
}

/* ----------- PUT /api/projects/[id]/tasks -----------
   Convenience endpoint: update by stepId in body
*/
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = await req.json();
  const body = sanitize(raw) ?? {};
  const stepId = (body?.stepId ?? body?.taskId)?.toString();
  if (!stepId) return NextResponse.json({ error: "stepId required" }, { status: 400 });

  const allowed: Record<string, any> = {};
  if (typeof body.status === "string" && body.status) allowed.status = body.status;
  if (typeof body.title === "string") allowed.title = body.title;
  if (typeof body.detail === "string") allowed.detail = body.detail;
  if (typeof body.owner === "string") allowed.owner = body.owner;
  if (typeof body.reviewer === "string") allowed.reviewer = body.reviewer;
  if (typeof body.approver === "string") allowed.approver = body.approver;
  if (typeof body.stepType === "string") {
    allowed.stepType = body.stepType === "Decision" ? "Decision" : "Sequence";
  }
  if (typeof body.nextStepYes === "string") allowed.nextStepYes = body.nextStepYes;
  if (typeof body.nextStepNo === "string") allowed.nextStepNo = body.nextStepNo;
  if (typeof body.sla === "number" && !Number.isNaN(body.sla)) allowed.sla = body.sla;
  if (Object.keys(allowed).length === 0)
    return NextResponse.json({ error: "no updatable fields" }, { status: 400 });
  allowed.updatedAt = Date.now();

  const ref = db.ref(`projects/${key}/tasks/${stepId}`);
  const exists = (await ref.get()).exists();
  if (!exists) return NextResponse.json({ error: "task not found" }, { status: 404 });
  await ref.update(allowed);
  const snap = await ref.get();
  return NextResponse.json({ taskId: stepId, ...snap.val() });
}

/* ----------- POST /api/projects/[id]/tasks -----------
   Create a new project-specific task (no SOP)
*/
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = await req.json();
  const body = sanitize(raw) ?? {};

  if (!body?.title || typeof body.title !== "string") {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  // compute next stepOrder
  let nextOrder = 1;
  try {
    const ts = await db.ref(`projects/${key}/tasks`).get();
    if (ts.exists()) {
      const vals: any[] = Object.values(ts.val() || {});
      let max = 0;
      for (const v of vals) {
        const so = typeof v?.stepOrder === "number" ? v.stepOrder : 0;
        if (so > max) max = so;
      }
      nextOrder = max + 1;
    }
  } catch {}

  const now = Date.now();
  const newRef = db.ref(`projects/${key}/tasks`).push();
  const taskId = newRef.key as string;
  const rec = sanitize({
    taskId,
    stepOrder: nextOrder,
    title: String(body.title),
    detail: String(body.detail ?? ""),
    stepType: body.stepType === "Decision" ? "Decision" : "Sequence",
    ...(body?.nextStepYes ? { nextStepYes: String(body.nextStepYes) } : {}),
    ...(body?.nextStepNo ? { nextStepNo: String(body.nextStepNo) } : {}),
    sla: typeof body.sla === "number" ? body.sla : 1,
    owner: String(body.owner ?? ""),
    reviewer: String(body.reviewer ?? ""),
    approver: String(body.approver ?? ""),
    status: typeof body.status === "string" && body.status ? body.status : "Draft",
    createdAt: now,
    updatedAt: now,
  });
  await newRef.set(rec);
  return NextResponse.json({ taskId, ...rec }, { status: 201 });
}
