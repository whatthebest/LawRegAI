// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERS = "users";

export async function GET() {
  try {
    const snap = await adminDb().ref(USERS).get();
    if (!snap.exists()) {
      return NextResponse.json([], {
        status: 200,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const raw = (snap.val() ?? {}) as Record<string, any>;
    const list = Object.entries(raw).map(([id, u]) => ({ id, ...u }));

    list.sort((a, b) =>
      String(a.fullname ?? "").localeCompare(String(b.fullname ?? ""), undefined, {
        sensitivity: "base",
      })
    );

    return NextResponse.json(list, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}