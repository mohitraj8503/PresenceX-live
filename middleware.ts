import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets, public pages, and the login endpoint
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/admin/login" ||
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout" ||
    pathname === "/api/contact"
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("presencex_session");
  const isAuthenticated = authCookie?.value === "authenticated";

  // Protected API routes
  const isProtectedApi =
    pathname.startsWith("/api/face/register") ||
    pathname.startsWith("/api/session/start") ||
    pathname.match(/\/api\/session\/[^/]+\/end/) ||
    pathname.startsWith("/api/attendance/mark");

  // Protected UI page routes
  const isProtectedPage =
    (pathname.startsWith("/admin") && pathname !== "/admin/login") ||
    pathname.startsWith("/kiosk");

  if (!isAuthenticated) {
    if (isProtectedApi) {
      return NextResponse.json(
        { success: false, data: null, error: "unauthorized" },
        { status: 401 }
      );
    }

    if (isProtectedPage) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/kiosk/:path*", "/api/:path*"],
};
