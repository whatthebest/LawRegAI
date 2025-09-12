// src/lib/auth-server.ts
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

const COOKIE_NAMES = ["__session", "session", "id_token"]; // accept any of these

export async function getSessionUser() {
  // Next 15: cookies() is async; Next 14: sync. `await` works in both.
  const store = await cookies();
  const token =
    store.get("__session")?.value ||
    store.get("session")?.value ||
    store.get("id_token")?.value ||
    undefined;
  if (!token) return null;

  try {
    // Safer: reject revoked sessions
    const decoded = await adminAuth().verifySessionCookie(token, true);
    // decoded contains: { uid, email, ...custom claims }
    return decoded;
  } catch {
    return null;
  }
}
