// ============================================
// Cron: löst Saison 1 automatisch aus, sobald das Admin-Startdatum erreicht ist
// + vergibt Ranglisten-Saison-Belohnungen alle 3 Monate danach
// ============================================
// Läuft täglich (siehe vercel.json), zwei voneinander unabhängige Teile:
//  1. Saison 1 (einmalig): sobald das Admin-Startdatum erreicht ist und Saison 1
//     noch nicht lief (season1RanAt), Klassen-/Stats-Neuklassifizierung UND
//     kompletter Karten-Reset ("jeder startet bei 0") — season1RanAt ist danach
//     zugleich der Anker für alle folgenden Ranglisten-Saisons.
//  2. Ranglisten-Saisons (wiederkehrend, alle 3 Monate ab dem Anker): sobald
//     eine Saison vorbei ist, Platz-1-3-Belohnungen vergeben. Die Rangliste
//     selbst braucht keinen aktiven Reset — sie filtert immer nur auf das
//     aktuell laufende Zeitfenster (siehe leaderboard.ts).
// Beide Teile sind jeweils für sich idempotent, kein Doppel-Lauf möglich.

import { NextRequest, NextResponse } from "next/server";
import { getSeasonConfig, markSeason1Ran } from "@/lib/season/season-config";
import { runFullSeasonUpdate } from "@/lib/season/run-season";
import { resetAllCardOwnership, grantDueSeasonRewards } from "@/lib/battle-cards/ranked-season";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getSeasonConfig();

  // ── Teil 1: Saison-1-Auslösung (einmalig) ──
  let season1Result: Record<string, unknown> | null = null;
  if (!config.season1StartAt) {
    season1Result = { skipped: "Kein Startdatum gesetzt" };
  } else if (config.season1RanAt) {
    season1Result = { skipped: "Saison 1 wurde bereits ausgelöst" };
  } else if (new Date() < new Date(config.season1StartAt)) {
    season1Result = { skipped: "Startdatum noch nicht erreicht" };
  } else {
    const result = await runFullSeasonUpdate();
    await resetAllCardOwnership();
    await markSeason1Ran();
    season1Result = { ...result, cardsReset: true };
  }

  // ── Teil 2: fällige Ranglisten-Saison-Belohnungen (wiederkehrend, alle 3 Monate) ──
  // Nutzt den ggf. gerade eben gesetzten season1RanAt-Anker mit (frischer Konfig-Stand nötig).
  const freshConfig = season1Result?.cardsReset ? await getSeasonConfig() : config;
  let rewardedSeasons: number[] = [];
  if (freshConfig.season1RanAt) {
    rewardedSeasons = await grantDueSeasonRewards(
      new Date(freshConfig.season1RanAt),
      freshConfig.lastRewardedRankedSeason
    );
  }

  return NextResponse.json({ ok: true, season1: season1Result, rewardedSeasons });
}
