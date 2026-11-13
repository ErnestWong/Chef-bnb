import "server-only";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import { hasRole } from "./roles";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  roles: Role[];
};

/**
 * Data Access Layer for the session. Reads the request cookie, so callers
 * must render inside a <Suspense> boundary (Cache Components rule).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Auth.js touches crypto before it reads the cookie; declare the render
  // dynamic first or Cache Components flags the random value during prerender.
  await connection();
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.email) return null;
  return { id: u.id, email: u.email, name: u.name ?? null, image: u.image ?? null, roles: u.roles ?? ["GUEST"] };
}

/** Redirects to sign-in (and back) when there is no session. */
export async function requireUser(returnTo?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(returnTo ? `/signin?callbackUrl=${encodeURIComponent(returnTo)}` : "/signin");
  }
  return user;
}

/** Like requireUser, but 404s when the role is missing (don't reveal the route). */
export async function requireRole(role: Role, returnTo?: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!hasRole(user.roles, role)) notFound();
  return user;
}
