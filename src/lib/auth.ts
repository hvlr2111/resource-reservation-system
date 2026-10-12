import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

/** Cookie that holds the signed session JWT. Must match the name checked in proxy.ts. */
export const SESSION_COOKIE_NAME = "session";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type SessionPayload = {
  userId: string;
};

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

function getEncodedSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be set to a value at least 32 characters long.");
  }
  return new TextEncoder().encode(secret);
}

/** Sign a JWT that identifies the logged-in user. */
export async function signSession(userId: string) {
  return new SignJWT({ userId } satisfies SessionPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedSecret());
}

/** Verify the JWT and return the payload, or null if missing/invalid. */
export async function readSession(): Promise<SessionPayload | null> {
  const secret = getEncodedSecret();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    const userId = payload.userId;
    if (typeof userId !== "string") return null;
    return { userId };
  } catch {
    return null;
  }
}

/** Store the signed JWT in an httpOnly cookie (set this from a Server Action). */
export async function createSession(userId: string) {
  const token = await signSession(userId);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Clear the session cookie (call from a Server Action). */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

/**
 * Reload the user from the DB on each request so role changes and deleted
 * accounts take effect immediately; React cache only deduplicates within a request.
 * Returns null when there is no valid session. Wrapped in React cache()
 * so layout + page can call this in the same request without a second query.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
});

/** Use in pages and Server Actions that require a logged-in user. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in pages and Server Actions that only admins may call. */
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    redirect("/resources");
  }
  return user;
}
