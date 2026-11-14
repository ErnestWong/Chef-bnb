/** Site-wide constants that pages and emails share. */
export const SITE_NAME = "Covers";

/** Where people reach a human. Unset until a mailbox exists (checklist item 9). */
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || null;

/** Date shown at the top of the terms and privacy pages. Bump when their text changes. */
export const POLICIES_UPDATED = "2026-11-14";
