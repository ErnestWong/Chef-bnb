import type { Role } from "@/generated/prisma/enums";
import { hasRole } from "@/lib/auth/roles";
import type { Actor } from "./transitions";

export type Principal = { id: string; roles: readonly Role[] };

/**
 * Which actor a signed-in user is for a given booking. Admins act as admin;
 * the event's chef acts as chef; the booking's guest acts as guest. Anyone
 * else gets null and may not touch the booking at all.
 */
export function actorFor(
  user: Principal,
  booking: { guestUserId: string },
  event: { chefUserId: string },
): Actor | null {
  if (hasRole(user.roles, "ADMIN")) return "admin";
  if (user.id === event.chefUserId && hasRole(user.roles, "CHEF")) return "chef";
  if (user.id === booking.guestUserId) return "guest";
  return null;
}
