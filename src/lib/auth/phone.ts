import { parsePhoneNumberFromString, type CountryCode } from "libphonenumber-js/min";

/** Numbers are stored and compared in E.164 (+12125551234). US is assumed when no country code is typed. */
export const DEFAULT_COUNTRY: CountryCode = "US";

/**
 * Turn whatever someone typed ("(212) 555-1234", "212.555.1234", "+44 7700 900123")
 * into E.164, or null when it isn't a possible number anywhere.
 */
export function normalizePhone(input: string, country: CountryCode = DEFAULT_COUNTRY): string | null {
  const parsed = parsePhoneNumberFromString(input.trim(), country);
  if (!parsed || !parsed.isPossible()) return null;
  return parsed.number;
}

/**
 * Countries a login code may be texted to. Covers is a New York product, and
 * SMS pumping fraud (bots requesting codes to premium or foreign numbers that
 * pay the attacker per text) lives almost entirely outside them. Other +1
 * countries (Dominican Republic, Jamaica, ...) share the calling code, so the
 * check is by country, not by "+1".
 */
export const SIGN_IN_COUNTRIES: readonly CountryCode[] = ["US", "CA"];

/** True when a normalized number may receive a login code: US or Canadian, valid, not a premium-rate 900 number. */
export function isSignInPhone(e164: string): boolean {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed || !parsed.isValid() || !parsed.country || !SIGN_IN_COUNTRIES.includes(parsed.country)) return false;
  return !parsed.nationalNumber.startsWith("900");
}

/** "+12125551234" → "(212) 555-1234" for US numbers, international format elsewhere. */
export function formatPhone(e164: string): string {
  const parsed = parsePhoneNumberFromString(e164);
  if (!parsed) return e164;
  return parsed.country === DEFAULT_COUNTRY ? parsed.formatNational() : parsed.formatInternational();
}

/** "+12125551234" → "•••• 1234": enough for "is this me?" on a confirmation screen, no more. */
export function maskPhone(e164: string): string {
  return `•••• ${e164.slice(-4)}`;
}

/** Login codes are six digits; strip spaces people paste in. */
export function normalizeCode(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** Parse ADMIN_PHONES ("+12125551234, +1 917 555 0100") into a set of E.164 numbers. */
export function parseAdminPhones(value: string | undefined): Set<string> {
  const out = new Set<string>();
  for (const raw of (value ?? "").split(",")) {
    const n = raw.trim() && normalizePhone(raw);
    if (n) out.add(n);
  }
  return out;
}
