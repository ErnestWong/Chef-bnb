import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/db";
import { DEV_PROVIDER_ID, isDevLoginEnabled } from "@/lib/auth/dev-login";
import { PHONE_PROVIDER_ID } from "@/lib/auth/phone-provider";
import { normalizeCode, normalizePhone } from "@/lib/auth/phone";
import { normalizeEmail, parseAdmins, rolesForSignIn } from "@/lib/auth/roles";
import { getVerifier, isPhoneSignInEnabled } from "@/lib/sms/verify";

/** What authorize() hands to the JWT callback. */
function sessionUser(user: { id: string; email: string | null; phone: string | null; name: string | null; image: string | null; roles: ("GUEST" | "CHEF" | "ADMIN")[] }) {
  return { id: user.id, email: user.email, phone: user.phone, name: user.name, image: user.image, roles: user.roles };
}

const phoneCredentials = z.object({
  phone: z.string().transform((v) => normalizePhone(v)),
  code: z.string().transform((v) => normalizeCode(v)),
});

class PhoneSignInDisabled extends CredentialsSignin {
  code = "phone_signin_disabled";
}
class WrongCode extends CredentialsSignin {
  code = "wrong_code";
}

/**
 * Phone sign-in: the server action sent a code through the verifier; here we
 * check it, then find or create the user by phone. Admin comes from
 * ADMIN_PHONES. A guest who later applies to host adds an email then.
 */
const phoneProvider = Credentials({
  id: PHONE_PROVIDER_ID,
  name: "Phone",
  credentials: {
    phone: { label: "Phone", type: "tel" },
    code: { label: "Code", type: "text" },
  },
  async authorize(raw) {
    if (!isPhoneSignInEnabled()) throw new PhoneSignInDisabled();
    const parsed = phoneCredentials.safeParse(raw);
    if (!parsed.success || !parsed.data.phone || !parsed.data.code) throw new WrongCode();
    const { phone, code } = parsed.data;
    if (!(await getVerifier().check(phone, code))) throw new WrongCode();

    const db = getDb();
    const admins = parseAdmins();
    const existing = await db.user.findUnique({ where: { phone } });
    const roles = rolesForSignIn({ phone, email: existing?.email }, existing?.roles ?? [], admins);
    const user = existing
      ? await db.user.update({ where: { id: existing.id }, data: { roles, phoneVerifiedAt: existing.phoneVerifiedAt ?? new Date() } })
      : await db.user.create({ data: { phone, phoneVerifiedAt: new Date(), roles } });
    return sessionUser(user);
  },
});

const devCredentials = z.object({
  email: z.email().transform(normalizeEmail),
  name: z.string().trim().max(80).optional(),
});

class DevLoginDisabled extends CredentialsSignin {
  code = "dev_login_disabled";
}

/**
 * Placeholder email sign-in: any email, no password. Creates the user on first
 * use and applies ADMIN_EMAILS. On in development and previews only; it is how
 * the seeded chef and admin accounts are reached. Replace with Google or an
 * emailed code when chefs need an email-based sign-in in production.
 */
const devProvider = Credentials({
  id: DEV_PROVIDER_ID,
  name: "Email (development)",
  credentials: {
    email: { label: "Email", type: "email" },
    name: { label: "Name", type: "text" },
  },
  async authorize(raw) {
    if (!isDevLoginEnabled()) throw new DevLoginDisabled();
    const parsed = devCredentials.safeParse(raw);
    if (!parsed.success) return null;
    const { email, name } = parsed.data;

    const db = getDb();
    const admins = parseAdmins();
    const existing = await db.user.findUnique({ where: { email } });
    const roles = rolesForSignIn({ email, phone: existing?.phone }, existing?.roles ?? [], admins);
    const user = existing
      ? await db.user.update({
          where: { id: existing.id },
          data: { roles, name: existing.name ?? name ?? null },
        })
      : await db.user.create({
          data: { email, name: name || email.split("@")[0], roles, emailVerified: new Date() },
        });
    return sessionUser(user);
  },
});

if (process.env.VERCEL_ENV === "production" && process.env.AUTH_DEV_LOGIN === "true") {
  console.warn("[auth] AUTH_DEV_LOGIN=true in production: anyone can sign in as any email. Unset it before real users arrive.");
}

/** Roles live in the JWT; re-read them from the database this often so an approval shows up without re-login. */
const ROLE_REFRESH_MS = 2 * 60 * 1000;

// Config is built per request so nothing touches the database at build time.
export const { handlers, auth, signIn, signOut, unstable_update: updateSession } = NextAuth(
  (): NextAuthConfig => ({
    ...authConfig,
    adapter: PrismaAdapter(getDb()),
    providers: [...(isPhoneSignInEnabled() ? [phoneProvider] : []), ...(isDevLoginEnabled() ? [devProvider] : [])],
    callbacks: {
      ...authConfig.callbacks,
      async jwt(params) {
        const token = await authConfig.callbacks.jwt(params);
        // updateSession({ user: { name } }) from a server action: the name step after phone sign-in.
        if (params.trigger === "update") {
          const next = (params.session as { user?: { name?: string } } | undefined)?.user?.name;
          if (next) token.name = next;
        }
        const checkedAt = (token.rolesCheckedAt as number | undefined) ?? 0;
        if (params.user) {
          token.rolesCheckedAt = Date.now();
        } else if (token.id && Date.now() - checkedAt > ROLE_REFRESH_MS) {
          // Roles, email and name can change without a new sign-in (approval, adding an email on the chef application).
          const fresh = await getDb().user.findUnique({ where: { id: token.id as string }, select: { roles: true, email: true, phone: true, name: true } });
          if (fresh) {
            token.roles = fresh.roles;
            token.email = fresh.email;
            token.phone = fresh.phone;
            token.name = fresh.name;
          }
          token.rolesCheckedAt = Date.now();
        }
        return token;
      },
    },
  }),
);
