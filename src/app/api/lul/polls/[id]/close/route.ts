import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcLulPoints, isWinForDominion, hasDominionBonus, type LulPointsConfig } from "@/lib/lul";

// POST /api/lul/polls/[id]/close — Admin schließt Umfrage und wertet aus
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");

  const { id: pollId } = await params;

  const poll = await prisma.lulPoll.findUnique({
    where: { id: pollId },
    include: {
      votes:   true,
      spieltag: {
        include: {
          entries: true,
          season:  { include: { spieltage: { orderBy: { number: "asc" }, include: { entries: true } } } },
        },
      },
    },
  });

  if (!poll) return NextResponse.json({ error: "Umfrage nicht gefunden" }, { status: 404 });
  if (poll.status === "closed") return NextResponse.json({ error: "Bereits geschlossen" }, { status: 409 });

  // Sieger ermitteln: meiste Stimmen, Gleichstand → alle gewinnen
  const voteCounts: Record<string, number> = {};
  for (const vote of poll.votes) {
    voteCounts[vote.targetId] = (voteCounts[vote.targetId] ?? 0) + 1;
  }

  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const winnerIds = maxVotes > 0
    ? Object.entries(voteCounts).filter(([, c]) => c === maxVotes).map(([uid]) => uid)
    : [];

  const pointsConfig: LulPointsConfig | null = poll.spieltag.season.pointsConfig
    ? (JSON.parse(poll.spieltag.season.pointsConfig) as LulPointsConfig)
    : null;

  const pollCfg = pointsConfig?.polls?.find((p) => p.statKey === poll.statKey);
  const triggers = pointsConfig?.dominionTriggers;

  await prisma.$transaction(async (tx) => {
    // Umfrage schließen
    await tx.lulPoll.update({
      where: { id: pollId },
      data: {
        status:    "closed",
        winnerIds: winnerIds.length ? JSON.stringify(winnerIds) : null,
      },
    });

    // voted = true für alle die abgestimmt haben
    const voterIds = [...new Set(poll.votes.map((v) => v.voterId))];
    for (const voterId of voterIds) {
      await tx.lulEntry.upsert({
        where:  { spieltagId_userId: { spieltagId: poll.spieltagId, userId: voterId } },
        create: {
          spieltagId: poll.spieltagId,
          userId:     voterId,
          role:       "spectator",
          voted:      true,
          lulPoints:  0,
        },
        update: { voted: true },
      });
    }

    // Gewinner-Flags setzen (pollWinsJson + Legacy-Boolean-Felder)
    for (const winnerId of winnerIds) {
      const existing = await tx.lulEntry.findUnique({
        where: { spieltagId_userId: { spieltagId: poll.spieltagId, userId: winnerId } },
      });
      if (!existing) continue;

      const currentWins: string[] = existing.pollWinsJson
        ? (JSON.parse(existing.pollWinsJson) as string[])
        : [];
      if (!currentWins.includes(poll.statKey)) currentWins.push(poll.statKey);

      await tx.lulEntry.update({
        where: { id: existing.id },
        data: {
          pollWinsJson:  JSON.stringify(currentWins),
          communityChamp: poll.statKey === "communityChamp" ? true : existing.communityChamp,
          trostpreis:     poll.statKey === "trostpreis"     ? true : existing.trostpreis,
        },
      });
    }
  });

  // Nach der Transaktion: lulPoints für alle betroffenen Entries neu berechnen
  // (Gewinner + Voter können neue Punkte bekommen)
  const spieltag = poll.spieltag;
  const allSpieltage = spieltag.season.spieltage;

  const affectedUserIds = [...new Set([...winnerIds, ...poll.votes.map((v) => v.voterId)])];

  for (const userId of affectedUserIds) {
    const entry = await prisma.lulEntry.findUnique({
      where: { spieltagId_userId: { spieltagId: poll.spieltagId, userId } },
    });
    if (!entry || spieltag.status === "finished") continue;

    const isWin = isWinForDominion(entry, triggers);
    const history = allSpieltage
      .filter((st) => st.number <= spieltag.number)
      .map((st) => {
        if (st.id === poll.spieltagId) return isWin;
        const e = st.entries.find((e) => e.userId === userId);
        return e ? isWinForDominion(e, triggers) : false;
      });

    const bonus = hasDominionBonus(history);
    const pts   = calcLulPoints({ ...entry, dominionBonus: bonus }, pointsConfig);

    await prisma.lulEntry.update({
      where: { id: entry.id },
      data:  { lulPoints: pts, dominionBonus: bonus },
    });
  }

  const closedPoll = await prisma.lulPoll.findUnique({
    where: { id: pollId },
    include: { votes: { select: { voterId: true, targetId: true } } },
  });

  return NextResponse.json({ ok: true, winnerIds, poll: closedPoll });
}
