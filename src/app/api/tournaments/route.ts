import { NextRequest, NextResponse } from "next/server";
import { requireModeratorOrEventSquadCaptain } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { generateBracket, generateRoundRobin } from "@/lib/tournaments/generate";

export async function POST(req: NextRequest) {
  const { eventId, format, participantIds, pointsConfig, statFields, statConfig, autoGenerate, status } = await req.json();
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
      // "pending" = Einstellungen gespeichert, Turnier noch nicht gestartet ("bereit zum Start").
      tournamentStatus: status === "pending" ? "pending" : "active",
      type: "tournament",
      pointsConfig: pointsConfig ? JSON.stringify(pointsConfig) : null,
      statFields: statFields ? JSON.stringify(statFields) : null,
      statConfigJson: statConfig ? JSON.stringify(statConfig) : null,
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
