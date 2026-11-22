"use client";
import Link from "next/link";
import CoinIcon from "@/components/CoinIcon";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeriesIcon from "@/components/SeriesIcon";
import { ChevronLeft } from "@/components/icons";
import { CheckCircle2, Trophy, Plus } from "@/components/icons";
import { userName , type Props } from "./series-complete-shared";
import { useSeriesComplete } from "./useSeriesComplete";
import SeriesCompleteRanking from "./SeriesCompleteRanking";
import SeriesCompletePoll from "./SeriesCompletePoll";
import SeriesCompletePollResult from "./SeriesCompletePollResult";
import SeriesCompleteNewSeason from "./SeriesCompleteNewSeason";
import SeriesCompletePlayedOpen from "./SeriesCompletePlayedOpen";
import SeriesCompleteOpenEvents from "./SeriesCompleteOpenEvents";
import SeriesCompleteWinnerPreview from "./SeriesCompleteWinnerPreview";

/** Saisonabschluss einer Eventreihe: Kopf, Abschnitte, Knöpfe und Bestätigungs-Zusammenfassung. Zustand und
 *  Aktionen in ./useSeriesComplete.tsx, Abschnitte in ./SeriesComplete*.tsx, Bausteine in ./series-complete-shared.tsx. */
export default function SeriesCompleteClient(props: Props) {
  const ctx = useSeriesComplete(props);
  const { seriesId, seriesName, seriesIcon, participants, isReEdit, openEvents, playedOpenEvents, isTournamentSeries, isPollOnly, rankingOrder, pollEnabled, startNewSeason, confirmPollOnly, setConfirmPollOnly, loading, rankingGroups, pollWinners, payoutPreview, effectiveOpenEventsAction, handleConfirm } = ctx;

  return (
    <div className="space-y-4 p-5 sm:p-6 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/events/verwalten/reihen/${seriesId}`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <SeriesIcon name={seriesIcon} className="w-3.5 h-3.5" />
          {seriesName}
        </Link>
        <span>/</span>
        <span className="text-gray-300">
          {isPollOnly ? "Abstimmung nachtragen" : isReEdit ? "Abschluss bearbeiten" : "Eventreihe abschließen"}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-teal-400" />
        <h1 className="text-lg font-bold text-white">
          {isPollOnly ? "Abstimmung nachtragen" : isReEdit ? "Abschluss bearbeiten" : "Eventreihe abschließen"}
        </h1>
        <span className="text-sm text-gray-500">· {seriesName}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

        {/* ── Left: Ranking + Poll ── */}
        <div className="space-y-4">

          {/* Gesamtplatzierung */}
          {!isPollOnly && <SeriesCompleteRanking ctx={ctx} />}

          {/* Poll */}
          {!isReEdit && <SeriesCompletePoll ctx={ctx} />}

          {/* Poll: Kandidaten ausschließen + Ergebnis eintragen (isPollOnly oder pollEnabled) */}
          {(isPollOnly || pollEnabled) && <SeriesCompletePollResult ctx={ctx} />}
        </div>

        {/* ── Right: Neue Saison + Übersicht ── */}
        <div className="space-y-4">

          {/* Neue Saison (nur beim ersten Abschluss) */}
          {!isReEdit && <SeriesCompleteNewSeason ctx={ctx} />}

          {/* Gespielt, aber nicht abgeschlossen: erst abschließen */}
          {playedOpenEvents.length > 0 && <SeriesCompletePlayedOpen ctx={ctx} />}

          {/* Kommende offene Termine */}
          {openEvents.length > 0 && <SeriesCompleteOpenEvents ctx={ctx} />}

          {/* Gesamtsieger-Vorschau */}
          {!isPollOnly && rankingOrder.length > 0 && <SeriesCompleteWinnerPreview ctx={ctx} />}

          {/* Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => setConfirmPollOnly(false)}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              {loading ? "Wird gespeichert…"
                : isPollOnly ? "Abstimmung & Änderungen speichern"
                : isReEdit ? "Änderungen speichern"
                : "Eventreihe abschließen & archivieren"}
            </button>

            {!isReEdit && pollEnabled && pollWinners.length === 0 && (
              <button
                onClick={() => setConfirmPollOnly(true)}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-medium text-gray-400 border border-line bg-surface-2 hover:border-line-strong hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Abschließen – Abstimmungsergebnis später nachtragen
              </button>
            )}
          </div>

          {/* Zusammenfassung vor dem endgültigen Bestätigen */}
          {confirmPollOnly !== null && (() => {
            const preview = payoutPreview(confirmPollOnly);
            const totalCoins = preview.reduce((sum, r) => sum + r.coins, 0);
            const totalRank = preview.reduce((sum, r) => sum + r.rankPoints, 0);
            const pokalIds = isTournamentSeries ? (rankingGroups[0] ?? []) : [];
            const nameOf = (uid: string) => { const u = participants.find(p => p.id === uid); return u ? userName(u) : uid.slice(0, 8); };
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70" onClick={() => !loading && setConfirmPollOnly(null)}>
                <div className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl bg-gray-900 border border-line-strong p-5 space-y-4" onClick={e => e.stopPropagation()}>
                  <h2 className="text-base font-bold text-white">
                    {isReEdit ? "Änderungen speichern?" : "Saison abschließen?"}
                  </h2>

                  {isReEdit && (
                    <p className="text-[11px] text-amber-300/80 rounded-lg px-3 py-2 bg-amber-500/10 border border-amber-500/20">
                      Die bisherige Vergabe wird vollständig zurückgebucht und durch die folgende ersetzt.
                    </p>
                  )}

                  <div className="space-y-1.5">
                    <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Auszahlung</p>
                    {preview.length === 0 ? (
                      <p className="text-xs text-gray-500">Keine Münzen oder Rang-Punkte.</p>
                    ) : (
                      <>
                        {preview.map(r => (
                          <div key={r.uid} className="flex items-center gap-2 text-xs">
                            <span className="w-6 text-gray-500 text-center">{r.place ? `${r.place}.` : "–"}</span>
                            <span className="flex-1 text-white truncate">
                              {nameOf(r.uid)}
                              {r.poll && <span className="ml-1.5 text-[10px] text-violet-400">Abstimmung</span>}
                            </span>
                            {r.coins > 0 && <span className="flex items-center gap-0.5 text-amber-400 tabular-nums">+{r.coins} <CoinIcon size={11} /></span>}
                            {r.rankPoints > 0 && <span className="flex items-center gap-0.5 text-teal-400 tabular-nums">+{r.rankPoints} <RankPointsIcon size={11} /></span>}
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-xs border-t border-line-strong pt-1.5">
                          <span className="flex-1 text-gray-400">Summe</span>
                          <span className="flex items-center gap-0.5 text-amber-400 tabular-nums">{totalCoins} <CoinIcon size={11} /></span>
                          <span className="flex items-center gap-0.5 text-teal-400 tabular-nums">{totalRank} <RankPointsIcon size={11} /></span>
                        </div>
                      </>
                    )}
                  </div>

                  {pokalIds.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Eventreihen-Pokal</p>
                      <p className="text-xs text-amber-200 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-400" /> {pokalIds.map(nameOf).join(", ")}</p>
                    </div>
                  )}

                  {openEvents.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium">Offene Termine</p>
                      <p className="text-xs text-gray-300">
                        {openEvents.length} Termin{openEvents.length === 1 ? "" : "e"}: {effectiveOpenEventsAction === "move"
                          ? "werden in die neue Saison verschoben"
                          : effectiveOpenEventsAction === "delete" ? "werden gelöscht" : "bleiben in dieser Saison"}
                      </p>
                    </div>
                  )}

                  {!isReEdit && (
                    <p className="text-[11px] text-gray-500">
                      Danach ist die Saison gesperrt: keine neuen Termine und keine Änderungen an Punkteregeln oder Belohnungen mehr.
                      {startNewSeason ? " Anschließend richtest du die neue Saison ein." : ""}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmPollOnly(null)} disabled={loading}
                      className="flex-1 rounded-xl py-2.5 text-xs font-medium text-gray-300 border border-line-strong hover:bg-line disabled:opacity-50">
                      Zurück
                    </button>
                    <button type="button" onClick={() => handleConfirm(confirmPollOnly)} disabled={loading}
                      className="flex-1 rounded-xl py-2.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-600 disabled:opacity-50">
                      {loading ? "Wird gespeichert…" : "Bestätigen"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Hinweis neue Saison */}
          {!isReEdit && startNewSeason && (
            <div className="rounded-lg px-3 py-2 bg-surface-2 border border-line">
              <p className="text-[10px] text-gray-500 flex items-start gap-1.5">
                <Plus className="w-3 h-3 shrink-0 mt-0.5 text-teal-500" />
                Nach dem Abschluss wirst du zum Saison-Assistenten weitergeleitet, um die neue Saison einzurichten.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
