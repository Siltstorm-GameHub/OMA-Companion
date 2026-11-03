// ============================================
// POST /api/blocks/tournaments/[eventId]/admin — Turnierleitung (Moderatoren/Admins)
// ============================================
// Body { action: "start" | "advance" }: "start" lost die Gruppen aus, "advance" beendet die laufende Phase
// sofort mit dem aktuellen Stand (z.B. wenn eine Gruppe nicht vollständig erscheint).

import { getSessionUser, hasMinRole } from "@/lib/roles";
import { advanceTournament, startTournament } from "@/lib/blocks/tournament";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const me = await getSessionUser();
  if (!me || !hasMinRole(me.role, "moderator")) return Response.json({ error: "Keine Berechtigung." }, { status: 403 });
  const { eventId } = await params;
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  const error =
    body?.action === "start" ? await startTournament(eventId)
    : body?.action === "advance" ? await advanceTournament(eventId, true)
    : "Unbekannte Aktion.";
  if (error) return Response.json({ error }, { status: 409 });
  return Response.json({ ok: true });
}
