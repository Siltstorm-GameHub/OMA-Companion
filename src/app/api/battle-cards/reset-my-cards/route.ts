// ============================================
// POST /api/battle-cards/reset-my-cards
// ============================================
// Löscht ausschließlich die eigenen UserCard-Zeilen des eingeloggten Users —
// kein Admin-Recht nötig/möglich, da userId immer aus der Session kommt,
// nie aus dem Request. Nützlich zum erneuten Testen des Start-Pack-Flows.
// Kein Debug-Button in der UI, bewusst nur per direktem Aufruf erreichbar.

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const { count } = await prisma.userCard.deleteMany({ where: { userId } });

  return Response.json({ ok: true, deleted: count });
}
