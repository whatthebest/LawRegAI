// src/app/api/users/by-id/[uid]/route.ts
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERS = "users";

// Next.js >= 14.2 passes `params` as a promise for dynamic route handlers.
type RouteContext = { params: Promise<{ uid: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { uid } = await context.params;
  const decodedUid = decodeURIComponent(uid);

  const snap = await adminDb().ref(`${USERS}/${decodedUid}`).get();
  if (!snap.exists()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { id: decodedUid, ...snap.val() },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(req: Request, context: RouteContext) {
  const { uid } = await context.params;
  const decodedUid = decodeURIComponent(uid);
  const body = await req.json();

  const ref = adminDb().ref(`${USERS}/${decodedUid}`);
  const oldSnap = await ref.get();
  if (!oldSnap.exists()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ref.update(body);

  // sync custom claims if roles changed (optional)
  const old = oldSnap.val() || {};
  if (body.systemRole !== old.systemRole || body.role !== old.role) {
    await adminAuth().setCustomUserClaims(decodedUid, {
      systemRole: body.systemRole,
      workflowRole: body.role,
    });
  }

  return NextResponse.json({ id: decodedUid, ...body }, { status: 200 });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const { uid } = await context.params;
  const decodedUid = decodeURIComponent(uid);

  await adminDb().ref(`${USERS}/${decodedUid}`).remove();
  try {
    await adminAuth().deleteUser(decodedUid);
  } catch {
    // ignore if user doesn't exist in Auth
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
