// app/api/projects/[id]/tasks/[taskId]/documents/route.ts
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

function slugifyName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

/* ----------- POST /api/projects/[id]/tasks/[taskId]/documents -----------
   Accept multipart/form-data, field name: "file" (allow multiple)
*/
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string; taskId: string }> }) {
  const { id, taskId } = await ctx.params;
  const db = getDatabase(getFirebaseAdminApp());
  const key = await findProjectKeyById(id);
  if (!key) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData();
  const files = form.getAll("file");
  if (!files || files.length === 0) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }

  const baseDir = path.join(process.cwd(), "public", "uploads", "projects", id, taskId);
  fs.mkdirSync(baseDir, { recursive: true });

  const docs: any[] = [];
  for (const f of files) {
    if (typeof f === "string") continue;
    const file = f as unknown as File;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = slugifyName(file.name || "file");

    // create a db doc first to get docId
    const docRef = db.ref(`projects/${key}/tasks/${taskId}/documents`).push();
    const docId = docRef.key as string;
    const filename = `${docId}-${safeName}`;
    const destPath = path.join(baseDir, filename);
    fs.writeFileSync(destPath, buffer);

    const urlPath = `/uploads/projects/${id}/${taskId}/${filename}`;
    const doc = { id: docId, name: safeName, size: buffer.length, url: urlPath, uploadedAt: Date.now() };
    await docRef.set(doc);
    docs.push(doc);
  }

  return NextResponse.json({ uploaded: docs }, { status: 201 });
}
