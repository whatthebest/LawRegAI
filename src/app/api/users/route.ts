import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  const snap = await adminDb().ref("users").get();
  const val = snap.val() || {};
  const list = Object.entries(val).map(([id, u]) => ({ id, ...(u as any) }));
  return NextResponse.json(list, { status: 200 });
}