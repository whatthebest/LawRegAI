// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb, adminAuth } from "@/lib/firebase-admin"; // <- must export both

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERS = "users";

/* ===== enums must match your UI ===== */
const departments   = ["Operations", "Engineering", "HR"] as const;
const roles         = ["Owner", "Reviewer", "Approver"] as const;          // workflow role
const systemRoles   = ["RegTechTeam", "Manager", "User"] as const;         // RBAC

/* ===== helper: "" -> undefined for optionals ===== */
const emptyToUndef = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

/* ===== optional extras (matches your chat schema) ===== */
const profileExtrasSchema = z.object({
  employeeId:     emptyToUndef(z.string().min(1).max(20).regex(/^[A-Za-z0-9._-]+$/)).optional(),
  contactNumber:  emptyToUndef(z.string().regex(/^[0-9+\-\s().]{7,20}$/)).optional(),
  cluster:        emptyToUndef(z.string().min(1).max(120)).optional(),
  businessUnit:   emptyToUndef(z.string().min(1).max(120)).optional(),
  team:           emptyToUndef(z.string().min(1).max(120)).optional(),
  managerName:    emptyToUndef(z.string().min(1).max(120)).optional(),
  managerEmail:   emptyToUndef(z.string().email()).optional(),
  groupTh:        emptyToUndef(z.string().min(1).max(120)).optional(),
});

/* ===== incoming payload ===== */
const newUserSchema = z.object({
  fullname:   z.string().min(1),
  email:      z.string().email(),
  password:   emptyToUndef(z.string().min(6)).optional(), // provide to create Auth account
  department: z.enum(departments),
  systemRole: z.enum(systemRoles),
  role:       z.enum(roles), // <-- keep key name "role" (matches your form)
}).and(profileExtrasSchema);

/* ===================== GET /api/users ===================== */
export async function GET() {
  try {
    const snap = await adminDb().ref(USERS).get();
    if (!snap.exists()) {
      return NextResponse.json([], { status: 200, headers: { "Cache-Control": "no-store" } });
    }
    const raw = (snap.val() ?? {}) as Record<string, any>;
    const list = Object.entries(raw).map(([id, u]) => ({ id, ...u }));
    list.sort((a, b) =>
      String(a.fullname ?? "").localeCompare(String(b.fullname ?? ""), undefined, { sensitivity: "base" })
    );
    return NextResponse.json(list, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("GET /api/users failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/* ===================== POST /api/users ===================== */
export async function POST(req: Request) {
  try {
    // 1) validate payload (shows precise errors to the client)
    const body = await req.json();
    const data = newUserSchema.parse(body);

    // 2) create/reuse Auth user if password provided
    let uid: string;
    if (data.password) {
      try {
        const rec = await adminAuth().createUser({
          email: data.email,
          password: data.password,
          displayName: data.fullname,
        });
        uid = rec.uid;
      } catch (e: any) {
        // surface common Firebase error codes clearly
        if (e?.code) {
          // e.g. auth/email-already-exists, auth/invalid-password
          return NextResponse.json({ error: e.code }, { status: 400 });
        }
        return NextResponse.json({ error: e?.message || "Auth error" }, { status: 400 });
      }
    } else {
      // DB-only profile (not usually used in your UI, but supported)
      uid = adminDb().ref().push().key as string;
    }

    // 3) write profile to RTDB (never store password)
    const { password, ...profile } = data;
    await adminDb().ref(`${USERS}/${uid}`).set({
      ...profile,
      uid,
      createdAt: Date.now(),
    });

    return NextResponse.json({ id: uid }, { status: 201 });
  } catch (err: any) {
    // Zod validation errors
    if (err?.issues) {
      const details = err.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: details }, { status: 400 });
    }
    console.error("POST /api/users failed:", err);
    return NextResponse.json({ error: err?.message || "Internal error" }, { status: 500 });
  }
}
