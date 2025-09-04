// src/app/api/users/by-id/[uid]/route.ts
import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERS = "users";

export async function GET(
  _req: Request,
  { params }: { params: { uid: string } }
) {
  const uid = decodeURIComponent(params.uid);
  const snap = await adminDb().ref(`${USERS}/${uid}`).get();
  if (!snap.exists()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(
    { id: uid, ...snap.val() },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(
  req: Request,
  { params }: { params: { uid: string } }
) {
  const uid = decodeURIComponent(params.uid);
  const body = await req.json();

  const ref = adminDb().ref(`${USERS}/${uid}`);
  const oldSnap = await ref.get();
  if (!oldSnap.exists()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await ref.update(body);

  // sync custom claims if roles changed (optional)
  const old = oldSnap.val() || {};
  if (body.systemRole !== old.systemRole || body.role !== old.role) {
    await adminAuth().setCustomUserClaims(uid, {
      systemRole: body.systemRole,
      workflowRole: body.role,
    });
  }

  return NextResponse.json({ id: uid, ...body }, { status: 200 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: { uid: string } }
) {
  const uid = decodeURIComponent(params.uid);

  await adminDb().ref(`${USERS}/${uid}`).remove();
  try {
    await adminAuth().deleteUser(uid);
  } catch {
    // ignore if user doesn't exist in Auth
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}