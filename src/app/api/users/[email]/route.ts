import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { profileSchema } from "../../users/_schema";

const USERS = "users";

async function findByEmail(email: string) {
  const q = adminDb().ref(USERS).orderByChild("email").equalTo(email);
  const snap = await q.get();
  if (!snap.exists()) return null;
  const [id, data] = Object.entries(snap.val())[0] as [string, any];
  return { id, data };
}

export async function GET(_: Request, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);
  const found = await findByEmail(email);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ id: found.id, ...found.data }, { status: 200 });
}

export async function PUT(req: Request, { params }: { params: { email: string } }) {
  const email = decodeURIComponent(params.email);
  const body = await req.json();
  const parsed = profileSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const found = await findByEmail(email);
  if (!found) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // sync claims if systemRole or role changed
  const uid = found.id;
  const old = found.data;
  if (parsed.data.systemRole !== old.systemRole || parsed.data.role !== old.role) {
    await adminAuth().setCustomUserClaims(uid, {
      systemRole: parsed.data.systemRole,
      workflowRole: parsed.data.role,
    });
  }

  await adminDb().ref(`${USERS}/${uid}`).update(parsed.data);
  return NextResponse.json({ id: uid, ...parsed.data }, { status: 200 });
}
