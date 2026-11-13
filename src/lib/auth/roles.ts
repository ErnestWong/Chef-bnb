import type { Role } from "@/generated/prisma/enums";

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

/**
 * Roles a user should hold after signing in. Everyone is a GUEST; ADMIN comes
 * from ADMIN_EMAILS; CHEF is only ever granted by admin approval (M3), so an
 * existing CHEF role is kept but never added here.
 */
export function rolesForSignIn(
  email: string,
  existingRoles: readonly Role[],
  adminEmails: ReadonlySet<string>,
): Role[] {
  const roles = new Set<Role>(existingRoles);
  roles.add("GUEST");
  if (adminEmails.has(normalizeEmail(email))) {
    roles.add("ADMIN");
  }
  // Stable order for comparisons and display.
  return (["GUEST", "CHEF", "ADMIN"] as const).filter((r) => roles.has(r));
}

export function hasRole(roles: readonly Role[] | undefined, role: Role): boolean {
  return roles?.includes(role) ?? false;
}
