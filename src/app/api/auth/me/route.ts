import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-server";

export const runtime = "nodejs";

export async function GET() {
  const me = await getSessionUser();
  if (!me) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  return NextResponse.json({ email: me.email, uid: me.uid, claims: me }, { status: 200 });
}