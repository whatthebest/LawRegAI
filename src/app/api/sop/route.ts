// app/api/sop/route.ts
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp, getApp, App } from "firebase-admin/app";
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

  const privateKey = pk.replace(/\\n/g, "\n"); // required for multiline keys

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    databaseURL,
  });
}

/** Read the larger of meta counter or highest existing sopIndex */
async function computeBaseIndex() {
  const app = getFirebaseAdminApp();
  const db = getDatabase(app);

  let base = 0;

  // 1) /meta/sopCounter
  try {
    const c = await db.ref("meta/sopCounter").get();
    if (typeof c.val() === "number") base = c.val() as number;
  } catch (e) {
    console.warn("[GET /api/sop] counter read failed:", e);
  }

  // 2) Highest sopIndex under /sops
  try {
    const snap = await db
      .ref("sops")
      .orderByChild("sopIndex")
      .limitToLast(1)
      .get();

    if (snap.exists()) {
      let max = 0;
      snap.forEach((ch) => {
        const idx = ch.child("sopIndex").val();
        if (typeof idx === "number" && idx > max) max = idx;
      });
      if (max > base) base = max;
    }
  } catch (e) {
    console.warn("[GET /api/sop] sops read failed:", e);
  }

  return base;
}

/** GET: preview the next SOP id. Never throws a 500; falls back to sop-001. */
export async function GET() {
  try {
    const base = await computeBaseIndex();
    const nextIndex = base + 1;
    const nextSopId = `sop-${String(nextIndex).padStart(3, "0")}`;

    console.log("[GET /api/sop] preview", { base, nextIndex, nextSopId });
    return NextResponse.json(
      { nextSopId, nextIndex },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("[GET /api/sop] fatal:", e?.message || e);
    return NextResponse.json(
      { nextSopId: "sop-001", nextIndex: 1, warning: "fallback-used" },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}

/** PUT: sync /meta/sopCounter to the highest sopIndex (optional admin utility) */
export async function PUT() {
  const app = getFirebaseAdminApp();
  const db = getDatabase(app);

  const base = await computeBaseIndex();
  await db.ref("meta/sopCounter").set(base);
  console.log("[PUT /api/sop] counter set to", base);

  return NextResponse.json({ sopCounter: base });
}

/** POST: create SOP using an atomic counter increment */
export async function POST(req: Request) {
  try {
    const sopData = await req.json();
    const app = getFirebaseAdminApp();
    const db = getDatabase(app);

    const counterRef = db.ref("meta/sopCounter");
    const newIndex: number = await new Promise((resolve, reject) => {
      counterRef.transaction(
        (cur) => (typeof cur === "number" ? cur : 0) + 1,
        (error: unknown, committed: boolean, snapshot?: DataSnapshot | null) => {
          if (error) return reject(error);
          if (!committed || !snapshot)
            return reject(new Error("Counter transaction not committed"));
          const val = snapshot.val();
          if (typeof val !== "number")
            return reject(new Error("Invalid counter value"));
          resolve(val);
        },
        false
      );
    });

    const sopId = `sop-${String(newIndex).padStart(3, "0")}`;
    const newRef = db.ref("sops").push();
    await newRef.set({
      ...sopData,
      sopId,
      sopIndex: newIndex,
      createdAt: Date.now(),
    });

    console.log("[POST /api/sop] created", { sopId, newIndex, key: newRef.key });
    return NextResponse.json(
      { message: "SOP created successfully", sopId, sopIndex: newIndex, key: newRef.key },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/sop] failed:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Create failed" }, { status: 500 });
  }
}
