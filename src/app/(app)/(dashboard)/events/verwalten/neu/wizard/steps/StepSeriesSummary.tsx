"use client";
import { isBlocksGame } from "@/lib/oma-original";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import { formatBerlinDateTime } from "@/lib/time";
import { MODE_LABEL, TERM_LABEL, describeSchedule } from "@/lib/series-schedule";
import { CATEGORIES, FORMATS } from "../shared";
import type { EventWizard } from "../useEventWizard";
import { seasonChanges } from "../seasonDiff";

// ── Step 4 (Series): Zusammenfassung ──────────────────────────────────────────
export default function StepSeriesSummary({ w }: { w: EventWizard }) {
  const { seasonPrefill, variousGames, statParticipationPts, statSpectatorParticipationPts, dominionEnabled, dominionTriggerStats, dominionThreshold, dominionCoins, dominionSeriesPoints, tournamentTemplate, squads, category, eventType, spectatorMode, seriesName, fixedGame, fixedGenre, seriesDiscordId, seriesFormat, schedule, createFirstEvent, statRows, seriesHidden, seriesRegistrationLocked, seriesSquadId, eventStatFields, winnerStatField, participationCoins, participationRankPts, placements, spectatorCoins, spectatorRankPts, polls, isSeriesMode } = w;
  const catCfg   = CATEGORIES.find(c => c.value === category);
  const genreCfg = fixedGenre ? GENRES.find(g => g.value === fixedGenre) : null;
  const term = TERM_LABEL[schedule.mode];
  const firstCreated = !!schedule.rhythm || createFirstEvent;
  // Neue Saison: was ist anders als in der Vorsaison?
  const changes = seasonPrefill ? seasonChanges(seasonPrefill, {
    name: seriesName, category, eventType, variousGames, fixedGame, seriesFormat, schedule, spectatorMode,
    statParticipationPts, statSpectatorParticipationPts, statRows, eventStatFields, winnerStatField,
    participationCoins, placements, polls,
    dominion: { enabled: dominionEnabled, triggerStats: dominionTriggerStats, threshold: dominionThreshold, coins: dominionCoins, seriesPoints: dominionSeriesPoints },
    seriesHidden, seriesRegistrationLocked, seriesSquadId, tournamentTemplate,
  }) : [];
  return (
    <div className="space-y-4">
      {seasonPrefill && (
        <div className={`rounded-control p-4 border text-sm space-y-1.5 ${changes.length > 0 ? "border-warning/30 bg-warning-soft" : "border-line bg-surface-2"}`}>
          <p className="text-xs font-semibold uppercase tracking-wider mb-1 text-amber-300">
            Gegenüber „{seasonPrefill.oldSeriesName}“ {changes.length > 0 ? `geändert (${changes.length})` : "unverändert"}
          </p>
          {changes.length === 0 ? (
            <p className="text-xs text-subtle">Alle Einstellungen werden 1:1 aus der Vorsaison übernommen.</p>
          ) : (
            <ul className="space-y-0.5">
              {changes.map((c, i) => <li key={i} className="text-xs text-fg/90">• {c}</li>)}
            </ul>
          )}
        </div>
      )}
      <div className={`rounded-card p-5 border-2 ${catCfg?.border ?? ""} ${catCfg?.bg ?? ""}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🔁</span>
          {catCfg && <AppIcon kind="category" name={catCfg.value} size={40} className="text-3xl" />}
          <div>
            <p className={`text-lg font-bold ${catCfg?.color}`}>{seriesName || "Eventreihe"}</p>
            <p className="text-xs text-subtle">{MODE_LABEL[schedule.mode]} · {catCfg?.label} · {eventType === "tournament" ? "Turnier" : "Community"}</p>
          </div>
        </div>
        <div className="space-y-1 text-sm text-fg/90">
          {fixedGame && <p>🎮 {fixedGame}{genreCfg ? ` · ${genreCfg.label}` : ""}</p>}
          {eventType === "tournament" && <p>⚔️ Format: {FORMATS.find(f => f.value === seriesFormat)?.label}</p>}
          <p>🔄 {describeSchedule(schedule)}</p>
          {firstCreated && <p>📅 {schedule.mode === "runden" ? "Erste Runde" : "Erster Termin"}: {formatBerlinDateTime(schedule.anchorAt, { dateStyle: "medium", timeStyle: "short" })}</p>}
          {schedule.rhythm && <p>📋 Immer {schedule.aheadCount === 1 ? (schedule.mode === "runden" ? "die nächste Runde" : "der nächste Termin") : `die nächsten ${schedule.aheadCount} ${term.many}`} im Voraus angelegt{schedule.carryParticipants ? " · Teilnehmer werden übernommen" : ""}</p>}
          {schedule.rhythm && schedule.end.type !== "none" && <p>⏹️ Ende: {schedule.end.type === "date" ? formatBerlinDateTime(schedule.end.at, { dateStyle: "medium" }) : `nach ${schedule.end.count} ${term.many}`}</p>}
          {!firstCreated && <p>📋 Noch kein Termin — Termine legst du in der Reihe einzeln an</p>}
          {seriesDiscordId && <p>📢 Kanal: {seriesDiscordId}</p>}
          {spectatorMode && <p>👁️ Zuschauer-Standard aktiv</p>}
          {((w.seriesOmaOriginal && !w.isCommunity) || (!w.variousGames && isBlocksGame(w.fixedGame))) && <p className="text-primary-fg font-semibold">OMA Original · Logo auf allen Termin-Covern</p>}
          {seriesHidden && <p className="text-primary-fg">🔒 Unsichtbar – wird nicht veröffentlicht</p>}
          {seriesRegistrationLocked && <p className="text-primary-fg">🔐 Selbst-Anmeldung deaktiviert</p>}
          {seriesSquadId && <p className="text-primary-fg">🛡️ Nur für Squad: {squads.find(s => s.id === seriesSquadId)?.name}</p>}
        </div>
      </div>
      <div className="rounded-control p-4 border border-line bg-surface-2 text-sm space-y-1.5 text-muted">
        <p className="text-xs text-subtle font-semibold uppercase tracking-wider mb-2">Standard-Belohnungen</p>
        <p>✅ Teilnahme: {participationCoins} Münzen{participationRankPts > 0 ? ` + ${participationRankPts} RP` : ""}</p>
        {placements.map(p => (
          <p key={p.place}>🏅 {p.place}. Platz: {p.coins} Münzen{p.rankPoints > 0 ? ` + ${p.rankPoints} RP` : ""}</p>
        ))}
        {spectatorMode && <p>👁️ Zuschauer: {spectatorCoins} Münzen{spectatorRankPts > 0 ? ` + ${spectatorRankPts} RP` : ""}</p>}
        {polls.map((poll, i) => (
          <p key={i}>📊 {poll.label || `Poll ${i + 1}`}: Abstimmung ({poll.winnerCoins > 0 ? `Sieger: ${poll.winnerCoins} Münzen` : ""})</p>
        ))}
        {isSeriesMode && statRows.some(r => r.field.trim()) && (
          <p>📋 Statistiken: {statRows.filter(r => r.field.trim()).map(r =>
            typeof r.eventPointsPer === "number"
              ? `${r.field} (Event ${r.eventPointsPer} · Reihentabelle ${r.pointsPer} Pkt/Einheit)`
              : `${r.field} (${r.pointsPer} Pkt/Einheit)`,
          ).join(", ")}</p>
        )}
{winnerStatField && (
          <p>🏆 Sieger via: {winnerStatField}{statRows.filter(r => r.isWinnerStat && r.field).length > 0 ? ` → Reihenstat(s) „${statRows.filter(r => r.isWinnerStat && r.field).map(r => r.field).join(", ")}" +1` : ""}</p>
        )}
      </div>
    </div>
  );
}
