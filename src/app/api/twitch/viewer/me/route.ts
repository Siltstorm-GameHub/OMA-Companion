import { NextRequest, NextResponse } from "next/server";
import { readSession } from "@/lib/twitch-viewer";

export const dynamic = "force-dynamic";

/** Ist der Zuschauer mit Twitch angemeldet? (Nur Name — das Token verlässt nie den Server.) */
export async function GET(req: NextRequest) {
  const s = readSession(req);
  return NextResponse.json(
    s ? { loggedIn: true, login: s.login, displayName: s.displayName } : { loggedIn: false },
    { headers: { "Cache-Control": "no-store" } },
  );
}
