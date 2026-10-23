"use client";
import { GENRES } from "@/lib/app-icons";
import AppIcon from "@/components/AppIcon";
import { fromDatetimeLocalBerlin, formatBerlinDateTime, formatBerlinDate } from "@/lib/time";
import { CATEGORIES, FORMATS, RECURRENCE_OPTS } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 4 (Series): Zusammenfassung ──────────────────────────────────────────
export default function StepSeriesSummary({ w }: { w: EventWizard }) {
  const { squads, category, eventType, spectatorMode, seriesName, fixedGame, fixedGenre, seriesDiscordId, seriesFormat, seriesStartDate, seriesEndDate, recurrenceType, statRows, seriesHidden, seriesRegistrationLocked, seriesSquadId, eventStatFields, winnerStatField, participationCoins, participationRankPts, placements, spectatorCoins, spectatorRankPts, polls, isSeriesMode, previewDates } = w;
  const catCfg   = CATEGORIES.find(c => c.value === category);
  const genreCfg = fixedGenre ? GENRES.find(g => g.value === fixedGenre) : null;
  const recLabel = RECURRENCE_OPTS.find(r => r.value === recurrenceType)?.label ?? "Keine";
  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-5 border-2 ${catCfg?.border ?? ""} ${catCfg?.bg ?? ""}`}>
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🔁</span>
          {catCfg && <AppIcon kind="category" name={catCfg.value} size={40} className="text-3xl" />}
          <div>
            <p className={`text-lg font-bold ${catCfg?.color}`}>{seriesName || "Eventreihe"}</p>
            <p className="text-xs text-gray-500">{catCfg?.label} · {eventType === "tournament" ? "Turnier-Reihe" : "Community-Reihe"}</p>
          </div>
        </div>
        <div className="space-y-1 text-sm text-gray-300">
          {fixedGame && <p>🎮 {fixedGame}{genreCfg ? ` · ${genreCfg.label}` : ""}</p>}
          {eventType === "tournament" && <p>⚔️ Format: {FORMATS.find(f => f.value === seriesFormat)?.label}</p>}
          <p>🔄 Wiederholung: {recLabel}</p>
          {seriesStartDate && <p>📅 Start: {formatBerlinDateTime(fromDatetimeLocalBerlin(seriesStartDate), { dateStyle: "medium", timeStyle: "short" })}</p>}
          {seriesEndDate && <p>⏹️ Ende: {formatBerlinDate(fromDatetimeLocalBerlin(seriesEndDate + "T00:00"), { dateStyle: "medium" })}</p>}
          {previewDates.length > 0 && seriesEndDate && (
            <p>📋 {previewDates.length} Termine werden direkt angelegt</p>
          )}
          {seriesDiscordId && <p>📢 Kanal: {seriesDiscordId}</p>}
          {spectatorMode && <p>👁️ Zuschauer-Standard aktiv</p>}
          {seriesHidden && <p className="text-violet-400">🔒 Unsichtbar – wird nicht veröffentlicht</p>}
          {seriesRegistrationLocked && <p className="text-violet-400">🔐 Selbst-Anmeldung deaktiviert</p>}
          {seriesSquadId && <p className="text-violet-400">🛡️ Nur für Squad: {squads.find(s => s.id === seriesSquadId)?.name}</p>}
        </div>
      </div>
      <div className="rounded-xl p-4 border border-white/8 bg-white/2 text-sm space-y-1.5 text-gray-400">
        <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider mb-2">Standard-Belohnungen</p>
        <p>✅ Teilnahme: {participationCoins} Münzen{participationRankPts > 0 ? ` + ${participationRankPts} RP` : ""}</p>
        {placements.map(p => (
          <p key={p.place}>🏅 {p.place}. Platz: {p.coins} Münzen{p.rankPoints > 0 ? ` + ${p.rankPoints} RP` : ""}</p>
        ))}
        {spectatorMode && <p>👁️ Zuschauer: {spectatorCoins} Münzen{spectatorRankPts > 0 ? ` + ${spectatorRankPts} RP` : ""}</p>}
        {polls.map((poll, i) => (
          <p key={i}>📊 {poll.label || `Poll ${i + 1}`}: Abstimmung ({poll.winnerCoins > 0 ? `Sieger: ${poll.winnerCoins} Münzen` : ""})</p>
        ))}
        {isSeriesMode && eventType === "tournament" && statRows.length > 0 && (
          <p>📊 Gesamttabelle: {statRows.map(r => `${r.field} (${r.pointsPer} Pkt/Einheit)`).join(", ")}</p>
        )}
        {eventStatFields.length > 0 && (
          <p>📋 Event-Stats: {eventStatFields.join(", ")}</p>
        )}
{winnerStatField && (
          <p>🏆 Sieger via: {winnerStatField}{statRows.filter(r => r.isWinnerStat && r.field).length > 0 ? ` → Reihenstat(s) „${statRows.filter(r => r.isWinnerStat && r.field).map(r => r.field).join(", ")}" +1` : ""}</p>
        )}
      </div>
    </div>
  );
}
