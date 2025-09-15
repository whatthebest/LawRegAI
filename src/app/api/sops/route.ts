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
  // IMPORTANT: private keys from env often contain literal "\n"
  const privateKey = pk.replace(/\\n/g, "\n");
  return initializeApp({ credential: cert({ projectId, clientEmail, privateKey }), databaseURL });
}

/* Helper: ensure the handler never hangs */
function withTimeout<T>(p: Promise<T>, ms = 9000): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Upstream timeout")), ms);
    p.then(v => { clearTimeout(t); resolve(v); })
     .catch(e => { clearTimeout(t); reject(e); });
  });
}

/* ---------- GET: list all or by status ---------- */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    const db = getDatabase(getFirebaseAdminApp());

    // If you have an index on "status", this queries server-side.
    const snap = await withTimeout(
      status
        ? db.ref("sops").orderByChild("status").equalTo(status).get()
        : db.ref("sops").get()
    );

    const out: any[] = [];
    if (snap.exists()) {
      const val = snap.val() as Record<string, any>;
      for (const [key, v] of Object.entries(val)) {
        out.push({
          // spread FIRST so normalized fields win and aren't overwritten
          ...v,
          key,
          id: v?.sopId ?? v?.id ?? key,
          title: String(v?.title ?? ""),
          steps: Array.isArray(v?.steps) ? v.steps : [],
        });
      }
    }

    // Fallback filter if you didn't use the status query above
    const result = status ? out.filter(s => s.status === status) : out;

    return NextResponse.json(result, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    const message = e?.message ?? "Internal error";
    // Optional: console.error("API /api/sops failed:", e);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
