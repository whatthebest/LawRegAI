// src/lib/authz.ts
import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

export type Decoded = import('firebase-admin').auth.DecodedIdToken;

async function readSessionCookie(): Promise<string | undefined> {
  const jar = await cookies(); // <-- await the Promise overload
  return (
    jar.get('__session')?.value ??
    jar.get('session')?.value ??
    jar.get('id_token')?.value
  );
}

export async function requireSession(): Promise<Decoded> {
  const token = await readSessionCookie(); // <-- await here too
  if (!token) throw new Error('NO_SESSION');

  // If you use Firebase session cookies:
  return adminAuth().verifySessionCookie(token, true);
  // If you pass ID tokens instead, use: return adminAuth().verifyIdToken(token, true);
}

export async function requireAdminLike(decoded: Decoded): Promise<{ ok: boolean }> {
  const claims: any = decoded ?? {};

  const isAdminRole = (r: unknown) => {
    if (!r) return false;
    const norm = String(r).toLowerCase().replace(/[^a-z]/g, '');
    return norm === 'regtechteam' || norm === 'manager';
  };

  const claimRole = claims.systemRole ?? claims.role;
  if (claims.admin === true || isAdminRole(claimRole)) {
    return { ok: true };
  }

  const snap = await adminDb().ref(`users/${decoded.uid}`).get();
  const sysRole = snap.val()?.systemRole;
  return { ok: isAdminRole(sysRole) };
}
