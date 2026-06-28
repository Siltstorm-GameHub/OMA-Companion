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
    // Wizard-spezifische Felder für Spieltag-Autogenerierung
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

  const count = totalSpieltage ?? 8;

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

  // Spieltage auto-generieren wenn firstSpieltagDate angegeben
  if (firstSpieltagDate && recurrenceType && recurrenceType !== "none") {
    const template  = spieltagTemplate ?? {};
    const refDate   = new Date(firstSpieltagDate);
    const mode      = monthlyMode ?? "dayOfMonth";
    const dates: Date[] = [refDate];

    for (let i = 1; i < count; i++) {
      dates.push(calcNextDate(dates[i - 1], recurrenceType, mode, refDate));
    }

    await prisma.lulSpieltag.createMany({
      data: dates.map((d, i) => ({
        seasonId:        season.id,
        number:          i + 1,
        scheduledAt:     d,
        game:            template.game            ?? null,
        gameType:        template.gameType         ?? null,
        platform:        template.platform         ?? null,
        tournamentFormat: template.tournamentFormat ?? null,
        statFields:      template.statFields?.length
          ? JSON.stringify(template.statFields)
          : null,
        maxPlayers:      template.maxPlayers ?? null,
        status:          "upcoming",
      })),
    });
  } else if (firstSpieltagDate) {
    // Nur erster Spieltag ohne Recurrence
    const template = spieltagTemplate ?? {};
    await prisma.lulSpieltag.create({
      data: {
        seasonId:        season.id,
        number:          1,
        scheduledAt:     new Date(firstSpieltagDate),
        game:            template.game            ?? null,
        gameType:        template.gameType         ?? null,
        platform:        template.platform         ?? null,
        tournamentFormat: template.tournamentFormat ?? null,
        statFields:      template.statFields?.length
          ? JSON.stringify(template.statFields)
          : null,
        maxPlayers:      template.maxPlayers ?? null,
        status:          "upcoming",
      },
    });
  }

  const created = await prisma.lulSeason.findUnique({
    where: { id: season.id },
    include: { spieltage: { orderBy: { number: "asc" } } },
  });

  return NextResponse.json(created, { status: 201 });
}
