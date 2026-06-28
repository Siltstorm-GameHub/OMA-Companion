import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { calcNextDate, type RecurrenceType, type MonthlyMode } from "@/lib/recurrence";
import type { LulPointsConfig } from "@/lib/lul";

export async function GET() {
  const seasons = await prisma.lulSeason.findMany({
    orderBy: { number: "desc" },
    include: {
      spieltage: {
        orderBy: { number: "asc" },
        include: {
          entries: {
            include: { user: { select: { id: true, name: true, username: true, image: true } } },
          },
        },
      },
      legacyEntries: {
        include: { user: { select: { id: true, name: true, username: true, image: true } } },
        orderBy: { totalPts: "desc" },
      },
    },
  });
  return NextResponse.json(seasons);
}

type SpieltagTemplate = {
  game?:             string;
  gameType?:         string;
  platform?:         string;
  tournamentFormat?: string;
  statFields?:       string[];
  maxPlayers?:       number;
};

export async function POST(req: NextRequest) {
  await requireRole("moderator");

  const body = await req.json();
  const {
    number,
    name,
    period,
    totalSpieltage,
    pointsConfig,
    firstSpieltagDate,
    recurrenceType,
    monthlyMode,
    spieltagTemplate,
  } = body as {
    number:             number;
    name?:              string;
    period?:            string;
    totalSpieltage?:    number;
    pointsConfig?:      LulPointsConfig;
    firstSpieltagDate?: string;
    recurrenceType?:    RecurrenceType | "none";
    monthlyMode?:       MonthlyMode;
    spieltagTemplate?:  SpieltagTemplate;
  };

  if (!number) return NextResponse.json({ error: "number ist Pflicht" }, { status: 400 });

  const count    = totalSpieltage ?? 8;
  const template = spieltagTemplate ?? {};
  const seasonName = name ?? `Saison ${number}`;

  // ── 1. LulSeason erstellen ────────────────────────────────────────────────────
  const season = await prisma.lulSeason.create({
    data: {
      number,
      name:           name ?? null,
      period:         period ?? null,
      totalSpieltage: count,
      status:         "upcoming",
      pointsConfig:   pointsConfig ? JSON.stringify(pointsConfig) : null,
    },
  });

  // ── 2. Spieltag-Daten sammeln ─────────────────────────────────────────────────
  let spieltagDates: Date[] = [];
  if (firstSpieltagDate) {
    const refDate = new Date(firstSpieltagDate);
    spieltagDates = [refDate];
    if (recurrenceType && recurrenceType !== "none") {
      const mode = monthlyMode ?? "dayOfMonth";
      for (let i = 1; i < count; i++) {
        spieltagDates.push(calcNextDate(spieltagDates[i - 1], recurrenceType, mode, refDate));
      }
    }
  }

  // ── 3. EventSeries erstellen (neues System → sichtbar wie normale Eventreihe) ─
  const series = await prisma.eventSeries.create({
    data: {
      name:        `🏆 Level-UP-League – ${seasonName}`,
      description: period ?? null,
      fixedGame:   template.game   ?? null,
      fixedFormat: template.tournamentFormat ?? null,
      category:    "special",
      hidden:      false,
      seasonNumber: number,
    },
  });

  // ── 4. LulSeason mit der Series verknüpfen ────────────────────────────────────
  await prisma.lulSeason.update({
    where: { id: season.id },
    data:  { seriesId: series.id },
  });

  // ── 5. Spieltage + Events erstellen und verknüpfen ───────────────────────────
  for (let i = 0; i < Math.max(spieltagDates.length, spieltagDates.length === 0 ? 0 : 0); i++) {
    // no-op guard
  }

  if (spieltagDates.length > 0) {
    for (let i = 0; i < spieltagDates.length; i++) {
      const d = spieltagDates[i];
      const spieltag = await prisma.lulSpieltag.create({
        data: {
          seasonId:         season.id,
          number:           i + 1,
          scheduledAt:      d,
          game:             template.game             ?? null,
          gameType:         template.gameType          ?? null,
          platform:         template.platform          ?? null,
          tournamentFormat: template.tournamentFormat  ?? null,
          statFields:       template.statFields?.length ? JSON.stringify(template.statFields) : null,
          maxPlayers:       template.maxPlayers ?? null,
          status:           "upcoming",
        },
      });

      const event = await prisma.event.create({
        data: {
          title:    `Level-UP-League – ${seasonName} – Spieltag ${i + 1}`,
          startAt:  d,
          game:     template.game ?? null,
          category: "special",
          type:     "community",
          status:   "open",
          seriesId: series.id,
          maxPlayers: template.maxPlayers ?? null,
          format:   template.tournamentFormat ?? null,
          statFields: template.statFields?.length ? JSON.stringify(template.statFields) : null,
          spectatorMode: true,
        },
      });

      await prisma.lulSpieltag.update({
        where: { id: spieltag.id },
        data:  { eventId: event.id },
      });
    }
  }

  const created = await prisma.lulSeason.findUnique({
    where:   { id: season.id },
    include: { spieltage: { orderBy: { number: "asc" } } },
  });

  return NextResponse.json(created, { status: 201 });
}
