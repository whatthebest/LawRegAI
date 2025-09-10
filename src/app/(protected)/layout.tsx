// src/app/(protected)/layout.tsx
"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!isLoading && !user) router.replace(`/login?next=${encodeURIComponent(path)}`);
  }, [isLoading, user, router, path]);

  if (isLoading || !user) return <div className="min-h-screen bg-background" />;
  return <>{children}</>;
}
