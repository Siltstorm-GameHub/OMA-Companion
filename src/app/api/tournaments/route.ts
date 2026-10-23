import { NextRequest, NextResponse } from "next/server";
import { requireModeratorOrEventSquadCaptain, hasMinRole } from "@/lib/roles";
import { capMatchResultPoints } from "@/lib/captain-reward-limits";
import { prisma } from "@/lib/prisma";
import { generateBracket, generateRoundRobin } from "@/lib/tournaments/generate";

export async function POST(req: NextRequest) {
  const { eventId, format, participantIds, pointsConfig: rawPointsConfig, statFields, statConfig, autoGenerate, status } = await req.json();
  if (!eventId) return NextResponse.json({ error: "eventId ist Pflicht" }, { status: 400 });
  const currentUser = await requireModeratorOrEventSquadCaptain(eventId);
  // Squad-Captains: Münzen pro Match-Ergebnis auf die Obergrenze kappen (captain-reward-limits.ts)
  const pointsConfig = hasMinRole(currentUser.role, "moderator") ? rawPointsConfig : capMatchResultPoints(rawPointsConfig);

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      tournamentStatus: true,
      checkInEnabled: true,
      registrations: { where: { role: { not: "spectator" } }, select: { userId: true, checkedInAt: true } },
    },
  });
  if (existing?.tournamentStatus) return NextResponse.json({ error: "Turnier existiert bereits" }, { status: 400 });

  // Explizite Spielerauswahl (Admin-Übersicht): bei aktivem Check-in nur eingecheckte angemeldete
  // Spieler übernehmen — direkt ausgewählte Nicht-Angemeldete bleiben (Admin-Entscheidung).
  const notCheckedIn = new Set(
    existing?.checkInEnabled ? existing.registrations.filter(r => !r.checkedInAt).map(r => r.userId) : [],
  );
  const selectedIds: string[] = Array.isArray(participantIds)
    ? [...new Set((participantIds as unknown[]).filter((id): id is string => typeof id === "string" && !notCheckedIn.has(id)))]
    : [];

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
      participants: selectedIds.length
        ? { create: selectedIds.map((userId, i) => ({ userId, seed: i + 1 })) }
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

  if (autoGenerate && selectedIds.length >= 2) {
    if (resolvedFormat === "single_elimination") {
      const bracketMatches = generateBracket(selectedIds, eventId);
      await prisma.match.createMany({ data: bracketMatches });
    } else if (resolvedFormat === "round_robin") {
      const rrMatches = generateRoundRobin(selectedIds, eventId);
      await prisma.match.createMany({ data: rrMatches });
    } else if (resolvedFormat === "liga") {
      const hinrunde   = generateRoundRobin(selectedIds, eventId);
      const maxRound   = hinrunde.length ? Math.max(...hinrunde.map(m => m.round)) : 0;
      const rueckrunde = generateRoundRobin([...selectedIds].reverse(), eventId).map(m => ({
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
