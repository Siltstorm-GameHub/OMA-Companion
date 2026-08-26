import { NextRequest, NextResponse } from "next/server";
import { requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

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

type BracketMatch = {
  eventId:   string;
  round:     number;
  position:  number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId:  string | null;
};

/** Unverzerrtes Mischen (Fisher-Yates). */
function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateBracket(participantIds: string[], eventId: string): BracketMatch[] {
  const n      = participantIds.length;
  const slots  = Math.pow(2, Math.ceil(Math.log2(n)));
  const rounds = Math.ceil(Math.log2(slots));
  const firstRoundMatches = slots / 2;

  const players = shuffle(participantIds);

  // Freilose auf verschiedene Matches verteilen (je höchstens eines pro Match). Würden sie
  // stattdessen hinten angehängt, könnten zwei Freilose im selben Match landen — dieses Match
  // hätte dann gar keine Spieler und einen Sieger, den es nicht gibt.
  // Das geht immer auf: slots ist die nächste Zweierpotenz ≥ n, damit ist slots − n < slots/2.
  const byeCount = slots - n;

  const round1: BracketMatch[] = [];
  let next = 0;
  for (let position = 1; position <= firstRoundMatches; position++) {
    const isBye     = position <= byeCount;
    const player1Id = players[next++] ?? null;
    const player2Id = isBye ? null : (players[next++] ?? null);
    round1.push({
      eventId, round: 1, position, player1Id, player2Id,
      winnerId: isBye ? player1Id : null,
    });
  }

  // Leere Matches der Folgerunden
  const laterRounds: BracketMatch[] = [];
  for (let round = 2; round <= rounds; round++) {
    const matchesInRound = slots / Math.pow(2, round);
    for (let position = 1; position <= matchesInRound; position++) {
      laterRounds.push({ eventId, round, position, player1Id: null, player2Id: null, winnerId: null });
    }
  }

  // Freilos-Sieger sofort aufrücken lassen. Sonst bliebe ihr Platz in Runde 2 leer: das
  // Nachrücken passiert sonst nur beim Eintragen eines Match-Ergebnisses, und ein Freilos
  // trägt niemand ein.
  for (const m of round1) {
    if (!m.winnerId) continue;
    const target = laterRounds.find(x => x.round === 2 && x.position === Math.ceil(m.position / 2));
    if (!target) continue;
    if (m.position % 2 === 1) target.player1Id = m.winnerId;
    else                      target.player2Id = m.winnerId;
  }

  return [...round1, ...laterRounds];
}

export async function POST(req: NextRequest) {
  const { eventId, format, participantIds, pointsConfig, statFields, autoGenerate } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId ist Pflicht" }, { status: 400 });
  await requireModeratorOrEventSquadCaptain(eventId);

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

  return NextResponse.json(full, { status: 201 });
}
