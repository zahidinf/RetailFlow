import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = "session_token";
const PUBLIC_ROUTES = ["/login", "/change-password", "/about"];

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = !!sessionCookie?.value;
  const pathname = request.nextUrl.pathname;

  // Allow login page to perform database session verification
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // If not authenticated and trying to access protected route, redirect to login
  if (!isAuthenticated && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - branding (brand assets)
     * - favicon (favicon assets)
     * - images (public images)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|branding|favicon|images|favicon.ico|.*\\..*).*)",
  ],
};
