import { NextResponse } from "next/server";

export const runtime = "nodejs";

const COOKIE = "session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}