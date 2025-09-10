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

// --- roles (typed + normalized) ---
type SystemRole = "RegTechTeam" | "Manager" | "User";
type MaybeRole = string | undefined | null;

function normalizeRole(raw: MaybeRole): SystemRole | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim().toLowerCase();
  const map: Record<string, SystemRole> = {
    "regtechteam": "RegTechTeam",
    "manager": "Manager",
    "user": "User",
    // optional tolerant aliases (remove if you prefer strict data hygiene):
    "regtechtem": "RegTechTeam",
    "regtech tem": "RegTechTeam",
  };
  return map[s];
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

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    await setPersistence(auth, browserLocalPersistence);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") setError("Invalid email or password.");
      else if (code === "auth/user-not-found") setError("User not found.");
      else if (code === "auth/too-many-requests") setError("Too many attempts. Try again later.");
      else setError("Sign-in failed. Please try again.");
      throw e;
    }
  }, []);

  const logout = useCallback(async () => { await signOut(auth); }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
