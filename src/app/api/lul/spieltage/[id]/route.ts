import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcLulPoints, hasDominionBonus } from "@/lib/lul";
import { auth } from "@/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const spieltag = await prisma.lulSpieltag.findUnique({
    where: { id },
    include: {
      season: { select: { id: true, name: true, number: true } },
      entries: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { placement: "asc" },
      },
    },
  });
  if (!spieltag) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  return NextResponse.json(spieltag, { headers: { "Cache-Control": "no-store" } });
}

type EntryInput = {
  userId:         string;
  role:           "player" | "spectator" | "voter";
  roundScores?:   number[];
  placement?:     number | null;
  gameWinner:     boolean;
  communityChamp: boolean;
  trostpreis:     boolean;
  voted:          boolean;
};

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: spieltagId } = await params;
  const body = await req.json();
  const { status, game, gameType, platform, scheduledAt, pointsConfig, entries, finalize } = body;

  // Simple metadata update
  if (!entries && !finalize) {
    const updated = await prisma.lulSpieltag.update({
      where: { id: spieltagId },
      data: {
        ...(status       !== undefined && { status }),
        ...(game         !== undefined && { game }),
        ...(gameType     !== undefined && { gameType }),
        ...(platform     !== undefined && { platform }),
        ...(scheduledAt  !== undefined && { scheduledAt: scheduledAt ? new Date(scheduledAt) : null }),
        ...(pointsConfig !== undefined && { pointsConfig: JSON.stringify(pointsConfig) }),
      },
    });
    return NextResponse.json(updated);
  }

  // Save draft entries (upsert without computing LUL points)
  if (entries && !finalize) {
    const spieltag = await prisma.lulSpieltag.findUnique({ where: { id: spieltagId } });
    if (!spieltag) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const incomingUserIds = (entries as EntryInput[]).map(e => e.userId);

    // Delete entries that were removed from the list
    await prisma.lulEntry.deleteMany({
      where: { spieltagId, userId: { notIn: incomingUserIds } },
    });

    for (const e of entries as EntryInput[]) {
      const scores: number[] = e.roundScores ?? [];
      const total = scores.reduce((s, v) => s + v, 0);
      await prisma.lulEntry.upsert({
        where:  { spieltagId_userId: { spieltagId, userId: e.userId } },
        create: {
          spieltagId,
          userId:         e.userId,
          role:           e.role,
          roundScores:    scores.length ? JSON.stringify(scores) : null,
          totalGameScore: total,
          placement:      e.placement ?? null,
          gameWinner:     e.gameWinner,
          communityChamp: e.communityChamp,
          trostpreis:     e.trostpreis,
          voted:          e.voted,
          dominionBonus:  false,
          lulPoints:      0,
        },
        update: {
          role:           e.role,
          roundScores:    scores.length ? JSON.stringify(scores) : null,
          totalGameScore: total,
          placement:      e.placement ?? null,
          gameWinner:     e.gameWinner,
          communityChamp: e.communityChamp,
          trostpreis:     e.trostpreis,
          voted:          e.voted,
        },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Finalize: compute dominionBonus + lulPoints + mark finished
  if (finalize) {
    const spieltag = await prisma.lulSpieltag.findUnique({
      where: { id: spieltagId },
      include: {
        entries: true,
        season:  { include: { spieltage: { orderBy: { number: "asc" }, include: { entries: true } } } },
      },
    });
    if (!spieltag) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });

    const allSpieltage = spieltag.season.spieltage;

    for (const entry of spieltag.entries) {
      const isWin = entry.gameWinner || entry.communityChamp || entry.trostpreis;

      // Collect win-history for this user across spieltage up to and including current
      const history = allSpieltage
        .filter((st) => st.number <= spieltag.number)
        .map((st) => {
          if (st.id === spieltagId) return isWin;
          const e = st.entries.find((e) => e.userId === entry.userId);
          return e ? (e.gameWinner || e.communityChamp || e.trostpreis) : false;
        });

      const bonus = hasDominionBonus(history);
      const pts   = calcLulPoints({ ...entry, dominionBonus: bonus });

      const oldPts = entry.lulPoints;
      await prisma.lulEntry.update({
        where: { id: entry.id },
        data:  { dominionBonus: bonus, lulPoints: pts },
      });
      // Delta auf rankPoints anwenden (korrekt bei Re-Finalisierung)
      const delta = pts - oldPts;
      if (delta !== 0) {
        const reason = `LUL Spieltag ${spieltag.number} – ${spieltag.game}`;
        await prisma.$transaction([
          prisma.user.update({
            where: { id: entry.userId },
            data:  { rankPoints: { increment: delta } },
          }),
          // Delta als Transaktion festhalten (kein Geburtstags-Boost)
          prisma.pointTransaction.create({
            data: { userId: entry.userId, amount: delta, reason },
          }),
        ]);
      }
    }

    const finalized = await prisma.lulSpieltag.update({
      where: { id: spieltagId },
      data:  { status: "finished" },
      include: {
        entries: { include: { user: { select: { id: true, name: true, username: true, image: true } } } },
      },
    });

    // Activate season if still upcoming
    if (spieltag.season.status === "upcoming") {
      await prisma.lulSeason.update({ where: { id: spieltag.seasonId }, data: { status: "active" } });
    }

    return NextResponse.json(finalized);
  }

  return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  await prisma.lulSpieltag.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
