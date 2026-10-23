import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { authorizeUrl, redirectUri, safeReturnTo, VIEWER_STATE_COOKIE } from "@/lib/twitch-viewer";

/** Startet den Twitch-Login eines Zuschauers (OAuth) — ?returnTo=/zusammen?... */
export async function GET(req: NextRequest) {
  if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) {
    return NextResponse.json({ error: "Twitch-Login ist nicht eingerichtet" }, { status: 503 });
  }
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get("returnTo"));
  // Schutz gegen untergeschobene Login-Antworten (CSRF): zufälliger state, im Cookie gegengeprüft.
  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(authorizeUrl(redirectUri(req), state));
  res.cookies.set(VIEWER_STATE_COOKIE, `${state}|${returnTo}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 600,
  });
  return res;
}
