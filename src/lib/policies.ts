import { RULES } from "@/lib/bookings/rules";

/**
 * The house rules every dinner runs under (docs/strategy.md, Legal posture).
 * Built from RULES so the numbers on the terms page, the booking form and the
 * chef pitch can't drift from what the code enforces.
 */
export const HOUSE_RULES = [
  {
    id: "table",
    title: "One table, one seating",
    body: `Everyone sits at one table and starts together, and the chef comes out to the room. A dinner at a chef's home seats at most ${RULES.MAX_HOME_GUESTS} guests; a room seats what the venue holds. Solo seats, groups of up to ${RULES.GROUP_CAP}, or a buyout of the whole table.`,
  },
  {
    id: "byob",
    title: "Chefs never sell drinks",
    body: "Alcohol is never sold by the chef or folded into the ticket price. At a chef's home it's BYOB. In a room, the listing says whether it's BYOB or the venue's own licensed bar is open.",
  },
  {
    id: "together",
    title: "Friends who book together sit together",
    body: "A group booking is seated as one. The rest of the table is other guests: solo bookers and other groups.",
  },
  {
    id: "pay-the-chef",
    title: "You pay the chef directly",
    body: `Nothing is charged on the site. The chef confirms your seat once you've paid them; unpaid requests expire after ${RULES.REQUEST_EXPIRY_HOURS} hours.`,
  },
  {
    id: "address",
    title: "The address stays private until it matters",
    body: `Public pages show the neighborhood. Confirmed guests get the exact address by email ${RULES.ADDRESS_REVEAL_HOURS} hours before the dinner.`,
  },
  {
    id: "minimum",
    title: "Dinners need their minimum",
    body: `If a dinner hasn't reached the chef's minimum ${RULES.GO_NO_GO_HOURS} hours before it starts, it's cancelled and everyone is told.`,
  },
] as const;

/** One-line version for the point of booking. */
export const HOUSE_RULES_SHORT = `One table, BYOB unless the venue's bar is open, and you pay the chef directly.`;
