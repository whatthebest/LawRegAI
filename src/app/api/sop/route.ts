// app/api/sop/route.ts
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { getDatabase, type DataSnapshot } from "firebase-admin/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- Firebase Admin init (reuse singleton) ---------- */
function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();

  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const pk = process.env.FIREBASE_PRIVATE_KEY!;
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;

  const privateKey = pk.replace(/\\n/g, "\n");

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });
}

/* ---------- Helpers ---------- */
async function getHighestIndex(): Promise<number> {
  const db = getDatabase(getFirebaseAdminApp());
  try {
    const snap = await db.ref("sops").orderByChild("sopIndex").limitToLast(1).get();
    if (!snap.exists()) return 0;
    let max = 0;
    snap.forEach((ch) => {
      const idx = ch.child("sopIndex").val();
      if (typeof idx === "number" && idx > max) max = idx;
    });
    return max;
  } catch {
    return 0;
  }
}

async function getCounter(): Promise<number> {
  const db = getDatabase(getFirebaseAdminApp());
  try {
    const c = await db.ref("meta/sopCounter").get();
    return typeof c.val() === "number" ? (c.val() as number) : 0;
  } catch {
    return 0;
  }
}

/** Deeply remove values that RTDB cannot store (undefined, NaN) */
function sanitize(v: any): any {
  if (v === undefined) return undefined;
  if (typeof v === "number" && Number.isNaN(v)) return undefined;

  if (Array.isArray(v)) {
    const arr = v.map(sanitize).filter((x) => x !== undefined);
    return arr;
  }
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

/* ---------- GET: preview next = max(counter, highestInDB) + 1 ---------- */
export async function GET() {
  const [highest, counter] = await Promise.all([getHighestIndex(), getCounter()]);
  const base = Math.max(highest, counter);
  const nextIndex = base + 1;
  const nextSopId = `sop-${String(nextIndex).padStart(3, "0")}`;
  return NextResponse.json(
    { nextSopId, nextIndex },
    { headers: { "Cache-Control": "no-store" } }
  );
}

/* ---------- POST: concurrency-safe create via counter transaction ---------- */
export async function POST(req: Request) {
  try {
    const db = getDatabase(getFirebaseAdminApp());

    // 1) Parse & sanitize incoming payload (strip undefined/NaN)
    const raw = await req.json();
    const payload: any = sanitize(raw);

    // 2) Normalize steps (defensive)
    if (Array.isArray(payload?.steps)) {
      payload.steps = payload.steps.map((s: any, i: number) => ({
        stepOrder: typeof s?.stepOrder === "number" ? s.stepOrder : i + 1,
        title: String(s?.title ?? ""),
        detail: String(s?.detail ?? ""),
        stepType: s?.stepType === "Decision" ? "Decision" : "Sequence",
        sla: typeof s?.sla === "number" ? s.sla : 1,
        owner: String(s?.owner ?? ""),
        reviewer: String(s?.reviewer ?? ""),
        approver: String(s?.approver ?? ""),
        ...(s?.nextStepYes ? { nextStepYes: String(s.nextStepYes) } : {}),
        ...(s?.nextStepNo ? { nextStepNo: String(s.nextStepNo) } : {}),
      }));
    }

    // 3) Initialize counter from highest if missing/behind; then atomically increment
    const highest = await getHighestIndex();
    const counterRef = db.ref("meta/sopCounter");

    const newIndex: number = await new Promise((resolve, reject) => {
      counterRef.transaction(
        (cur) => {
          const base = typeof cur === "number" ? cur : highest;
          return base + 1;
        },
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

    // 4) Create SOP record
    const sopId = `sop-${String(newIndex).padStart(3, "0")}`;
    const newRef = db.ref("sops").push();
    await newRef.set({
      ...payload,
      sopId,
      sopIndex: newIndex,
      createdAt: Date.now(),
    });

    return NextResponse.json(
      { message: "SOP created successfully", sopId, sopIndex: newIndex, key: newRef.key },
      { status: 201 }
    );
  } catch (error: any) {
    const msg = error?.message || String(error);
    console.error("[POST /api/sop] failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/* ---------- PUT: resync counter down to current highest (optional) ---------- */
export async function PUT() {
  const db = getDatabase(getFirebaseAdminApp());
  const highest = await getHighestIndex();
  await db.ref("meta/sopCounter").set(highest);
  return NextResponse.json({ sopCounter: highest });
}
