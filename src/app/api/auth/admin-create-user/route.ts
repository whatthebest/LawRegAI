import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { createUserWithPasswordSchema } from "../../users/_schema";

export const runtime = "nodejs";           // IMPORTANT: Admin SDK needs Node runtime
export const dynamic = "force-dynamic";    // avoid caching issues during dev

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate payload
    const parsed = createUserWithPasswordSchema.safeParse(body);
    if (!parsed.success) {
      // Return Zod errors to the client so you can see exactly which field failed
      return NextResponse.json(
        { code: "validation_error", error: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { password, mustChangePassword, ...profile } = parsed.data;

    // Create Auth user (email+password)
    const user = await adminAuth().createUser({
      email: profile.email,
      password,
      emailVerified: false,
      disabled: false,
    });

    // Custom claims for permissions / visibility
    await adminAuth().setCustomUserClaims(user.uid, {
      systemRole: profile.systemRole,
      workflowRole: profile.role,
      mustChangePassword: !!mustChangePassword,
    });

    // Save profile to Realtime DB
    await adminDb().ref(`users/${user.uid}`).set({
      uid: user.uid,
      ...profile,        // includes your optional extras
      createdAt: Date.now(),
    });

    return NextResponse.json({ uid: user.uid }, { status: 201 });
  } catch (err: any) {
    // Firebase Admin errors often have .code/.errorInfo
    const code =
      err?.code || err?.errorInfo?.code || "unknown";
    const message =
      err?.message || err?.errorInfo?.message || "Unknown error";

    // Log on server for debugging
    console.error("admin-create-user error:", code, message, err);

    // Send clear details to client
    // Common codes: auth/email-already-exists, auth/invalid-password, auth/invalid-email,
    // invalid-argument (missing env vars), app/invalid-credential (bad service account)
    return NextResponse.json({ code, error: message }, { status: 500 });
  }
}
