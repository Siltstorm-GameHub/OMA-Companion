import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { commitArrivalIfDue } from "@/lib/dnd/travel";
import { positionOfCard } from "@/lib/dnd/position";
import { planTravel } from "@/lib/dnd/hex/pathfinding";
import { WORLD_COLS, WORLD_ROWS, terrainAt } from "@/lib/dnd/hex/world";
import { inBounds } from "@/lib/dnd/hex/grid";

/**
 * Reise antreten. Input: { col, row } — beliebiges betretbares Hex-Feld. Der Server
 * plant den Weg selbst (Client-Vorschau ist nur Anzeige) und speichert Pfad + Ankunftszeit.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const target = { col: Number(body?.col), row: Number(body?.row) };
  if (!inBounds(target, WORLD_COLS, WORLD_ROWS)) {
    return NextResponse.json({ error: "Ungültiges Zielfeld" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  if (!user?.discordId) return NextResponse.json({ error: "Kein verknüpfter Discord-Account" }, { status: 400 });

  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (!card?.dndCreatedAt) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  // Fällige Ankunft zuerst committen, sonst könnte eine neue Reise auf einer
  // veralteten Position starten.
  await commitArrivalIfDue(card.id);
  const fresh = await prisma.card.findUnique({ where: { id: card.id } });
  if (!fresh) return NextResponse.json({ error: "Charakter nicht gefunden" }, { status: 404 });

  if (fresh.travelToCol != null) {
    return NextResponse.json({ error: "Bereits unterwegs" }, { status: 400 });
  }

  const from = await positionOfCard(fresh);
  if (!from) return NextResponse.json({ error: "Keine Startposition — bitte Seite neu laden" }, { status: 400 });

  const t = terrainAt(target);
  if (t === "o" || t === "l" || t === "v") {
    return NextResponse.json({ error: "Dieses Feld ist nicht betretbar (Wasser bzw. Lava)" }, { status: 400 });
  }
  const plan = planTravel(from, target, WORLD_COLS, WORLD_ROWS, terrainAt);
  if (!plan) return NextResponse.json({ error: "Kein Weg zu diesem Feld" }, { status: 400 });

  const now = new Date();
  const arrivesAt = new Date(now.getTime() + plan.totalMinutes * 60 * 1000);

  await prisma.card.update({
    where: { id: fresh.id },
    data: {
      // Abreisefeld festhalten (bei Alt-Charakteren erst hier befüllt)
      currentHexCol: from.col,
      currentHexRow: from.row,
      travelToCol: target.col,
      travelToRow: target.row,
      travelPath: plan.path.map((h) => [h.col, h.row]),
      travelDepartedAt: now,
      travelArrivesAt: arrivesAt,
    },
  });

  return NextResponse.json({
    travelDepartedAt: now,
    travelArrivesAt: arrivesAt,
    totalMinutes: plan.totalMinutes,
    steps: plan.path.length - 1,
  });
}
