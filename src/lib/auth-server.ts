// src/lib/auth-server.ts
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase-admin";

const COOKIE_NAME = "session"; // change if your cookie name is different

export async function getSessionUser() {
  // Next 15: cookies() is async; Next 14: sync. `await` works in both.
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
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
