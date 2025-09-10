// src/app/api/session/login/route.ts
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase-admin";

export const runtime = "nodejs";

const COOKIE = "session";
const EXPIRES_IN_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

export async function POST(req: NextRequest) {
  const { idToken } = await req.json().catch(() => ({}));
  if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 400 });

  try {
    const sessionCookie = await adminAuth().createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN_MS,
    });
    const isProd = process.env.NODE_ENV === "production";
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: COOKIE,
      value: sessionCookie,
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: EXPIRES_IN_MS / 1000,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }
}