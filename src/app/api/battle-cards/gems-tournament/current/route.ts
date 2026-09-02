// ============================================
// GET /api/battle-cards/gems-tournament/current
// ============================================
// Liefert das aktuell relevante OMA-Gems-Turnier (bevorstehend oder laufend)
// für den Turnier-Banner auf der Battle-Cards-Seite, siehe GemsTournamentBanner.tsx.

import { auth } from "@/auth";
import { getCurrentGemsTournament } from "@/lib/battle-cards/gems-tournament";

export async function GET() {
  const session = await auth();
  const viewerId = session?.user?.id;
  if (!viewerId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const tournament = await getCurrentGemsTournament(viewerId);
  return Response.json({ tournament });
}
