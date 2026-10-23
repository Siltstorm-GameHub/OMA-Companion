"use client";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import { fromDatetimeLocalBerlin, formatBerlinDateTime } from "@/lib/time";
import { CATEGORIES } from "../shared";
import { formatLabel } from "@/lib/tournament-formats";
import AnnouncementPreview from "./AnnouncementPreview";
import type { EventWizard } from "../useEventWizard";

// ── Step 4 (Event): Zusammenfassung ───────────────────────────────────────────
export default function StepEventSummary({ w }: { w: EventWizard }) {
  const { squads, category, eventType, spectatorMode, title, startAt, endAt, game, genre, maxPlayers, discordChannelId, seriesMode, newSeriesName, format, publishMode, publishAt, startInPast, seriesFixedFormat, playHomeAway, isRoundRobinFamily, pointsMode, coinsWin, coinsDraw, checkInEnabled, checkInMinutes, eventRegistrationLocked, eventSquadId, gemsDifficulty, gemsMaxAttempts, isGemsTournament, participationCoins, participationRankPts, placements, spectatorCoins, spectatorRankPts, polls, belongsToSeries, selectedSeries } = w;
  const catCfg  = CATEGORIES.find(c => c.value === category);
  const genreCfg = genre ? GENRES.find(g => g.value === genre) : null;
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-5 border-2 ${catCfg?.border ?? ""} ${catCfg?.bg ?? ""}`}>
        <div className="flex items-center gap-3 mb-3">
          {catCfg && <AppIcon kind="category" name={catCfg.value} size={40} className="text-3xl" />}
          <div>
            <p className={`text-lg font-bold ${catCfg?.color}`}>{title}</p>
            <p className="text-xs text-gray-500">{catCfg?.label} · {eventType === "tournament" ? "Turnier" : "Community-Event"}</p>
          </div>
        </div>
        <div className="space-y-1 text-sm text-gray-300">
          {startAt && <p>📅 {formatBerlinDateTime(fromDatetimeLocalBerlin(startAt), { dateStyle: "medium", timeStyle: "short" })}</p>}
          {endAt && <p>⏹️ Ende: {formatBerlinDateTime(fromDatetimeLocalBerlin(endAt), { dateStyle: "medium", timeStyle: "short" })}</p>}
          {game && <p>🎮 {game}{genreCfg ? ` · ${genreCfg.label}` : ""}</p>}
          {maxPlayers && <p>👥 Max. {maxPlayers} Spieler</p>}
          {spectatorMode && <p>👁️ Zuschauer-Modus aktiv</p>}
          {eventType === "tournament" && !isGemsTournament && (
            <p>⚔️ Format: {formatLabel(!seriesFixedFormat && format === "round_robin" && playHomeAway ? "liga" : (seriesFixedFormat ?? format))}
              {isRoundRobinFamily && pointsMode === "matchResult" && ` · ${coinsWin} Münzen/Sieg, ${coinsDraw}/Unentschieden`}</p>
          )}
          {eventType === "tournament" && !isGemsTournament && checkInEnabled && <p>✅ Check-in {checkInMinutes} Min. vor Start</p>}
          {isGemsTournament && endAt && (
            <p>💎 Turnier bis {formatBerlinDateTime(fromDatetimeLocalBerlin(endAt), { dateStyle: "medium", timeStyle: "short" })} · {gemsDifficulty === "EASY" ? "Einfach" : gemsDifficulty === "HARD" ? "Schwer" : "Mittel"} · max. {gemsMaxAttempts} Versuche</p>
          )}
          {seriesMode === "existing" && selectedSeries && <p>🔁 Reihe: {selectedSeries.name}</p>}
          {seriesMode === "new" && newSeriesName && <p>🔁 Neue Reihe: {newSeriesName}</p>}
          {discordChannelId && <p>📢 Kanal: {discordChannelId}</p>}
          {publishMode === "hidden" && <p className="text-violet-400">🔒 Unsichtbar – wird erst beim Sichtbarschalten angekündigt</p>}
          {publishMode === "scheduled" && publishAt && (
            <p className="text-violet-400">🕒 Veröffentlichung am {formatBerlinDateTime(fromDatetimeLocalBerlin(publishAt), { dateStyle: "medium", timeStyle: "short" })}</p>
          )}
          {startInPast && <p className="text-amber-400">⚠️ Start liegt in der Vergangenheit</p>}
          {eventRegistrationLocked && <p className="text-violet-400">🔐 Selbst-Anmeldung deaktiviert</p>}
          {eventSquadId && <p className="text-violet-400">🛡️ Nur für Squad: {squads.find(s => s.id === eventSquadId)?.name}</p>}
        </div>
      </div>
      <div className="rounded-xl p-4 border border-white/8 bg-white/2 text-sm space-y-1.5 text-gray-400">
        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Belohnungen</p>
        <p>✅ Teilnahme: {belongsToSeries ? "Münzen laut Eventreihe" : `${participationCoins} Münzen`}{participationRankPts > 0 ? ` + ${participationRankPts} RP` : ""}</p>
        {placements.map(p => (
          <p key={p.place}>🏅 {p.place}. Platz: {p.coins} Münzen{p.rankPoints > 0 ? ` + ${p.rankPoints} RP` : ""}</p>
        ))}
        {spectatorMode && <p>👁️ Zuschauer: {belongsToSeries ? "Münzen laut Eventreihe" : `${spectatorCoins} Münzen`}{spectatorRankPts > 0 ? ` + ${spectatorRankPts} RP` : ""}</p>}
        {polls.map((poll, i) => (
          <p key={i}>📊 {poll.label || `Poll ${i + 1}`}: Abstimmung ({poll.winnerCoins > 0 ? `Sieger: ${poll.winnerCoins} Münzen` : ""})</p>
        ))}
      </div>
      <AnnouncementPreview w={w} />
    </div>
  );
}
