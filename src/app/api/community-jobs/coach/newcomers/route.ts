import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getNewcomers, sendWelcome, inviteToSession } from "@/lib/coach-service";

export const dynamic = "force-dynamic";

/** Neue Spieler ohne Training (für Coaches). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json(await getNewcomers(user.id));
}

/** POST { userId, action: "welcome" | "invite", message?, sessionId? } */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { userId, action, message, sessionId } = await req.json().catch(() => ({}));
  if (typeof userId !== "string" || (action !== "welcome" && action !== "invite")) {
    return NextResponse.json({ error: "userId und action (welcome | invite) erforderlich" }, { status: 400 });
  }
  if (action === "invite" && typeof sessionId !== "string") {
    return NextResponse.json({ error: "sessionId erforderlich" }, { status: 400 });
  }

  const result = action === "welcome"
    ? await sendWelcome(user.id, userId, typeof message === "string" ? message : undefined)
    : await inviteToSession(user.id, userId, sessionId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
