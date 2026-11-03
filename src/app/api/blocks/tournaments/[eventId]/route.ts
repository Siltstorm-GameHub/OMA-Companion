// ============================================
// GET /api/blocks/tournaments/[eventId] — Stand eines OMA-Blocks-Live-Turniers
// ============================================
// Gruppen, Finale, Endrangliste und was der Aufrufer gerade darf (siehe lib/blocks/tournament.ts).
// Die Turnier-Seite fragt das alle paar Sekunden ab.

import { auth } from "@/auth";
import { getTournamentState } from "@/lib/blocks/tournament";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ eventId: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  const { eventId } = await params;
  const state = await getTournamentState(eventId, session.user.id);
  if (!state) return Response.json({ error: "Turnier nicht gefunden." }, { status: 404 });
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}
