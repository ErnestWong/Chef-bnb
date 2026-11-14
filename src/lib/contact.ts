import { formatPhone } from "@/lib/auth/phone";

export type Contact = { name?: string | null; email?: string | null; phone?: string | null };

/** How to address someone in the UI: their name, else whatever they signed in with. */
export function displayName(c: Contact): string {
  return c.name?.trim() || c.email || (c.phone ? formatPhone(c.phone) : "Guest");
}

/** The way to reach them, for chefs and admins: email and phone when both exist. */
export function contactLine(c: Contact): string {
  const parts = [c.email, c.phone ? formatPhone(c.phone) : null].filter(Boolean);
  return parts.join(" · ") || "No contact details";
}
