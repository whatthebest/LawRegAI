// app/api/sops/[id]/route.ts
import { NextResponse } from "next/server";
import { getDatabase } from "firebase-admin/database";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";

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
        steps: Array.isArray(v?.steps) ? v.steps : [],
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
        steps: Array.isArray(v?.steps) ? v.steps : [],
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
        steps: Array.isArray(v?.steps) ? v.steps : [],
        ...v,
      }, { headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ error: "not found" }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "unexpected error" }, { status: 500 });
  }
}