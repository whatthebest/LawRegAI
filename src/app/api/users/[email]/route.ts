import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { profileSchema } from "../../users/_schema";
import { requireSession, requireAdminLike } from "@/lib/authz";

export const runtime = "nodejs";

const USERS = "users";

function emailFromParam(p: string) {
  return decodeURIComponent(p);
}

async function findUserKeyByEmail(email: string) {
  const snap = await adminDb()
    .ref(USERS)
    .orderByChild("email")
    .equalTo(email)
    .limitToFirst(1)
    .once("value");

  const val = snap.val() as Record<string, any> | null;
  if (!val) return null;

  const key = Object.keys(val)[0];
  return { key, data: val[key] as any };
}

/* --------------------------- GET /api/users/[email] ------------------------ */
export async function GET(_: Request, { params }: { params: { email: string } }) {
  const decoded = await requireSession();
  const authz = await requireAdminLike(decoded);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason },
      { status: authz.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const email = emailFromParam(params.email);
  const found = await findUserKeyByEmail(email);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ id: found.key, ...found.data }, { status: 200 });
}

/* --------------------------- PUT /api/users/[email] ------------------------ */
export async function PUT(req: Request, { params }: { params: { email: string } }) {
  const decoded = await requireSession();
  const authz = await requireAdminLike(decoded);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason },
      { status: authz.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const email = emailFromParam(params.email);
  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const found = await findUserKeyByEmail(email);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // update profile
  await adminDb().ref(`${USERS}/${found.key}`).update(parsed.data);

  // OPTIONAL: sync Auth custom claims (use Auth UID, not the DB key)
  try {
    const user = await adminAuth().getUserByEmail(email);
    await adminAuth().setCustomUserClaims(user.uid, {
      systemRole: parsed.data.systemRole,
      workflowRole: parsed.data.role,
    });
  } catch {
    // ignore if no Auth user exists for this email
  }

  return NextResponse.json({ id: found.key, ...parsed.data }, { status: 200 });
}

/* ------------------------- DELETE /api/users/[email] ----------------------- */
export async function DELETE(_: Request, { params }: { params: { email: string } }) {
  const decoded = await requireSession();
  const authz = await requireAdminLike(decoded);
  if (!authz.ok) {
    return NextResponse.json(
      { error: authz.reason },
      { status: authz.reason === "unauthenticated" ? 401 : 403 }
    );
  }

  const email = emailFromParam(params.email);
  const found = await findUserKeyByEmail(email);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // remove profile
  await adminDb().ref(`${USERS}/${found.key}`).remove();

  // OPTIONAL: remove Auth account if present
  try {
    const user = await adminAuth().getUserByEmail(email);
    await adminAuth().deleteUser(user.uid);
  } catch {
    // ignore if no Auth user
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
