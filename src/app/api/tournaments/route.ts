import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { updateQuestProgress } from "@/lib/quests";
import { dispatchNotification } from "@/lib/notify-dispatch";

// Standard round-robin scheduling algorithm (circle method)
export function generateRoundRobin(participantIds: string[], eventId: string) {
  const ids = [...participantIds];
  if (ids.length % 2 !== 0) ids.push("BYE"); // ghost player
  const n      = ids.length;
  const rounds = n - 1;
  const matches = [];

  for (let round = 1; round <= rounds; round++) {
    let pos = 1;
    for (let i = 0; i < n / 2; i++) {
      const home = ids[i];
      const away = ids[n - 1 - i];
      if (home !== "BYE" && away !== "BYE") {
        matches.push({ eventId, round, position: pos, player1Id: home, player2Id: away, winnerId: null });
        pos++;
      }
    }
    // rotate: fix index 0, rotate the rest
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }
  return matches;
}

function generateBracket(participantIds: string[], eventId: string) {
  const n = participantIds.length;
  const slots = Math.pow(2, Math.ceil(Math.log2(n)));
  const rounds = Math.ceil(Math.log2(slots));
  const matches = [];

  const shuffled = [...participantIds].sort(() => Math.random() - 0.5);
  while (shuffled.length < slots) shuffled.push("BYE");

  for (let pos = 0; pos < slots / 2; pos++) {
    matches.push({
      eventId,
      round: 1,
      position: pos + 1,
      player1Id: shuffled[pos * 2] === "BYE" ? null : shuffled[pos * 2],
      player2Id: shuffled[pos * 2 + 1] === "BYE" ? null : shuffled[pos * 2 + 1],
      winnerId:
        shuffled[pos * 2 + 1] === "BYE"
          ? shuffled[pos * 2]
          : shuffled[pos * 2] === "BYE"
          ? shuffled[pos * 2 + 1]
          : null,
    });
  }

  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = slots / Math.pow(2, round);
    for (let pos = 1; pos <= matchesInRound; pos++) {
      matches.push({ eventId, round, position: pos, player1Id: null, player2Id: null, winnerId: null });
    }
  }

  return matches;
}

export async function POST(req: NextRequest) {
  await requireRole("moderator");
  const { eventId, format, participantIds, pointsConfig, statFields, autoGenerate } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId ist Pflicht" }, { status: 400 });

  const existing = await prisma.event.findUnique({ where: { id: eventId }, select: { tournamentStatus: true } });
  if (existing?.tournamentStatus) return NextResponse.json({ error: "Turnier existiert bereits" }, { status: 400 });

  const resolvedFormat = format ?? "single_elimination";

  // Turnier-Daten direkt ins Event schreiben + Participants anlegen
  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      format: resolvedFormat,
      tournamentStatus: "active",
      type: "tournament",
      pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : null,
      statFields: statFields ? JSON.stringify(statFields) : null,
      participants: participantIds?.length
        ? { create: participantIds.map((userId: string, i: number) => ({ userId, seed: i + 1 })) }
        : undefined,
    },
    include: {
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { entries: true },
      },
      participants: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      },
      teams: {
        include: {
          members: { include: { user: { select: { id: true, name: true, username: true } } } },
        },
      },
    },
  });

  if (autoGenerate && participantIds?.length >= 2) {
    if (resolvedFormat === "single_elimination") {
      const bracketMatches = generateBracket(participantIds, eventId);
      await prisma.match.createMany({ data: bracketMatches });
    } else if (resolvedFormat === "round_robin") {
      const rrMatches = generateRoundRobin(participantIds, eventId);
      await prisma.match.createMany({ data: rrMatches });
    } else if (resolvedFormat === "liga") {
      const hinrunde   = generateRoundRobin(participantIds, eventId);
      const maxRound   = hinrunde.length ? Math.max(...hinrunde.map(m => m.round)) : 0;
      const rueckrunde = generateRoundRobin([...participantIds].reverse(), eventId).map(m => ({
        ...m,
        round: m.round + maxRound,
      }));
      await prisma.match.createMany({ data: [...hinrunde, ...rueckrunde] });
    }
  }

  // Quest progress für alle Teilnehmer
  if (participantIds?.length) {
    await Promise.all(
      participantIds.map((uid: string) => updateQuestProgress(uid, "TOURNAMENT", 1))
    );
  }

  // Matches nachladen falls gerade erstellt
  const full = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        include: { entries: true },
      },
      participants: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
      },
      teams: {
        include: {
          members: { include: { user: { select: { id: true, name: true, username: true } } } },
        },
      },
    },
  });
  // Push + In-App + Discord-DM an alle User
  const allUsers = await prisma.user.findMany({ select: { id: true } });
  dispatchNotification("tournament_started", {
    users: allUsers.map((u) => u.id),
    placeholders: { "{eventName}": full?.title ?? "Ein neues Turnier wurde erstellt!" },
    urlOverride: `/events/${eventId}`,
  }).catch(() => {});

  return NextResponse.json(full, { status: 201 });
}
