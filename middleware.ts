import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(
  request: NextRequest
) {
  const pathname =
    request.nextUrl.pathname;

  /*
   * Login page and auth API must
   * remain accessible.
   */

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith(
      "/api/auth"
    )
  ) {
    return NextResponse.next();
  }

  /*
   * Ignore Next.js internals,
   * static files and images.
   */

  if (
    pathname.startsWith(
      "/_next"
    ) ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const session =
    request.cookies.get(
      "auth_session"
    );

  /*
   * No session -> login.
   */

  if (!session?.value) {
    const loginUrl =
      new URL(
        "/login",
        request.url
      );

    /*
     * Remember where the user
     * wanted to go.
     */

    loginUrl.searchParams.set(
      "redirect",
      pathname
    );

    return NextResponse.redirect(
      loginUrl
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};