import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { setServerCapable } from "@/lib/games/server-candidates-server";

/**
 * Kommt das Spiel für einen eigenen OMA-Server in Frage? Mitglieder setzen, solange nichts oder nur die
 * automatische Erkennung eingetragen ist; danach ändert nur das Team. Jede Änderung wird protokolliert.
 * PUT /api/games/[slug]/server-fit  { value: boolean }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });
  const { slug } = await params;

  const body = await req.json().catch(() => null) as { value?: unknown } | null;
  if (typeof body?.value !== "boolean") return NextResponse.json({ error: "value muss ja/nein sein" }, { status: 400 });

  try {
    const r = await setServerCapable({ id: user.id, isModerator: hasMinRole(user.role, "moderator") }, slug, body.value);
    if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
    return NextResponse.json({ serverCapable: r.serverCapable, source: r.source });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Speichern fehlgeschlagen" }, { status: 409 });
  }
}
