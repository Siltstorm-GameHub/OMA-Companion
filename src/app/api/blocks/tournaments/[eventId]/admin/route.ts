// ============================================
// POST /api/blocks/tournaments/[eventId]/admin — Turnierleitung (wer das Event verwalten darf: Ersteller,
// Ersteller der Reihe, Squad-Captain, Moderatoren — siehe canManageEvent)
// ============================================
// Body { action: "start" | "advance" }: "start" lost die Gruppen aus, "advance" beendet die laufende Phase
// sofort mit dem aktuellen Stand (z.B. wenn eine Gruppe nicht vollständig erscheint).

import { canManageEvent, getSessionUser } from "@/lib/roles";
import { advanceTournament, startTournament } from "@/lib/blocks/tournament";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const me = await getSessionUser();
  const { eventId } = await params;
  if (!(await canManageEvent(me, eventId))) return Response.json({ error: "Keine Berechtigung." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { action?: unknown } | null;
  const error =
    body?.action === "start" ? await startTournament(eventId)
    : body?.action === "advance" ? await advanceTournament(eventId, true)
    : "Unbekannte Aktion.";
  if (error) return Response.json({ error }, { status: 409 });
  return Response.json({ ok: true });
}
