import Link from "next/link";
import { drinksLabel } from "@/lib/events/formats";
import { formatEventDay, formatEventTime, formatMoney } from "@/lib/format";
import { describeVenueTake, netAtFullTable } from "@/lib/nights/terms";
import { Badge } from "./ui";

export type NightCardData = {
  id: string;
  startsAt: Date;
  minSeats: number;
  maxSeats: number;
  venueSharePct: number;
  venueFeeCents: number;
  terms: string | null;
  suggestedPriceCents: number | null;
  venue: { name: string | null; description: string | null; kitchenNotes: string | null; hasBar: boolean; neighborhood: string };
};

const PITCH_LABELS: Record<string, { text: string; tone: "accent" | "warn" | "neutral" }> = {
  PENDING: { text: "Pitched · waiting", tone: "warn" },
  APPROVED: { text: "Yours", tone: "accent" },
  DECLINED: { text: "Declined", tone: "neutral" },
  WITHDRAWN: { text: "Withdrawn", tone: "neutral" },
};

/**
 * The chef-facing twin of the event card (brand guide, "Open nights"): place
 * and date in mono, what the kitchen has, what the venue takes, and what the
 * chef nets at a full table, because the money is what convinces a chef.
 */
export function NightCard({ night, href, pitchStatus }: { night: NightCardData; href?: string; pitchStatus?: string | null }) {
  const take = { venueSharePct: night.venueSharePct, venueFeeCents: night.venueFeeCents, terms: night.terms };
  const body = (
    <>
      <div className="flex items-center justify-between gap-3 bg-paper-2 px-5 py-3">
        <p className="font-mono text-xs uppercase tracking-wide">Open night</p>
        <p className="font-mono text-xs text-muted">
          {formatEventDay(night.startsAt)} · {formatEventTime(night.startsAt)}
        </p>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <p className="font-mono text-xs uppercase tracking-wide text-muted">
          {night.venue.neighborhood}
          {night.venue.name ? ` · ${night.venue.name}` : ""}
        </p>
        <h3 className="font-display text-2xl leading-tight group-hover:text-accent">{night.venue.description ?? "A room we've booked"}</h3>
        <p className="font-mono text-sm">
          {night.minSeats}–{night.maxSeats} seats · one long table · {night.venue.hasBar ? "bar on site" : drinksLabel(true)}
        </p>
        {night.venue.kitchenNotes && <p className="font-mono text-xs text-muted">{night.venue.kitchenNotes}</p>}
        <p className="font-mono text-xs text-muted">Venue: {describeVenueTake(take)}</p>
        {night.suggestedPriceCents !== null && (
          <p className="pt-1 text-sm">
            At {formatMoney(night.suggestedPriceCents)} a seat, a full table nets you about{" "}
            <span className="font-medium">{formatMoney(netAtFullTable(take, night.suggestedPriceCents, night.maxSeats))}</span>.
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 pt-3">
          {pitchStatus && PITCH_LABELS[pitchStatus] ? <Badge tone={PITCH_LABELS[pitchStatus].tone}>{PITCH_LABELS[pitchStatus].text}</Badge> : <span />}
          {href && <span className="text-sm font-medium text-accent">{pitchStatus && pitchStatus !== "WITHDRAWN" ? "View" : "Pitch this night"} →</span>}
        </div>
      </div>
    </>
  );
  const className = "group flex w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition";
  return href ? (
    <Link href={href} className={`${className} hover:border-accent`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
