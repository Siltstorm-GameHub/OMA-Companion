import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-Memory Rate Limiter. Läuft pro Serverless-/Edge-Instanz, ist also nicht
// exakt instanzübergreifend — reicht aber, um einzelne Clients vor
// versehentlichem oder böswilligem Anfrage-Spam auf die API zu bremsen.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

const requestLog = new Map<string, { count: number; windowStart: number }>();

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = requestLog.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    requestLog.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// Verhindert unbegrenztes Wachstum der Map, falls viele unterschiedliche
// Clients zugreifen (z.B. verschiedene IPs).
function cleanupExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of requestLog) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      requestLog.delete(key);
    }
  }
}

function getClientKey(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() ?? "unknown";
  return ip;
}

// Reicht den Pfad als Header durch, damit (dashboard)/layout.tsx (Server Component,
// hat keinen direkten Zugriff auf die Request-URL) weiß, welche Route gerade
// aufgerufen wird — nötig, um einzelnen Seiten Gastzugriff ohne Discord-Login
// zu erlauben (siehe GUEST_ALLOWED_PATHS in layout.tsx).
export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api")) {
    const key = getClientKey(request);

    if (isRateLimited(key)) {
      return NextResponse.json(
        { error: "Zu viele Anfragen. Bitte kurz warten." },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    if (requestLog.size > 5000) {
      cleanupExpiredEntries();
    }

    return NextResponse.next();
  }

  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
