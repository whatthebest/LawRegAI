// src/app/login/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";

export default function LoginPage() {
  const { user, login, isLoading, error } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && user) router.replace(next);
  }, [user, isLoading, router, next]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email || !password) {
      setLocalError("Please enter email and password.");
      return;
    }
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      // redirect occurs via useEffect when user becomes non-null
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || user) {
    return <div className="h-screen w-screen bg-background" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm mx-auto shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="inline-block p-3 rounded-full bg-primary/10 mx-auto">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Compliance Standard & Assurance</CardTitle>
          <CardDescription>Please sign in to continue</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="username@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {(localError || error) && (
              <p className="text-sm text-red-600">{localError || error}</p>
            )}

            <InteractiveHoverButton
              type="submit"
              className="h-9 w-full flex items-center justify-center gap-2"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Log In"}
            </InteractiveHoverButton>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

