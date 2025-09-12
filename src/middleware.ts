// src/middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Accept any of these cookie names as a valid session indicator
const COOKIE_NAMES = ["__session", "session", "id_token"] as const;
const PROTECTED = ["/admin"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const needsAuth = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
  if (!needsAuth) return NextResponse.next();

  const hasSession = COOKIE_NAMES.some((name) => Boolean(req.cookies.get(name)?.value));
  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
