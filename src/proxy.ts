import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { hasRole } from "@/lib/auth/roles";

/**
 * Optimistic route protection: decodes the session JWT (no database) and
 * redirects anonymous visitors to sign in. Role checks here are a convenience;
 * pages re-check through src/lib/auth/session.ts, which is the real gate.
 */
const { auth } = NextAuth(authConfig);

function safeCallback(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/account";
}

export default auth((req) => {
  const { pathname, search, searchParams } = req.nextUrl;
  const session = req.auth;

  if (pathname === "/signin") {
    // Already signed in: skip the form.
    return session?.user
      ? NextResponse.redirect(new URL(safeCallback(searchParams.get("callbackUrl")), req.nextUrl))
      : NextResponse.next();
  }

  if (!session?.user) {
    const signIn = new URL("/signin", req.nextUrl);
    signIn.searchParams.set("callbackUrl", pathname + search);
    return NextResponse.redirect(signIn);
  }

  if (pathname.startsWith("/admin") && !hasRole(session.user.roles, "ADMIN")) {
    return NextResponse.rewrite(new URL("/not-found", req.nextUrl), { status: 404 });
  }
  if (pathname.startsWith("/chef") && pathname !== "/chef/apply" && !hasRole(session.user.roles, "CHEF")) {
    return NextResponse.redirect(new URL("/account?notice=not-a-chef", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/signin", "/admin/:path*", "/chef/:path*", "/account/:path*", "/bookings/:path*", "/events/:id/book"],
};
