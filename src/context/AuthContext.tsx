"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, app } from "@/lib/firebase-client";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import type { User } from "@/lib/types";
import { useRouter } from 'next/navigation';

// --- roles (typed + normalized) ---
type SystemRole = "RegTechTeam" | "Manager" | "User";
type MaybeRole = string | undefined | null;

function normalizeRole(raw: MaybeRole): SystemRole | undefined {
  if (!raw) return undefined;
  // Tolerant normalization: keep only letters, lowercased
  const norm = String(raw).toLowerCase().replace(/[^a-z]/g, "");
  const map: Record<string, SystemRole> = {
    regtechteam: "RegTechTeam",
    manager: "Manager",
    user: "User",
  };
  return map[norm];
}

async function loadProfileRTDB(u: FirebaseUser) {
  try {
    const db = getDatabase(app); // use the same app as firebase-client.ts
    const snap = await get(ref(db, `users/${u.uid}`));
    return snap.exists() ? (snap.val() as any) : null;
  } catch (e) {
    console.debug("loadProfileRTDB error:", e);
    return null;
  }
}

async function loadRoleFromClaims(u: FirebaseUser) {
  try {
    const tok = await u.getIdTokenResult(true);
    return (tok?.claims?.systemRole as string | undefined) ?? undefined;
  } catch {
    return undefined;
  }
}

function toAppUser(u: FirebaseUser, profile?: any, claimRole?: string): User {
  const roleFromProfile = profile?.systemRole ?? profile?.role ?? profile?.Role;
  return {
    name: profile?.fullname ?? u.displayName ?? (u.email ? u.email.split("@")[0]! : ""),
    email: u.email ?? "",
    department: profile?.department ?? profile?.Department,
    systemRole: normalizeRole(roleFromProfile ?? claimRole),
  };
}

type Ctx = {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<Ctx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setIsLoading(true);
      try {
        if (!u) {
          setUser(null);
          return;
        }
        // Load both in parallel; whichever yields the role will be used
        const [profile, claimRole] = await Promise.all([
          loadProfileRTDB(u),
          loadRoleFromClaims(u),
        ]);
        const appUser = toAppUser(u, profile, claimRole);
        console.debug("AuthContext user:", appUser); // TEMP: verify systemRole
        setUser(appUser);
      } finally {
        setIsLoading(false);
      }
    });
    return unsub;
  }, []);

  const router = useRouter();

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    await setPersistence(auth, browserLocalPersistence);
    try {
      // 1) Firebase client sign-in
      await signInWithEmailAndPassword(auth, email, password);

      // 2) Force-refresh ID token so custom claims are present
      const idToken = await auth.currentUser?.getIdToken(true);
      if (!idToken) throw new Error('No idToken after sign-in');

      // 3) Ask server to set httpOnly session cookie (__session)
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error('Failed to create server session');

      // 4) Navigate to admin (hard reload ensures server sees cookie on first render)
        router.replace('/');        // smooth, no full reload
        router.refresh();           // ensures server components see the new cookie
      // or: router.replace('/admin');
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') setError('Invalid email or password.');
      else if (code === 'auth/user-not-found') setError('User not found.');
      else if (code === 'auth/too-many-requests') setError('Too many attempts. Try again later.');
      else setError('Sign-in failed. Please try again.');
      throw e;
    }
  }, [router]);

  const logout = useCallback(async () => {
    // Clear server cookie first, then Firebase client
    await fetch('/api/session', { method: 'DELETE' }).catch(() => {});
    await signOut(auth).catch(() => {});
    router.replace('/login');
    router.refresh();
    // or: router.replace('/login');
  }, [router]);


  // ✅ Missing part: return the provider and close the function
  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
} // <— closes AuthProvider

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
