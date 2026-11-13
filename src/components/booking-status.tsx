import type { BookingStatus } from "@/generated/prisma/enums";
import { Badge } from "./ui";

const LABELS: Record<BookingStatus, { label: string; tone: "neutral" | "accent" | "warn" }> = {
  REQUESTED: { label: "Awaiting payment", tone: "warn" },
  CONFIRMED: { label: "Confirmed", tone: "accent" },
  EXPIRED: { label: "Expired", tone: "neutral" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  ATTENDED: { label: "Attended", tone: "accent" },
  NO_SHOW: { label: "No-show", tone: "neutral" },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { label, tone } = LABELS[status];
  return <Badge tone={tone}>{label}</Badge>;
}

export const BOOKING_TYPE_LABELS = { SEAT: "Solo seat", GROUP: "Group", BUYOUT: "Buyout" } as const;
