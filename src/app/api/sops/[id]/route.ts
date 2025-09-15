// app/api/sops/[id]/route.ts
import { NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { requireSession, requireAdminLike } from "@/lib/authz";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- Firebase Admin singleton (เหมือนใน /api/sops/route.ts) ---------- */
function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const pk = process.env.FIREBASE_PRIVATE_KEY!;
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;
  const privateKey = pk.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

/** Normalize steps to an array. If steps is an object, convert entries to an array and preserve a stable id. */
function normalizeSteps(steps: any): any[] {
  if (Array.isArray(steps)) return steps;
  if (steps && typeof steps === "object") {
    return Object.entries(steps).map(([k, v]: [string, any]) => {
      const obj = v ?? {};
      // keep a stable id so client can match/update by id or index
      const id = obj.id ?? obj.stepId ?? k;
      return { id, ...obj };
    });
  }
  return [];
}

/* ---------- GET: get one SOP by id or key ---------- */
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params; // Next 15 ต้อง await
    const db = getDatabase(getFirebaseAdminApp());

    // 1) ลองอ่านตรง key ก่อน: sops/<id>
    const direct = await db.ref(`sops/${id}`).get();
    if (direct.exists()) {
      const v = direct.val();
      return NextResponse.json({
        key: id,
        id: v?.sopId ?? v?.id ?? id,
        title: String(v?.title ?? ""),
        steps: normalizeSteps(v?.steps),
        ...v,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    // 2) fallback: ค้นหาโดย field sopId หรือ id
    // (ถ้าใช้ orderByChild ต้องมี index ดูข้อ 2 ด้านล่าง)
    const bySopId = await db.ref("sops").orderByChild("sopId").equalTo(id).get();
    if (bySopId.exists()) {
      const [key, v] = Object.entries(bySopId.val())[0] as [string, any];
      return NextResponse.json({
        key,
        id: v?.sopId ?? v?.id ?? key,
        title: String(v?.title ?? ""),
        steps: normalizeSteps(v?.steps),
        ...v,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    const byId = await db.ref("sops").orderByChild("id").equalTo(id).get();
    if (byId.exists()) {
      const [key, v] = Object.entries(byId.val())[0] as [string, any];
      return NextResponse.json({
        key,
        id: v?.sopId ?? v?.id ?? key,
        title: String(v?.title ?? ""),
        steps: normalizeSteps(v?.steps),
        ...v,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unexpected error" }, { status: 500 });
  }
}

/* ---------- PATCH: update status of a SOP ---------- */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await requireSession();
    const authz = await requireAdminLike(decoded);
    if (!authz.ok) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const status: any = body?.status;
    if (status !== "Approved" && status !== "Draft") {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }

    const db = getDatabase(getFirebaseAdminApp());
    const now = Date.now();

    const updateAndReturn = async (key: string) => {
      await db.ref(`sops/${key}`).update({ status, updatedAt: now });
      const snap = await db.ref(`sops/${key}`).get();
      const v = snap.val();
      return NextResponse.json(
        {
          key,
          id: v?.sopId ?? v?.id ?? key,
          title: String(v?.title ?? ""),
          steps: normalizeSteps(v?.steps),
          ...v,
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    };

    // 1) try direct key
    const direct = await db.ref(`sops/${id}`).get();
    if (direct.exists()) {
      return updateAndReturn(id);
    }

    // 2) search by sopId
    const bySopId = await db
      .ref("sops")
      .orderByChild("sopId")
      .equalTo(id)
      .limitToFirst(1)
      .get();
    if (bySopId.exists()) {
      const [key] = Object.keys(bySopId.val());
      return updateAndReturn(key);
    }

    // 3) search by id field
    const byId = await db
      .ref("sops")
      .orderByChild("id")
      .equalTo(id)
      .limitToFirst(1)
      .get();
    if (byId.exists()) {
      const [key] = Object.keys(byId.val());
      return updateAndReturn(key);
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (err: any) {
    if (err?.message === "NO_SESSION") {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err?.message || "unexpected error" },
      { status: 500 }
    );
  }
}