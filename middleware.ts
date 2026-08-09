import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Reicht den Pfad als Header durch, damit (dashboard)/layout.tsx (Server Component,
// hat keinen direkten Zugriff auf die Request-URL) weiß, welche Route gerade
// aufgerufen wird — nötig, um einzelnen Seiten Gastzugriff ohne Discord-Login
// zu erlauben (siehe GUEST_ALLOWED_PATHS in layout.tsx).
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: "/((?!api|_next/static|_next/image|favicon.ico).*)",
};
