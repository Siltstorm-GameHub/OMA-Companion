import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { endSession, inviteToSession, removeFromSession, respondToSession, SessionError } from "@/lib/watch-sessions";

/**
 * PATCH { action, userIds?, userId? } — eine Session bearbeiten:
 *   Host:          "invite" (userIds), "remove" (userId), "end"
 *   Eingeladener:  "accept", "decline"; Teilnehmer: "leave"
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const userId = session.user.id;
  const { id } = await params;
  const body = await req.json().catch(() => null) as { action?: unknown; userIds?: unknown; userId?: unknown } | null;

  try {
    switch (body?.action) {
      case "invite": await inviteToSession(id, userId, body.userIds); break;
      case "remove":
        if (typeof body.userId !== "string") return NextResponse.json({ error: "userId fehlt" }, { status: 400 });
        await removeFromSession(id, userId, body.userId);
        break;
      case "end": await endSession(id, userId); break;
      case "accept": case "decline": case "leave": await respondToSession(id, userId, body.action); break;
      default: return NextResponse.json({ error: "Unbekannte Aktion" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SessionError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
