import type { NextAuthConfig } from "next-auth";
import type { Role } from "@/generated/prisma/enums";

/**
 * Auth.js config shared by the app (src/auth.ts, with providers + adapter)
 * and the proxy (src/proxy.ts), which only needs to decode the session JWT.
 * Keep this file free of database imports.
 */
export const authConfig = {
  pages: { signIn: "/signin" },
  // JWT sessions: required by the Credentials-based dev sign-in, and keeps the
  // proxy's optimistic check free of database reads. Google (later) works with
  // JWT too; the Prisma adapter then stores the OAuth account link.
  // A year of "stay signed in": the cookie is refreshed on any visit after a day, so regulars never see the code screen again.
  session: { strategy: "jwt", maxAge: 365 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      // `user` is only present on sign-in; roles come from authorize()/adapter.
      if (user) {
        token.id = user.id;
        token.roles = (user as { roles?: Role[] }).roles ?? ["GUEST"];
        token.phone = (user as { phone?: string | null }).phone ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = (token.id as string | undefined) ?? session.user.id;
      session.user.roles = (token.roles as Role[] | undefined) ?? ["GUEST"];
      session.user.phone = (token.phone as string | null | undefined) ?? null;
      return session;
    },
  },
} satisfies NextAuthConfig;
