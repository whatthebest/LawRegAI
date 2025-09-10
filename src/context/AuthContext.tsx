"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { auth } from "@/lib/firebase-client";
import {
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";
import type { User } from "@/lib/types"; // { name: string; email: string; department?: string }

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// OPTIONAL: load extra profile from RTDB (adjust the path/field names if yours differ)
async function loadProfile(u: FirebaseUser): Promise<any | null> {
  try {
    const db = getDatabase();
    const snap = await get(ref(db, `users/${u.uid}`)); // e.g. { fullname, department, role, ... }
    return snap.exists() ? snap.val() : null;
  } catch {
    return null;
  }
}

// Map Firebase user + profile to your app's User shape
function toAppUser(u: FirebaseUser, profile?: any): User {
  return {
    name: profile?.fullname ?? u.displayName ?? (u.email ? u.email.split("@")[0]! : ""),
    email: u.email ?? "",
    department: profile?.department ?? profile?.Department, // tolerate either key
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      try {
        if (u) {
          const profile = await loadProfile(u);      // remove if you don't store profiles
          setUser(toAppUser(u, profile));            // or setUser({ name: ..., email: ..., department: ... })
        } else {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    });
    return unsub;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      // Redirect happens in your page after user becomes non-null
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === "auth/invalid-credential" || code === "auth/wrong-password") {
        setError("Invalid email or password.");
      } else if (code === "auth/user-not-found") {
        setError("User not found.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many attempts. Try again later.");
      } else {
        setError("Sign-in failed. Please try again.");
      }
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

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
