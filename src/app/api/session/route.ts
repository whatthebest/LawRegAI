// src/app/api/session/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { idToken } = await req.json();          // from client after signInWithEmailAndPassword / signInWithPopup
  if (!idToken) return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });

  const expiresIn = 1000 * 60 * 60 * 24 * 5;     // 5 days
  const sessionCookie = await adminAuth().createSessionCookie(idToken, { expiresIn });

  // Set cookie (Firebase Hosting-friendly name is __session)
  const res = NextResponse.json({ ok: true });
  (await cookies()).set({
    name: '__session',
    value: sessionCookie,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(expiresIn / 1000),
  });
  return res;
}

export async function DELETE() {
  // logout: clear cookie
  (await cookies()).set({
    name: '__session',
    value: '',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  return NextResponse.json({ ok: true });
}