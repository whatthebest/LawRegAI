// app/api/projects/route.ts
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { getDatabase, type DataSnapshot } from "firebase-admin/database";

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

async function getProjectCounterBase(): Promise<number> {
  const db = getDatabase(getFirebaseAdminApp());
  let highest = 0;
  const last = await db.ref("projects").orderByChild("projectIndex").limitToLast(1).get().catch(() => null);
  if (last?.exists()) {
    last.forEach((ch) => {
      const idx = ch.child("projectIndex").val();
      if (typeof idx === "number" && idx > highest) highest = idx;
      return false;
    });
  }
  const c = await db.ref("meta/projectCounter").get().catch(() => null);
  const counter = typeof c?.val() === "number" ? (c!.val() as number) : 0;
  return Math.max(highest, counter);
}

async function nextProjectIndex(): Promise<number> {
  const db = getDatabase(getFirebaseAdminApp());
  const base = await getProjectCounterBase();
  const counterRef = db.ref("meta/projectCounter");
  return await new Promise((resolve, reject) => {
    counterRef.transaction(
      (cur) => (typeof cur === "number" ? cur : base) + 1,
      (error: unknown, committed: boolean, snapshot?: DataSnapshot | null) => {
        if (error) return reject(error);
        if (!committed || !snapshot) return reject(new Error("Counter transaction not committed"));
        const val = snapshot.val();
        if (typeof val !== "number") return reject(new Error("Invalid counter value"));
        resolve(val);
      },
      false
    );
  });
}

/** GET: list all */
export async function GET() {
  const db = getDatabase(getFirebaseAdminApp());
  const snap = await db.ref("projects").get();
  const list: any[] = [];
  if (snap.exists()) {
    snap.forEach((ch) => {
      list.push({ key: ch.key as string, ...(ch.val() as any) });
      return false; // ⬅️ ป้องกัน TS ฟ้อง
    });
  }
  return NextResponse.json(list, { headers: { "Cache-Control": "no-store" } });
}

/** POST: create */
export async function POST(req: Request) {
  try {
    const db = getDatabase(getFirebaseAdminApp());
    const raw = await req.json();
    const body = sanitize(raw) ?? {}; // <- กรอง undefined/NaN จาก request ก่อน

    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const idx = await nextProjectIndex();
    const projectId = `project-${String(idx).padStart(3, "0")}`;
    const now = Date.now();

    // เตรียมค่าสะอาดๆ ก่อนใส่ลง DB
    const start =
      typeof body.startDate === "string" && body.startDate.trim()
        ? body.startDate.trim()
        : undefined;
    const done =
      typeof body.completeDate === "string" && body.completeDate.trim()
        ? body.completeDate.trim()
        : undefined;
    const sopId =
      typeof body.sop === "string" && body.sop.trim() ? body.sop.trim() : undefined;

    // ❗️สำคัญ: อย่าใส่ key ที่เป็น undefined
    const rec = sanitize({
      projectId,
      projectIndex: idx,
      name: String(body.name),
      description: String(body.description ?? ""),
      status: ["Active", "Completed", "OnHold"].includes(body.status)
        ? body.status
        : "Active",
      ...(sopId ? { sop: sopId } : {}),
      ...(start ? { startDate: start } : {}),
      ...(done ? { completeDate: done } : {}),
      createdAt: now,
      updatedAt: now,
    });

    const newRef = db.ref("projects").push();
    await newRef.set(rec);

    return NextResponse.json({ key: newRef.key, ...rec }, { status: 201 });
  } catch (e: any) {
    console.error("[POST /api/projects] failed:", e);
    return NextResponse.json({ error: e?.message ?? "failed" }, { status: 500 });
  }
}