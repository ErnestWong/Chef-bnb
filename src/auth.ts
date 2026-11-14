import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { z } from "zod";
import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/db";
import { DEV_PROVIDER_ID, isDevLoginEnabled } from "@/lib/auth/dev-login";
import { normalizeEmail, parseAdminEmails, rolesForSignIn } from "@/lib/auth/roles";

const devCredentials = z.object({
  email: z.email().transform(normalizeEmail),
  name: z.string().trim().max(80).optional(),
});

class DevLoginDisabled extends CredentialsSignin {
  code = "dev_login_disabled";
}

/**
 * Placeholder sign-in: any email, no password. Creates the user on first use
 * and applies ADMIN_EMAILS. Replaced by Google OAuth once checklist item 4 is
 * done — add the Google provider here; the callbacks stay the same.
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
    const admins = parseAdminEmails(process.env.ADMIN_EMAILS);
    const existing = await db.user.findUnique({ where: { email } });
    const roles = rolesForSignIn(email, existing?.roles ?? [], admins);
    const user = existing
      ? await db.user.update({
          where: { id: existing.id },
          data: { roles, name: existing.name ?? name ?? null },
        })
      : await db.user.create({
          data: { email, name: name || email.split("@")[0], roles, emailVerified: new Date() },
        });

    return { id: user.id, email: user.email, name: user.name, image: user.image, roles: user.roles };
  },
});

if (process.env.VERCEL_ENV === "production" && process.env.AUTH_DEV_LOGIN === "true") {
  console.warn("[auth] AUTH_DEV_LOGIN=true in production: anyone can sign in as any email. Unset it before real users arrive.");
}

/** Roles live in the JWT; re-read them from the database this often so an approval shows up without re-login. */
const ROLE_REFRESH_MS = 2 * 60 * 1000;

// Config is built per request so nothing touches the database at build time.
export const { handlers, auth, signIn, signOut } = NextAuth(
  (): NextAuthConfig => ({
    ...authConfig,
    adapter: PrismaAdapter(getDb()),
    providers: [...(isDevLoginEnabled() ? [devProvider] : [])],
    callbacks: {
      ...authConfig.callbacks,
      async jwt(params) {
        const token = await authConfig.callbacks.jwt(params);
        const checkedAt = (token.rolesCheckedAt as number | undefined) ?? 0;
        if (params.user) {
          token.rolesCheckedAt = Date.now();
        } else if (token.id && Date.now() - checkedAt > ROLE_REFRESH_MS) {
          const fresh = await getDb().user.findUnique({ where: { id: token.id as string }, select: { roles: true } });
          if (fresh) token.roles = fresh.roles;
          token.rolesCheckedAt = Date.now();
        }
        return token;
      },
    },
  }),
);
