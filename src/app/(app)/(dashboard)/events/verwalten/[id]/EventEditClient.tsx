"use client";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import { Save, Trophy, CheckCircle2, ExternalLink } from "@/components/icons";
import SeriesIcon from "@/components/SeriesIcon";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import { LIFECYCLE_STEPS } from "@/lib/event-manage";
import { HeaderMenu, type EventEditProps } from "./edit-shared";
import { useEventEdit } from "./useEventEdit";
import TabDetails from "./TabDetails";
import TabRewards from "./TabRewards";
import TabSchedule from "./TabSchedule";
import TabBracket from "./TabBracket";
import TabParticipants from "./TabParticipants";
import TabSeries from "./TabSeries";
import TabGoal from "./TabGoal";

/** Bearbeiten-Seite eines Events: Kopf, Ablauf-Leiste, Reiter und Speicherleiste. Zustand und Aktionen
 *  in ./useEventEdit.tsx, die Reiter in ./Tab*.tsx, gemeinsame Bausteine in ./edit-shared.tsx. */
export default function EventEditClient(props: EventEditProps) {
  const ctx = useEventEdit(props);
  const { event, isSeriesEvent, loading, activeTab, setActiveTab, ConfirmDialogElement, dirty, changedCount, discardChanges, handleSave, isUpcoming, canDelete, deleteEvent, tabs, bracketTournament, step, statusLine, nextStep, backHref } = ctx;

  return (
    <div className="space-y-4 pb-28">
      {/* ── Kopf ── */}
      <div className="space-y-2">
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-subtle hover:text-fg/90 transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          {event.series ? <><SeriesIcon name={event.series.icon} className="w-3.5 h-3.5" /> {event.series.name}</> : "Events verwalten"}
        </Link>
        <div className="flex items-start gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight break-words">{event.title}</h1>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <EventCategoryBadge category={event.category ?? "casual"} />
              {event.hidden && <span className="rounded border border-danger/30 bg-danger-soft px-1.5 py-0.5 text-xs font-medium text-danger">Ausgeblendet</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/tournament/${event.id}`}
              className="flex items-center gap-1.5 text-xs text-fg/90 hover:text-fg border border-line-strong hover:border-line-strong rounded-control px-3 py-1.5 transition-colors max-lg:min-h-10">
              <ExternalLink className="w-3.5 h-3.5" /> Öffentliche Seite
            </Link>
            <HeaderMenu
              duplicateHref={`/events/verwalten/neu?from=${event.id}`}
              deleteLabel={canDelete ? (isUpcoming ? "Event absagen" : "Event löschen") : null}
              onDelete={deleteEvent}
            />
          </div>
        </div>
      </div>

      {/* ── Ablauf ── */}
      <section aria-label="Ablauf" className="glass rounded-card p-3 sm:p-4 space-y-3">
        <ol className="grid grid-cols-4 gap-1.5">
          {LIFECYCLE_STEPS.map((label, i) => (
            <li key={label} className={`border-t-[3px] pt-1.5 text-center text-xs ${
              i < step ? "border-primary/60 text-muted" : i === step ? "border-primary text-fg font-semibold" : "border-line text-subtle"
            }`} aria-current={i === step ? "step" : undefined}>
              {label}
            </li>
          ))}
        </ol>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="flex-1 min-w-0 text-xs text-muted">{statusLine}</p>
          {nextStep && (nextStep.href ? (
            <Link href={nextStep.href} className="shrink-0 inline-flex items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-3 py-1.5 text-xs font-semibold text-primary-ink transition-colors max-lg:min-h-10">
              <CheckCircle2 className="w-3.5 h-3.5" /> {nextStep.label}
            </Link>
          ) : (
            <button type="button" onClick={() => setActiveTab(nextStep.tab!)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-control border border-line-strong bg-line hover:bg-line px-3 py-1.5 text-xs font-semibold text-fg transition-colors max-lg:min-h-10">
              <Trophy className="w-3.5 h-3.5" /> {nextStep.label}
            </button>
          ))}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-line overflow-x-auto scrollbar-none">
        {tabs.map(tab => (
          <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? "text-primary-fg border-b-2 border-primary -mb-px"
                : "text-subtle hover:text-fg/90"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Termin einer Reihe mit festem Spiel: Belohnungen, Umfragen und Wertung kommen aus der Reihe —
          ohne diesen Hinweis wirkt der fehlende Reiter "Belohnungen" wie ein Fehler */}
      {isSeriesEvent && (
        <p className="flex flex-wrap items-center gap-x-1.5 rounded-control border border-primary/35 bg-primary-soft/60 px-3 py-2 text-xs text-fg/90">
          Belohnungen, Umfragen und Wertung legt die Eventreihe fest.
          <Link href={backHref} className="font-semibold text-primary-fg hover:text-fg">Zur Reihe „{event.series.name}“</Link>
        </p>
      )}

      {/* ── Tab: Details (eine Ansicht für Einzel- und Reihen-Events) ── */}
      {activeTab === "details" && <TabDetails ctx={ctx} />}

      {/* ── Tab: Belohnungen ── */}
      {activeTab === "rewards" && <TabRewards ctx={ctx} />}

      {/* ── Tab: Turnier ── */}
      {activeTab === "tournament" && <TabSchedule ctx={ctx} />}

      {/* ── Tab: Turnierbaum (Reihen-Event: reduzierte Ansicht ohne Turnier-Einstellungen) ── */}
      {activeTab === "bracket" && bracketTournament && <TabBracket ctx={ctx} />}

      {/* ── Tab: Teilnehmer ── */}
      {activeTab === "participants" && <TabParticipants ctx={ctx} />}

      {/* ── Tab: Reihe ── */}
      {activeTab === "series" && event.series &&
        (event.format === "single_elimination" || event.format === "double_elimination" || event.format === "group_knockout") && <TabSeries ctx={ctx} />}
      {activeTab === "goal" && <TabGoal ctx={ctx} />}

      {/* ── Speicherleiste: erscheint bei ungespeicherten Änderungen (alle Einstellungen, siehe formSnapshot) ── */}
      {dirty && (
        <div className="sticky bottom-20 lg:bottom-4 z-30">
          <div className="flex items-center gap-3 rounded-control border border-amber-400/40 bg-surface-2/95 px-3 py-2.5 shadow-card">
            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
            <span className="flex-1 min-w-0 truncate text-sm text-fg">
              {changedCount === 1 ? "1 ungespeicherte Änderung" : `${changedCount} ungespeicherte Änderungen`}
            </span>
            <button type="button" onClick={discardChanges} disabled={loading}
              className="shrink-0 rounded-control px-3 py-1.5 text-xs font-semibold text-fg/90 hover:text-fg hover:bg-line disabled:opacity-50">
              Verwerfen
            </button>
            <button type="button" onClick={handleSave} disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-control bg-primary hover:bg-primary-hover px-3.5 py-1.5 text-xs font-semibold text-primary-ink disabled:opacity-50 max-lg:min-h-10">
              <Save className="w-3.5 h-3.5" /> {loading ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </div>
      )}
      {ConfirmDialogElement}
    </div>
  );
}
