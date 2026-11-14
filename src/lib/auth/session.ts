import "server-only";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/enums";
import { hasRole } from "./roles";

export type CurrentUser = {
  id: string;
  /** Null for guests who signed in by phone and never added one. Chefs always have one. */
  email: string | null;
  phone: string | null;
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
  if (!u?.id) return null;
  return { id: u.id, email: u.email ?? null, phone: u.phone ?? null, name: u.name ?? null, image: u.image ?? null, roles: u.roles ?? ["GUEST"] };
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

/**
 * For chef-only pages: anonymous → sign in; signed in without the CHEF role →
 * /chef, which explains where their application stands. Reads the session,
 * whose roles are refreshed from the database (src/auth.ts), so a chef approved
 * moments ago gets in without signing out.
 */
export async function requireChef(returnTo: string): Promise<CurrentUser> {
  const user = await requireUser(returnTo);
  if (!hasRole(user.roles, "CHEF")) redirect("/chef");
  return user;
}
