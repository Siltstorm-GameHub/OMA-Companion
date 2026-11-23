"use client";
import Link from "next/link";
import SeriesIcon from "@/components/SeriesIcon";
import { ChevronLeft } from "@/components/icons";
import { CheckCircle2, Vote, AlertTriangle } from "@/components/icons";
import { useEventComplete } from "./useEventComplete";
import { formatBerlinDateTime } from "@/lib/time";
import type { Props } from "./complete-shared";
import CompleteParticipants from "./CompleteParticipants";
import CompletePlacement from "./CompletePlacement";
import CompleteExtras from "./CompleteExtras";
import CompletePolls from "./CompletePolls";

/** Abschluss-Seite eines Events: Kopf, Hinweise, Abschnitte und feste Zusammenfassung mit Hauptknopf.
 *  Zustand und Aktionen in ./useEventComplete.tsx, die Abschnitte in ./Complete*.tsx, Bausteine in ./complete-shared.tsx. */
export default function EventCompleteClient(props: Props) {
  const ctx = useEventComplete(props);
  const { eventId, pendingSubmissions, matchCheck, predictionInfo, rewardHistory, rewardsCapped, absentPlayers, actionSummary, pollAutoEnd, eventTitle, seriesId, seriesIcon, registeredUsers, spectatorUsers, spectatorRewardJson, isMod, hasPlacement, ConfirmDialogElement, timingWarning, isPollOnly, isFinishedSummary, mvpUserId, spectatorAttended, rankingDirty, excludedUsers, loading, pollWinners, canDeferPoll, pollPhasePending, totals, handleConfirm, backHref, pageTitle, hasExtras, hasPolls, steps, noRanking, mainLabel, nameOf } = ctx;

  return (
    <div className="space-y-4 pb-36">
      {ConfirmDialogElement}

      {/* ── Kopf ── */}
      <div className="space-y-2">
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          {seriesId && <SeriesIcon name={seriesIcon} className="w-3.5 h-3.5" />}
          {eventTitle}
        </Link>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{pageTitle}</h1>
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Schritte springen zum jeweiligen Abschnitt */}
          {steps.map((label, i) => (
            <a key={label} href={`#schritt-${label.toLowerCase()}`}
              className="rounded-md border border-line bg-surface-2 px-2 py-0.5 text-xs text-gray-300 hover:border-primary/40 hover:text-white">
              <span className="font-semibold text-primary-fg">{i + 1}</span> {label}
            </a>
          ))}
          <span className="text-xs text-gray-500">
            · {registeredUsers.length} {registeredUsers.length === 1 ? "Spieler" : "Spieler"}
            {spectatorUsers.length > 0 && ` · ${spectatorUsers.length} Zuschauer`}
          </span>
        </div>
      </div>

      {timingWarning && (
        <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold">{timingWarning.title}</p>
            <p className="text-xs text-amber-200/80 whitespace-pre-line mt-0.5">{timingWarning.description?.split("\n\n")[0]}</p>
          </div>
        </div>
      )}

      {/* Offene Screenshot-/Ergebnis-Meldungen: erst prüfen, dann abschließen */}
      {pendingSubmissions > 0 && !isFinishedSummary && (
        <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold">{pendingSubmissions === 1 ? "1 Meldung wartet auf Prüfung" : `${pendingSubmissions} Meldungen warten auf Prüfung`}</p>
            <p className="text-xs text-amber-200/80 mt-0.5">Ungeprüfte Werte zählen beim Abschluss nicht. Prüf sie am besten vorher.</p>
          </div>
          <Link href={`/events/verwalten/${eventId}/results`} className="shrink-0 text-xs font-semibold text-amber-200 underline hover:text-white">Zur Ergebnis-Prüfung</Link>
        </div>
      )}
      {/* Spiele ohne Ergebnis bzw. nur vorläufig: vor dem Abschluss eintragen bzw. bestätigen */}
      {matchCheck && (matchCheck.open > 0 || matchCheck.provisional > 0) && !isFinishedSummary && (
        <div className="flex items-start gap-2.5 rounded-xl px-4 py-3 bg-amber-500/10 border border-amber-500/25 text-amber-200 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="font-semibold">
              {[
                matchCheck.open > 0 ? `${matchCheck.open} ${matchCheck.open === 1 ? "Spiel" : "Spiele"} ohne Ergebnis` : null,
                matchCheck.provisional > 0 ? `${matchCheck.provisional} nur vorläufig` : null,
              ].filter(Boolean).join(", ")}
            </p>
            <p className="text-xs text-amber-200/80 mt-0.5">
              Fehlende Ergebnisse fehlen auch in Tabelle und Platzierung. Vorläufige stammen aus Spieler-Meldungen und sollten vorher bestätigt werden.
            </p>
          </div>
          <Link href={`/events/verwalten/${eventId}`} className="shrink-0 text-xs font-semibold text-amber-200 underline hover:text-white">Zum Spielplan</Link>
        </div>
      )}
      {/* Sieger-Tipps: der festgelegte Sieger verteilt den Pott */}
      {predictionInfo && !isPollOnly && (
        <p className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 text-xs text-violet-200">
          🎯 {predictionInfo.count} {predictionInfo.count === 1 ? "Tipp" : "Tipps"} auf den Sieger, Pott {predictionInfo.pot} Münzen.{" "}
          {predictionInfo.resolved
            ? "Änderst du den Sieger, wird der Pott automatisch neu verteilt."
            : "Sie werden mit dem Sieger ausgewertet, den du hier festlegst. Ohne Sieger bekommen alle ihren Einsatz zurück."}
        </p>
      )}
      {rewardsCapped && (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-2.5 text-xs text-gray-400">
          Die Beträge sind auf die Obergrenzen für Mitglieder-Events gekürzt. Genau so werden sie ausgezahlt.
        </p>
      )}
      {isPollOnly && pollAutoEnd && (
        <p className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 text-xs text-violet-200">
          Die Umfrage endet automatisch am {formatBerlinDateTime(pollAutoEnd, { weekday: "short", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })} Uhr.
          Danach wird das Event von selbst abgeschlossen und die Umfrage-Belohnungen gehen raus. Du kannst sie auch jetzt schon beenden.
        </p>
      )}

      {/* Modus in Klartext */}
      {isPollOnly && (
        <p className="flex items-start gap-2 rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-3 text-xs text-violet-200">
          <Vote className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Das Spiel ist abgeschlossen, jetzt läuft die Umfrage. Gewinner, Teilnahme und Tabelle stehen fest. Du kannst
            die Stimmen einsehen und die Platzierung noch korrigieren (z.B. bei einer Disqualifikation).
          </span>
        </p>
      )}
      {isFinishedSummary && (
        <p className="flex items-start gap-2 rounded-xl border border-line bg-surface-2 px-4 py-3 text-xs text-gray-300">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-primary" />
          <span>
            Abgeschlossen. Unten siehst du, was vergeben wurde. Die Platzierung lässt sich noch korrigieren — beim
            Bestätigen werden Unterschiede automatisch nach- oder zurückgebucht
            {seriesId ? ", gerechnet mit den aktuellen Einstellungen der Eventreihe" : ""}.
          </span>
        </p>
      )}

      {/* ── Schritt 1 (Community-Event): Teilnehmer — keine Platzierung, nur Teilnahme-Belohnung ── */}
      {!hasPlacement && <CompleteParticipants ctx={ctx} />}

      {/* ── Schritt 1: Platzierung ── */}
      {hasPlacement && <CompletePlacement ctx={ctx} />}

      {/* ── Schritt 2: Extras ── */}
      {hasExtras && <CompleteExtras ctx={ctx} />}

      {/* ── Schritt 3: Umfrage ── */}
      {hasPolls && <CompletePolls ctx={ctx} />}

      {/* ── Protokoll: was bisher gebucht wurde (Abschluss, Korrekturen, Rückbuchungen) ── */}
      {rewardHistory && rewardHistory.length > 0 && (
        <details className="rounded-xl border border-line bg-gray-900/50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-white">
            Buchungen <span className="font-normal text-gray-500">· {rewardHistory.length}</span>
          </summary>
          <ul className="mt-2 max-h-72 overflow-y-auto divide-y divide-line">
            {rewardHistory.map((h, i) => (
              <li key={i} className="flex items-center gap-3 py-1.5 text-xs">
                <span className="w-24 shrink-0 tabular-nums text-gray-500">{formatBerlinDateTime(h.at, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <span className="w-28 shrink-0 truncate text-gray-200">{h.name}</span>
                <span className={`w-14 shrink-0 text-right tabular-nums ${h.amount < 0 ? "text-red-300" : "text-emerald-300"}`}>{h.amount > 0 ? "+" : ""}{h.amount}</span>
                <span className="min-w-0 flex-1 truncate text-gray-500">{h.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* ── Feste Zusammenfassung mit Hauptbutton ── */}
      <div className="sticky bottom-20 lg:bottom-4 z-30">
        <div className="rounded-xl border border-line-strong bg-gray-900/95 px-3 sm:px-4 py-3 shadow-card space-y-2">
          {noRanking && (
            <p className="flex items-center gap-1.5 text-xs text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> Niemand in der Platzierung, es würden keine Platzierungs-Belohnungen vergeben.
            </p>
          )}
          <p className="text-xs text-teal-200/90">Beim Klick auf den Hauptknopf: {actionSummary}</p>
          <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
            {/* Handy: Zusammenfassung über volle Breite, Buttons darunter */}
            <div className="min-w-0 flex-1 basis-full sm:basis-0">
              {isPollOnly ? (
                <p className="text-sm text-gray-200">
                  {pollWinners.length > 0 ? <>Umfrage-Sieger: <b>{pollWinners.map(nameOf).join(", ")}</b></> : "Platzierung und Umfrage prüfen"}
                </p>
              ) : (
                <>
                  <p className="text-sm font-semibold text-white tabular-nums">
                    {totals.players} {totals.players === 1 ? "Spieler" : "Spieler"}
                    {totals.coins > 0 && <> · {totals.coins.toLocaleString("de-DE")} Münzen</>}
                    {totals.rankPoints > 0 && <> · {totals.rankPoints} Rang-Punkte</>}
                    {totals.tablePoints > 0 && <> · {totals.tablePoints} Tabellenpunkte</>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {[
                      excludedUsers.size > 0 && `${excludedUsers.size} disqualifiziert`,
                      absentPlayers.size > 0 && `${absentPlayers.size} nicht da`,
                      mvpUserId && `MVP ${nameOf(mvpUserId)}`,
                      spectatorUsers.length > 0 && spectatorRewardJson && `${spectatorAttended.size} Zuschauer`,
                      pollPhasePending && "Umfrage startet danach",
                      isFinishedSummary && "Unterschiede werden nach- oder zurückgebucht",
                    ].filter(Boolean).join(" · ") || "Teilnahme und Platzierung"}
                  </p>
                </>
              )}
            </div>
            {isPollOnly && isMod && rankingDirty && (
              <button onClick={() => handleConfirm(false, true)} disabled={loading}
                className="shrink-0 rounded-lg border border-line-strong px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-line disabled:opacity-50">
                Nur Platzierung speichern
              </button>
            )}
            {canDeferPoll && (
              <button onClick={() => handleConfirm(true)} disabled={loading}
                title="Spiel jetzt abschließen, den Sieger der Umfrage später eintragen"
                className="shrink-0 rounded-lg border border-line-strong px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-line disabled:opacity-50">
                Umfrage-Sieger später
              </button>
            )}
            <button
              onClick={() => handleConfirm(false)}
              disabled={loading || noRanking}
              className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-primary hover:bg-primary-hover px-4 py-2 text-sm font-semibold text-primary-ink transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" /> {mainLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
