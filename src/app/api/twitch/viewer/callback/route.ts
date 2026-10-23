import { NextRequest, NextResponse } from "next/server";
import { redirectUri, safeReturnTo, sessionFromCode, setSessionCookie, VIEWER_STATE_COOKIE } from "@/lib/twitch-viewer";

/** Rückkehr von Twitch nach dem Login: Code gegen Token tauschen, verschlüsselt ins Cookie, zurück. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const [expectedState, storedReturn] = (req.cookies.get(VIEWER_STATE_COOKIE)?.value ?? "").split("|");
  const returnTo = safeReturnTo(storedReturn);
  const back = (status?: string) => {
    const url = new URL(returnTo, req.nextUrl.origin);
    if (status) url.searchParams.set("twitch", status);
    const res = NextResponse.redirect(url);
    res.cookies.set(VIEWER_STATE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  };

  // Abgebrochen (Zuschauer hat bei Twitch "Abbrechen" gewählt) oder ungültiger Rücksprung.
  if (params.get("error")) return back("abgebrochen");
  const code = params.get("code");
  if (!code || !expectedState || params.get("state") !== expectedState) return back("fehler");

  const session = await sessionFromCode(code, redirectUri(req));
  if (!session) return back("fehler");
  const res = back();
  setSessionCookie(res, session);
  return res;
}
