// app/api/sops/route.ts
import { NextResponse } from "next/server";
import { cert, getApps, initializeApp, getApp, type App } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

/* ---------- Firebase Admin singleton ---------- */
function getFirebaseAdminApp(): App {
  if (getApps().length) return getApp();
  const projectId = process.env.FIREBASE_PROJECT_ID!;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL!;
  const pk = process.env.FIREBASE_PRIVATE_KEY!;
  const databaseURL = process.env.FIREBASE_DATABASE_URL!;
  const privateKey = pk.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

/* ---------- GET: list all SOPs ---------- */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const db = getDatabase(getFirebaseAdminApp());
  const snap = await db.ref("sops").get();

  // แปลง snapshot -> array และ map ให้มี field `id` ตาม type หน้าบ้าน
  const out: any[] = [];
  if (snap.exists()) {
    const val = snap.val() as Record<string, any>;
    for (const [key, v] of Object.entries(val)) {
      out.push({
        key,
        id: v?.sopId ?? key,         // <-- ให้มี id = sopId (ถ้ามี) เพื่อเข้ากับ type SOP
        title: String(v?.title ?? ""),
        steps: Array.isArray(v?.steps) ? v.steps : [],
        ...v,                        // เก็บ field อื่นๆ ไว้ด้วย (sopIndex, createdAt ฯลฯ)
      });
    }
  }

  const filtered = status ? out.filter((sop) => sop.status === status) : out;
  return NextResponse.json(filtered, { headers: { "Cache-Control": "no-store" } });
}