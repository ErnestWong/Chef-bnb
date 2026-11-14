import type { Role } from "@/generated/prisma/enums";
import { parseAdminPhones } from "./phone";

/** Parse ADMIN_EMAILS ("a@x.com, b@y.com") into a normalized set. */
export function parseAdminEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((e) => normalizeEmail(e))
      .filter(Boolean),
  );
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type AdminList = { emails: ReadonlySet<string>; phones: ReadonlySet<string> };

export function parseAdmins(env: Record<string, string | undefined> = process.env): AdminList {
  return { emails: parseAdminEmails(env.ADMIN_EMAILS), phones: parseAdminPhones(env.ADMIN_PHONES) };
}

/**
 * Roles a user should hold after signing in. Everyone is a GUEST; ADMIN comes
 * from ADMIN_EMAILS / ADMIN_PHONES; CHEF is only ever granted by admin approval
 * (M3), so an existing CHEF role is kept but never added here.
 */
export function rolesForSignIn(
  identity: { email?: string | null; phone?: string | null },
  existingRoles: readonly Role[],
  admins: AdminList,
): Role[] {
  const roles = new Set<Role>(existingRoles);
  roles.add("GUEST");
  if (identity.email && admins.emails.has(normalizeEmail(identity.email))) roles.add("ADMIN");
  if (identity.phone && admins.phones.has(identity.phone)) roles.add("ADMIN");
  // Stable order for comparisons and display.
  return (["GUEST", "CHEF", "ADMIN"] as const).filter((r) => roles.has(r));
}

export function hasRole(roles: readonly Role[] | undefined, role: Role): boolean {
  return roles?.includes(role) ?? false;
}
