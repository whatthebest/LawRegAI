// app/api/projects/[id]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { cert, getApp, getApps, initializeApp, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import fs from "fs";
import path from "path";

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

/** หา push-key ของ project จาก projectId (เช่น "project-005") */
async function findProjectKeyById(projectId: string): Promise<string | null> {
  const db = getDatabase(getFirebaseAdminApp());
  // support direct push-key
  const direct = await db.ref(`projects/${projectId}`).get().catch(() => null as any);
  if (direct?.exists?.()) return projectId;
  // fallback: search by field projectId
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

/* ----------- GET /api/projects/[id] ----------- */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;               // ⬅️ ต้อง await
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });
  const snap = await db.ref(`projects/${key}`).get();
  return NextResponse.json({ key, ...snap.val() }, { headers: { "Cache-Control": "no-store" } });
}

/* ----------- PUT /api/projects/[id] ----------- */
export async function PUT(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;               // ⬅️ ต้อง await
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const raw = await req.json();
  const body = sanitize(raw) ?? {};

  // Convenience: if request is intended to update a task status by stepId
  if (typeof body.stepId === "string" && typeof body.status === "string") {
    const ref = db.ref(`projects/${key}/tasks/${body.stepId}`);
    const exists = (await ref.get()).exists();
    if (!exists) return NextResponse.json({ error: "task not found" }, { status: 404 });
    await ref.update({ status: body.status, updatedAt: Date.now() });
    const snap = await ref.get();
    return NextResponse.json({ taskId: body.stepId, ...snap.val() });
  }

  const allowed: Record<string, any> = {};
  if (typeof body.name === "string") allowed.name = body.name;
  if (typeof body.description === "string") allowed.description = body.description;
  if (typeof body.sop === "string" && body.sop.trim()) allowed.sop = body.sop.trim();
  if (["Active", "Completed", "OnHold"].includes(body.status)) allowed.status = body.status;
  if (typeof body.startDate === "string" && body.startDate.trim()) allowed.startDate = body.startDate.trim();
  if (typeof body.completeDate === "string" && body.completeDate.trim()) allowed.completeDate = body.completeDate.trim();
  allowed.updatedAt = Date.now();

  await db.ref(`projects/${key}`).update(allowed);
  const snap = await db.ref(`projects/${key}`).get();
  return NextResponse.json({ key, ...snap.val() });
}

/* ----------- DELETE /api/projects/[id] ----------- */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;               // ⬅️ ต้อง await
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });
  // clean uploaded documents under public/uploads/projects/:id
  try {
    const snap = await db.ref(`projects/${key}`).get();
    if (snap.exists()) {
      const proj = snap.val() as any;
      const tasks = (proj?.tasks || {}) as Record<string, any>;
      const values = Array.isArray(tasks) ? tasks : Object.values(tasks || {});
      for (const t of values) {
        const docs = (t?.documents || {}) as Record<string, any>;
        const dvals = Array.isArray(docs) ? docs : Object.values(docs || {});
        for (const d of dvals) {
          const url: string | undefined = typeof d?.url === "string" ? d.url : undefined;
          if (url && url.startsWith("/uploads/")) {
            const abs = path.join(process.cwd(), "public", url.replace(/^\/+/, ""));
            if (fs.existsSync(abs)) {
              try { fs.unlinkSync(abs); } catch {}
            }
          }
        }
      }
      // also try to remove the folder for the project
      const projDir = path.join(process.cwd(), "public", "uploads", "projects", id);
      try { if (fs.existsSync(projDir)) fs.rmSync(projDir, { recursive: true, force: true }); } catch {}
    }
  } catch {}
  await db.ref(`projects/${key}`).remove();
  return NextResponse.json({ ok: true });
}
