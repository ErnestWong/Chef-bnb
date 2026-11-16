import { formatMoney } from "@/lib/format";

/** What a venue takes for one open night. */
export type VenueTake = { venueSharePct: number; venueFeeCents: number; terms?: string | null };

/**
 * What the chef keeps from a full table before food costs: ticket sales less
 * the venue's share and flat fee. Covers takes no fee today. Never negative.
 */
export function netAtFullTable(take: VenueTake, priceCents: number, seats: number): number {
  const gross = Math.max(0, priceCents) * Math.max(0, seats);
  const share = Math.round((gross * take.venueSharePct) / 100);
  return Math.max(0, gross - share - take.venueFeeCents);
}

/** "25% of tickets + $150 · keeps the bar", in the board's mono line. */
export function describeVenueTake(take: VenueTake): string {
  const parts: string[] = [];
  if (take.venueSharePct > 0) parts.push(`${take.venueSharePct}% of tickets`);
  if (take.venueFeeCents > 0) parts.push(formatMoney(take.venueFeeCents));
  const money = parts.length ? parts.join(" + ") : "No cut of tickets";
  return take.terms?.trim() ? `${money} · ${take.terms.trim()}` : money;
}
