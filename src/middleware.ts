import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { roleHome } from "@/lib/utils";
import { Role } from "@prisma/client";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role as Role | undefined;

  const isAuthPage = pathname.startsWith("/login");
  const isPublic =
    isAuthPage ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/push/cron") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js";

  if (isPublic) {
    if (isLoggedIn && isAuthPage && role) {
      return NextResponse.redirect(new URL(roleHome(role), req.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const login = new URL("/login", req.url);
    login.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(login);
  }

  if (pathname.startsWith("/admin") && role !== Role.ADMIN) {
    return NextResponse.redirect(new URL(roleHome(role!), req.url));
  }
  if (pathname.startsWith("/psychiatrist") && role !== Role.PSYCHIATRIST && role !== Role.ADMIN) {
    return NextResponse.redirect(new URL(roleHome(role!), req.url));
  }
  if (pathname.startsWith("/therapist") && role !== Role.THERAPIST && role !== Role.ADMIN) {
    return NextResponse.redirect(new URL(roleHome(role!), req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
