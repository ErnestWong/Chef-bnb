/** Auth.js provider id for phone + code sign-in (src/auth.ts). Kept DB-free so client code can import it. */
export const PHONE_PROVIDER_ID = "phone";

/** Cookie that carries the number between "send me a code" and "here's the code". */
export const PENDING_PHONE_COOKIE = "covers_signin_phone";

/** How long a sent code is good for on our side; Twilio Verify's own window is 10 minutes. */
export const PENDING_PHONE_MAX_AGE_SECONDS = 10 * 60;
