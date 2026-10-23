import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createSession, getMySessions, SessionError } from "@/lib/watch-sessions";
import { sanitizeSessionTitle } from "@/lib/watch-session-rules";

/** Eigene "Zusammen ansehen"-Sessions (Live-Steuerung): GET = Überblick, POST = neue Session starten. */

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json(await getMySessions(session.user.id), { headers: { "Cache-Control": "no-store" } });
}

/** POST { title?, inviteUserIds: string[] } — beendet eine laufende eigene Session. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const body = await req.json().catch(() => null) as { title?: unknown; inviteUserIds?: unknown } | null;
  try {
    const created = await createSession(session.user.id, sanitizeSessionTitle(body?.title), body?.inviteUserIds);
    return NextResponse.json({ ok: true, slug: created.slug });
  } catch (e) {
    if (e instanceof SessionError) return NextResponse.json({ error: e.message }, { status: e.status });
    throw e;
  }
}
