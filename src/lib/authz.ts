import { getSessionUser } from "./auth-server";
import { adminDb } from "@/lib/firebase-admin"; // your Admin SDK db()

/** Require a valid session, else return null. */
export async function requireSession() {
  return await getSessionUser(); // decoded token or null
}

/** Read systemRole from RTDB by email (exactly your users tree). */
export async function getSystemRoleByEmail(email: string) {
  const snap = await adminDb()
    .ref("users")
    .orderByChild("email")
    .equalTo(email)
    .limitToFirst(1)
    .once("value");
  const val = snap.val() as Record<string, any> | null;
  if (!val) return null;
  const key = Object.keys(val)[0];
  return (val[key]?.systemRole as string) ?? null;
}

/** Authorization predicate: allow if custom claim OR allowed systemRole. */
export async function requireAdminLike(decoded: { email?: string; [k: string]: any } | null) {
  if (!decoded) return { ok: false as const, reason: "unauthenticated" };

  // A) custom claim
  if (decoded.isAdmin === true) return { ok: true as const };

  // B) DB role check
  if (decoded.email) {
    const role = await getSystemRoleByEmail(decoded.email);
    if (role && ["Manager", "RegTechTeam"].includes(role)) return { ok: true as const };
  }

  return { ok: false as const, reason: "forbidden" };
}
