// ============================================
// POST /api/internal/grant-tactic-cards-to-all
// ============================================
// Einmaliger Starter-Grant: schenkt JEDEM bestehenden User genau 1 Exemplar
// jeder existierenden Taktik-Karte (Items/Fallen) — Bestandsuser sollen nicht
// erst mühsam per Pack an Taktik-Karten kommen müssen, um überhaupt ein
// gültiges Duell-Deck bauen zu können. Läuft als Route statt Skript aus
// demselben Grund wie /api/internal/seed-standard-cards (Produktions-DB nur
// dort erreichbar).
//
// Idempotent: nutzt createMany mit skipDuplicates — ein erneuter Aufruf
// (z.B. nachdem neue Taktik-Karten hinzugekommen sind, oder neue User sich
// seither registriert haben) vergibt nur die fehlenden Kombinationen, ohne
// bestehende Bestände zu verdoppeln.

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

function isAuthorized(request: Request): boolean {
  const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET;
  if (!expectedSecret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${expectedSecret}`;
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(headerBuf, expectedBuf);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [users, tacticCards] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.tacticCard.findMany({ select: { id: true } }),
  ]);

  if (tacticCards.length === 0) {
    return Response.json(
      { error: "Keine Taktik-Karten vorhanden — zuerst /api/internal/seed-tactic-cards aufrufen." },
      { status: 400 }
    );
  }

  const data = users.flatMap((u) => tacticCards.map((tc) => ({ userId: u.id, tacticCardId: tc.id, quantity: 1 })));

  const result = await prisma.userTacticCard.createMany({ data, skipDuplicates: true });

  return Response.json({
    usersConsidered: users.length,
    tacticCardsConsidered: tacticCards.length,
    rowsCreated: result.count,
  });
}
