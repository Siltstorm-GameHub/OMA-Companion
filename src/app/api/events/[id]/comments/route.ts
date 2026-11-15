import { NextRequest, NextResponse, after } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { createEventComment, createEventStatus, listEventComments, notifyNewEventComment } from "@/lib/event-comments";

export const dynamic = "force-dynamic";

/** Absprachen eines Events (nur für angemeldete Mitglieder). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const res = await listEventComments(user, id);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });
  return NextResponse.json(res.data, { headers: { "Cache-Control": "no-store" } });
}

/** Neue Nachricht ({ content }) oder Status-Meldung ({ status: "late" | "absent" | "ready", lateMin? }). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const res = body.status !== undefined
    ? await createEventStatus(user, id, body.status, body.lateMin)
    : await createEventComment(user, id, body.content);
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status });

  after(() => notifyNewEventComment(res.data).catch(e => console.error("[event-comments] Benachrichtigung fehlgeschlagen:", e)));
  return NextResponse.json({ id: res.data.id, checkedIn: res.data.checkedIn ?? false }, { status: 201 });
}
