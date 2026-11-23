"use client";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import { fromDatetimeLocalBerlin, formatBerlinDateTime } from "@/lib/time";
import { CATEGORIES } from "../shared";
import { formatLabel } from "@/lib/tournament-formats";
import AnnouncementPreview from "./AnnouncementPreview";
import { useDiscordChannelName } from "@/components/DiscordChannelSelect";
import type { EventWizard } from "../useEventWizard";
import { CHECK_IN_MINUTES } from "@/lib/checkin";

// ── Step 4 (Event): Zusammenfassung ───────────────────────────────────────────
export default function StepEventSummary({ w }: { w: EventWizard }) {
  const { squads, category, eventType, spectatorMode, title, startAt, endAt, game, genre, maxPlayers, discordChannelId, seriesMode, newSeriesName, format, publishMode, publishAt, startInPast, seriesFixedFormat, playHomeAway, isRoundRobinFamily, pointsMode, coinsWin, coinsDraw, checkInEnabled, eventRegistrationLocked, eventSquadId, participationCoins, participationRankPts, placements, spectatorCoins, spectatorRankPts, polls, belongsToSeries, selectedSeries } = w;
  const channelName = useDiscordChannelName(discordChannelId);
  const catCfg  = CATEGORIES.find(c => c.value === category);
  const genreCfg = genre ? GENRES.find(g => g.value === genre) : null;
  return (
    <div className="space-y-4">
      <div className={`rounded-card p-5 border-2 ${catCfg?.border ?? ""} ${catCfg?.bg ?? ""}`}>
        <div className="flex items-center gap-3 mb-3">
          {catCfg && <AppIcon kind="category" name={catCfg.value} size={40} className="text-3xl" />}
          <div>
            <p className={`text-lg font-bold ${catCfg?.color}`}>{title}</p>
            <p className="text-xs text-subtle">{catCfg?.label} · {eventType === "tournament" ? "Mit Platzierung" : "Ohne Platzierung"}</p>
          </div>
        </div>
        <div className="space-y-1 text-sm text-fg/90">
          {startAt && <p>📅 {formatBerlinDateTime(fromDatetimeLocalBerlin(startAt), { dateStyle: "medium", timeStyle: "short" })}</p>}
          {endAt && <p>⏹️ Ende: {formatBerlinDateTime(fromDatetimeLocalBerlin(endAt), { dateStyle: "medium", timeStyle: "short" })}</p>}
          {game && <p>🎮 {game}{genreCfg ? ` · ${genreCfg.label}` : ""}</p>}
          {maxPlayers && <p>👥 Max. {maxPlayers} Spieler</p>}
          {spectatorMode && <p>👁️ Zuschauer-Modus aktiv</p>}
          {eventType === "tournament" && (
            <p>⚔️ Format: {formatLabel(!seriesFixedFormat && format === "round_robin" && playHomeAway ? "liga" : (seriesFixedFormat ?? format))}
              {isRoundRobinFamily && pointsMode === "matchResult" && ` · ${coinsWin} Münzen/Sieg, ${coinsDraw}/Unentschieden`}</p>
          )}
          {eventType === "tournament" && checkInEnabled && <p>✅ Check-in {CHECK_IN_MINUTES} Min. vor Start</p>}
          {w.isBlocksEvent && w.blocks.kind === "tournament" && (
            <p>🧱 Live-Turnier · Vorrunde {w.blocks.groupRounds} Runden · Finale {w.blocks.finalRounds} Runden · Top {w.blocks.advancePerGroup} je Gruppe ins Finale{checkInEnabled ? ` · Check-in ${CHECK_IN_MINUTES} Min. vor Start` : ""}</p>
          )}
          {w.isBlocksChallenge && (
            <p>🧱 Challenge · gemeinsam {w.blocks.goal.toLocaleString("de-DE")} {w.blocks.metric === "score" ? "Punkte" : "Linien"} · Belohnung ab {w.blocks.minContribution.toLocaleString("de-DE")}: {w.blocks.rewardCoins} Münzen{w.blocks.rewardRankPoints ? ` + ${w.blocks.rewardRankPoints} Rang-Punkte` : ""}</p>
          )}
          {(w.eventOmaOriginal || w.isBlocksEvent || (seriesMode === "existing" && selectedSeries?.omaOriginal)) && (
            <p className="text-primary-fg font-semibold">OMA Original · Logo auf dem Cover</p>
          )}
          {seriesMode === "existing" && selectedSeries && <p>🔁 Reihe: {selectedSeries.name}</p>}
          {seriesMode === "new" && newSeriesName && <p>🔁 Neue Reihe: {newSeriesName}</p>}
          {discordChannelId && <p>📢 Kanal: {channelName}</p>}
          {publishMode === "hidden" && <p className="text-primary-fg">🔒 Unsichtbar – wird erst beim Sichtbarschalten angekündigt</p>}
          {publishMode === "scheduled" && publishAt && (
            <p className="text-primary-fg">🕒 Veröffentlichung am {formatBerlinDateTime(fromDatetimeLocalBerlin(publishAt), { dateStyle: "medium", timeStyle: "short" })}</p>
          )}
          {startInPast && <p className="text-amber-400">⚠️ Start liegt in der Vergangenheit</p>}
          {eventRegistrationLocked && <p className="text-primary-fg">🔐 Selbst-Anmeldung deaktiviert</p>}
          {eventSquadId && <p className="text-primary-fg">🛡️ Nur für Squad: {squads.find(s => s.id === eventSquadId)?.name}</p>}
        </div>
      </div>
      <div className="rounded-control p-4 border border-line bg-surface-2 text-sm space-y-1.5 text-muted">
        <p className="text-xs text-subtle font-semibold uppercase tracking-wider mb-2">Belohnungen</p>
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
