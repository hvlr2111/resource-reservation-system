import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Keep this in sync with SESSION_COOKIE_NAME in src/lib/auth.ts.
// Proxy only checks that the cookie exists — it does not import Prisma/JWT helpers.
const SESSION_COOKIE_NAME = "session";

const publicPaths = new Set(["/login", "/register"]);

/**
 * Optimistic auth check: if there is no session cookie, send the user to /login.
 * Real authorization still happens in getCurrentUser() / requireUser() / requireAdmin().
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.has(pathname);
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (!isPublic && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Skip Next.js internals and common static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
