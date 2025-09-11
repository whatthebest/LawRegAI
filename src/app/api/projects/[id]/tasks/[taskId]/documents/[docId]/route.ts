// app/api/projects/[id]/tasks/[taskId]/documents/[docId]/route.ts
import { NextRequest, NextResponse } from "next/server";
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

/* ----------- DELETE /api/projects/[id]/tasks/[taskId]/documents/[docId] ----------- */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string; taskId: string; docId: string }> }) {
  const { id, taskId, docId } = await ctx.params;
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ref = db.ref(`projects/${key}/tasks/${taskId}/documents/${docId}`);
  const snap = await ref.get();
  if (!snap.exists()) return NextResponse.json({ error: "document not found" }, { status: 404 });
  const doc = snap.val() as any;
  // delete file if under public/uploads
  try {
    if (doc?.url && typeof doc.url === "string") {
      const safe = doc.url.startsWith("/uploads/") ? doc.url : null;
      if (safe) {
        const abs = path.join(process.cwd(), "public", safe.replace(/^\/+/, ""));
        if (fs.existsSync(abs)) fs.unlinkSync(abs);
      }
    }
  } catch {}
  await ref.remove();
  return NextResponse.json({ ok: true });
}
