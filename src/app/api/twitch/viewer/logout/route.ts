import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, readSession } from "@/lib/twitch-viewer";

/** Abmelden: Cookie löschen und das Token bei Twitch widerrufen. */
export async function POST(req: NextRequest) {
  const s = readSession(req);
  if (s && process.env.TWITCH_CLIENT_ID) {
    await fetch("https://id.twitch.tv/oauth2/revoke", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, token: s.accessToken }),
    }).catch(() => {});
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookie(res);
  return res;
}
