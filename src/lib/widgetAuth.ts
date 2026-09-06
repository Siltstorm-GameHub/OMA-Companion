import { NextResponse } from "next/server";

/**
 * Auth-Gate für die Widget-API (src/app/api/widget/**) — ein separates, kleines internes
 * Namespace für das physische Touchscreen-Gerät (Corsair Xeneon Edge) am Turnier-Tisch.
 * Das Gerät hat keinen Browser-Login, daher KEIN NextAuth-Session-Cookie hier, sondern ein
 * einzelner statischer API-Key per `Authorization: Bearer <key>`-Header.
 *
 * Fail-closed: fehlt WIDGET_API_KEY in der Umgebung, wird JEDE Anfrage abgelehnt statt
 * versehentlich offen zu sein.
 *
 * Verwendung als erste Zeile in jedem Route-Handler unter src/app/api/widget/**:
 *   const unauthorized = requireWidgetKey(request);
 *   if (unauthorized) return unauthorized;
 */
export function requireWidgetKey(request: Request): NextResponse | null {
  const expected = process.env.WIDGET_API_KEY;
  if (!expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const authHeader = request.headers.get("authorization") ?? request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provided = authHeader.slice("Bearer ".length);
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
