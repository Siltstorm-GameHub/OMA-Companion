"use client";
import Link from "next/link";
import { CalendarPlus } from "@/components/icons";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { Repeat } from "@/components/icons";
import { RefreshCw, Save, Coins, ExternalLink, Archive, Vote, Trash2, EyeOff, Clock, Lock } from "@/components/icons";
import RankPointsIcon from "@/components/RankPointsIcon";
import SeriesIcon from "@/components/SeriesIcon";
import { formatBerlinDate } from "@/lib/time";
import { inputCls, SETTINGS_TABS, needsAttention, STATUS_CONFIG, EventHiddenToggle, type SeriesDetailProps } from "./series-shared";
import { useSeriesDetail } from "./useSeriesDetail";
import SeriesTabGeneral from "./SeriesTabGeneral";
import SeriesTabGoal from "./SeriesTabGoal";
import SeriesTabRewards from "./SeriesTabRewards";
import SeriesTabPolls from "./SeriesTabPolls";
import SeriesTabStats from "./SeriesTabStats";
import SeriesTabLegacy from "./SeriesTabLegacy";

/** Verwaltung einer Eventreihe: Kopf, Einstellungs-Reiter, Termine. Zustand und Aktionen in
 *  ./useSeriesDetail.tsx, die Reiter in ./SeriesTab*.tsx, gemeinsame Bausteine in ./series-shared.tsx. */
export default function SeriesDetailClient(props: SeriesDetailProps) {
  const ctx = useSeriesDetail(props);
  const { series, hasActiveSibling, isModerator, canUndoCompletion, isArchived, undoConfirm, setUndoConfirm, undoing, saving, activeSettingsTab, setActiveSettingsTab, generatingNext, showGenerateModal, setShowGenerateModal, generateDateStr, setGenerateDateStr, deleteConfirm, setDeleteConfirm, deleting, deleteRevertCoins, setDeleteRevertCoins, deleteRevertRankPoints, setDeleteRevertRankPoints, name, description, icon, seriesColor, recurrenceType, hidden, registrationLocked, sortedSeriesEvents, saveSettings, openGenerateModal, generateNextEvent, undoCompletion, deleteSeries, ConfirmDialogElement, settingsDirty, discardSettings, confirm } = ctx;
  // Mitglieder dürfen ihre Reihe löschen, solange kein Termin abgeschlossen ist (api/admin/series/[id])
  const memberCanDelete = !isModerator && series.status === "active"
    && !(series.events as { status: string }[]).some(e => e.status === "finished" || e.status === "umfrage");

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/events/verwalten" className="flex items-center gap-1 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Eventreihen
        </Link>
        <span>/</span>
        <span className="text-gray-300">{series.name}</span>
      </div>

      {/* Neue-Saison-Hinweis (archiviert, aber noch keine aktive Folgesaison) */}
      {series.status === "archived" && !hasActiveSibling && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-teal-500/20 bg-teal-500/[0.06]">
          <Repeat className="w-4 h-4 text-teal-400 shrink-0" />
          <p className="flex-1 text-sm text-teal-200">
            Diese Saison ist archiviert, es wurde aber noch keine neue Saison gestartet.
            {!isModerator && " Eine neue Saison richtet ein Mod ein."}
          </p>
          {isModerator && (
            <Link
              href={`/events/verwalten/reihen/${series.id}/new-season`}
              className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-teal-300 hover:text-teal-200 border border-teal-500/30 hover:border-teal-500/50 rounded-lg px-3 py-1.5 transition-all"
            >
              Neue Saison einrichten <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-start justify-between gap-4 flex-wrap pl-4">
        <div className="absolute left-0 top-0.5 bottom-0.5 w-1 rounded-r-full" style={{ background: seriesColor }} />
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
            style={{ background: `${seriesColor}1a`, border: `1px solid ${seriesColor}40` }}>
            <SeriesIcon name={icon} className="w-5 h-5" />
          </div>
          <div className="space-y-1 min-w-0">
            {/* Name, Beschreibung und Regeln bearbeitest du im Reiter "Allgemein" */}
            <h1 className="text-2xl font-bold break-words" style={{ color: seriesColor }}>{name || series.name}</h1>
            {description && <p className="text-sm text-gray-500">{description}</p>}
            <p className="text-xs text-gray-500">
              {hidden ? "Ausgeblendet" : "Sichtbar"} · {registrationLocked ? "Anmeldung gesperrt" : "Anmeldung offen"}
            </p>
          </div>
        </div>
        {/* Sichtbarkeit, Anmeldung und Squad: Reiter "Allgemein" (wirken sofort) */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href={`/events/series/${series.id}`}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-300 border border-line hover:border-line-strong rounded-lg px-3 py-1.5 transition-all whitespace-nowrap shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Öffentlich ansehen
          </Link>
          {/* Saisonabschluss (Endwertung, Auszahlung) machen nur Mods */}
          {!isModerator ? null : series.status === "archived" ? (
            <Link
              href={`/events/verwalten/reihen/${series.id}/complete`}
              className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-500/20 hover:border-violet-500/40 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap shrink-0"
            >
              <Vote className="w-3.5 h-3.5" /> Abschluss bearbeiten
            </Link>
          ) : (
            <Link
              href={`/events/verwalten/reihen/${series.id}/complete`}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 border border-amber-500/20 hover:border-amber-500/40 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap shrink-0"
            >
              <Archive className="w-3.5 h-3.5" /> Reihe abschließen
            </Link>
          )}
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* ── Left column: Settings ── */}
        <div className="space-y-4">

          {/* Settings-Tabs */}
          <div className="flex gap-1 border-b border-line overflow-x-auto">
            {/* Legacy (Altpunkte für beliebige Mitglieder) pflegen nur Mods */}
            {SETTINGS_TABS.filter(tab => isModerator || tab.key !== "legacy").map(tab => (
              <button key={tab.key} type="button" onClick={() => setActiveSettingsTab(tab.key)}
                className={`px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSettingsTab === tab.key
                    ? "text-teal-300 border-b-2 border-teal-500 -mb-px"
                    : "text-gray-500 hover:text-gray-300"
                }`}>
                {!isModerator && tab.key === "stats" ? "Mehr" : tab.label}
              </button>
            ))}
          </div>

          {/* ── Tab: Allgemein ── */}
          {activeSettingsTab === "general" && <SeriesTabGeneral ctx={ctx} />}
          {activeSettingsTab === "goal" && <SeriesTabGoal ctx={ctx} />}

          {/* ── Tab: Belohnungen ── */}
          {activeSettingsTab === "rewards" && <SeriesTabRewards ctx={ctx} />}

          {/* ── Tab: Umfragen ── */}
          {activeSettingsTab === "polls" && <SeriesTabPolls ctx={ctx} />}

          {/* ── Tab: Stats & Bonus ── */}
          {activeSettingsTab === "stats" && <SeriesTabStats ctx={ctx} />}

          {/* ── Tab: Legacy ── */}
          {activeSettingsTab === "legacy" && <SeriesTabLegacy ctx={ctx} />}
        </div>

        {/* ── Right column: Events ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
              Events dieser Reihe
            </h2>
            {isArchived ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <Lock className="w-3 h-3" /> Saison abgeschlossen — keine neuen Termine
              </span>
            ) : (
            <button
              onClick={openGenerateModal} disabled={generatingNext}
              className="flex items-center gap-1.5 text-xs text-teal-300 hover:text-white border border-teal-600/40 hover:bg-teal-600 rounded-lg px-3 py-1.5 transition-all disabled:opacity-50"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              {generatingNext ? "Erstellt…" : recurrenceType ? "Nächsten Termin anlegen" : "Termin hinzufügen"}
            </button>
            )}
          </div>

          {series.events.length === 0 ? (
            <div className="text-center py-8 text-gray-600 text-sm border border-line rounded-xl">
              Noch keine Events in dieser Reihe
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-line">
              {sortedSeriesEvents.map((ev, i) => {
                const st = STATUS_CONFIG[ev.status] ?? { label: ev.status, cls: "text-gray-500" };
                const isFinished = ev.status === "finished";
                const isFirstFinished = isFinished && sortedSeriesEvents[i - 1]?.status !== "finished";
                const date = formatBerlinDate(ev.startAt, {
                  day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                });
                const attention = needsAttention(ev);
                return (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors ${
                      i > 0 ? "border-t border-line" : ""
                    } ${isFirstFinished ? "border-t-2 border-t-line" : ""} ${
                      isFinished ? "opacity-60 hover:opacity-90" : ""
                    } ${ev.hidden ? "opacity-60" : ""}`}
                  >
                    <Link href={`/events/verwalten/${ev.id}`} className="flex-1 min-w-0 group">
                      <p className="text-sm text-white truncate flex items-center gap-2 flex-wrap group-hover:text-teal-200">
                        {ev.title}
                        <span className="text-gray-500 font-normal"> · {formatBerlinDate(ev.startAt, { day: "numeric", month: "numeric", year: "numeric" })}</span>
                        {ev.hidden && (
                          <span className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 shrink-0 flex items-center gap-1">
                            <EyeOff className="w-2.5 h-2.5" /> ausgeblendet
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-600">{date}</p>
                    </Link>
                    {attention && (
                      <Link href={attention.href} title={attention.label}
                        className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 shrink-0 hover:bg-amber-500/20">
                        <Clock className="w-2.5 h-2.5" /> {attention.label}
                      </Link>
                    )}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-600">
                        {ev._count.registrations}{ev.maxPlayers ? `/${ev.maxPlayers}` : ""} Spieler
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${st.cls}`}>
                        {st.label}
                      </span>
                      <EventHiddenToggle id={ev.id} hidden={ev.hidden} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Danger Zone — Löschen bleibt Moderatoren/Admins vorbehalten, auch für Captains ihres eigenen Squads */}
      {(isModerator || memberCanDelete) && (
      <div className="rounded-xl border border-red-900/30 bg-red-950/10 p-4 space-y-3">
        <p className="text-xs font-semibold text-red-400 uppercase tracking-widest">Danger Zone</p>

        {isModerator && isArchived && (
          <div className="space-y-2 pb-3 border-b border-red-900/30">
            {!undoConfirm ? (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-gray-300 font-medium">Abschluss rückgängig machen</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {canUndoCompletion
                      ? "Die Saison wird wieder aktiv, Endplatzierungs- und Abstimmungs-Belohnungen werden zurückgebucht, der Eventreihen-Pokal entfällt."
                      : "Nicht mehr möglich — es gibt bereits eine spätere Saison."}
                  </p>
                </div>
                <button onClick={async () => {
                    if (await confirm({
                      title: "Saisonabschluss aufheben",
                      description: `Die Saison „${series.name}“ wird wieder aktiv. Alle Münzen und Rang-Punkte aus Endplatzierung und Saison-Abstimmung werden zurückgebucht, der Eventreihen-Pokal entfällt. Beim Abschluss gelöschte Termine kommen nicht zurück.`,
                      variant: "danger", confirmLabel: "Abschluss aufheben",
                    })) await undoCompletion();
                  }} disabled={!canUndoCompletion || undoing}
                  className="flex items-center gap-1.5 text-sm text-red-400 border border-red-800/40 hover:border-red-600/60 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none">
                  <RefreshCw className="w-3.5 h-3.5" /> Aufheben
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-300">
                  Abschluss von <span className="font-semibold text-white">„{series.name}“</span> wirklich aufheben? Alle Münzen und Rang-Punkte aus
                  Endplatzierung und Saison-Abstimmung werden den Usern wieder abgezogen. Beim Abschluss gelöschte Termine kommen nicht zurück.
                </p>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setUndoConfirm(false)} disabled={undoing}
                    className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-line hover:border-line-strong transition-colors">
                    Abbrechen
                  </button>
                  <button onClick={undoCompletion} disabled={undoing}
                    className="text-sm font-semibold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                    {undoing ? "Wird aufgehoben…" : "Ja, Abschluss aufheben"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!deleteConfirm ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-300 font-medium">Eventreihe löschen</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Löscht die Reihe und alle {series.events.length} zugehörigen Event(s) unwiderruflich.
              </p>
            </div>
            <button
              onClick={() => setDeleteConfirm(true)}
              className="flex items-center gap-1.5 text-sm text-red-400 border border-red-800/40 hover:border-red-600/60 hover:bg-red-900/20 px-3 py-1.5 rounded-lg transition-colors shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" /> Löschen
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-300">
              Bist du sicher? Die Reihe <span className="font-semibold text-white">„{series.name}“</span> und
              alle <span className="font-semibold text-white">{series.events.length} zugehörigen Events</span> (inkl.
              Anmeldungen, Turniere &amp; Matches) werden unwiderruflich gelöscht.
            </p>
            {isModerator && <div className="space-y-2 rounded-lg border border-line bg-black/20 p-3">
              <p className="text-xs text-gray-500">
                Bereits vergebene Belohnungen aus abgeschlossenen Events dieser Reihe:
              </p>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteRevertCoins}
                  onChange={(e) => setDeleteRevertCoins(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-600/50"
                />
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                Vergebene Münzen den Usern wieder abziehen
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteRevertRankPoints}
                  onChange={(e) => setDeleteRevertRankPoints(e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-600/50"
                />
                <RankPointsIcon size={12} />
                Vergebene Rang-Punkte den Usern wieder abziehen
              </label>
              <p className="text-xs text-gray-600">
                Unangeklickt behalten User ihre bisher erhaltenen Münzen/Rang-Punkte aus dieser Reihe.
              </p>
            </div>}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-line hover:border-line-strong transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={deleteSeries}
                disabled={deleting}
                className="text-sm font-semibold text-white bg-red-700 hover:bg-red-600 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? "Löschen…" : "Ja, endgültig löschen"}
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {showGenerateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-line bg-gray-900 p-4 space-y-3">
            <p className="text-sm font-semibold text-white flex items-center gap-1.5">
              <CalendarPlus className="w-4 h-4 text-teal-300" /> {recurrenceType ? "Nächsten Termin generieren" : "Termin hinzufügen"}
            </p>
            <p className="text-xs text-gray-500">
              {recurrenceType
                ? "Vorgeschlagen anhand der Wiederholungsregel — du kannst das Datum bei Bedarf anpassen, ohne die feste Wiederholung der Reihe zu verändern."
                : "Diese Reihe hat keine automatische Wiederholung — wähle das Datum für den neuen Termin manuell."}
            </p>
            <input
              type="datetime-local"
              value={generateDateStr}
              onChange={(e) => setGenerateDateStr(e.target.value)}
              className={inputCls}
            />
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generatingNext}
                className="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg border border-line hover:border-line-strong transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={generateNextEvent}
                disabled={generatingNext || !generateDateStr}
                className="text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                {generatingNext ? "Erstellt…" : "Termin erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Speicherleiste: erscheint bei ungespeicherten Änderungen ── */}
      {settingsDirty && (
        <div className="sticky bottom-20 lg:bottom-4 z-30">
          <div className="flex items-center gap-3 rounded-xl border border-amber-400/40 bg-gray-900/95 px-3 py-2.5 shadow-card">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <span className="flex-1 min-w-0 truncate text-sm text-gray-200">Ungespeicherte Änderungen an der Reihe</span>
            <button type="button" onClick={discardSettings} disabled={saving}
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-300 hover:text-white hover:bg-line disabled:opacity-50">
              Verwerfen
            </button>
            <button type="button" onClick={saveSettings} disabled={saving}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 px-3.5 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {saving ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </div>
      )}
      {ConfirmDialogElement}
    </div>
  );
}
