"use client";
// Event-Wizard: Einstieg (Einzel-Event oder Eventreihe) und Schritt-Navigation. Zustand und Aktionen
// stehen in ./wizard/useEventWizard.ts, die einzelnen Schritte in ./wizard/steps/*.
import { useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Repeat, Check, CalendarDays, Copy, Eye } from "@/components/icons";
import EventPreviewCard from "./wizard/steps/EventPreviewCard";
import { formatBerlinDateTime } from "@/lib/time";
import { useEventWizard, type EventWizardProps } from "./wizard/useEventWizard";
import StepIndicator from "./wizard/steps/StepIndicator";
import StepCategory from "./wizard/steps/StepCategory";
import StepEventData from "./wizard/steps/StepEventData";
import StepTournament from "./wizard/steps/StepTournament";
import StepSeriesData from "./wizard/steps/StepSeriesData";
import StepSchedule from "./wizard/steps/StepSchedule";
import StepRewards from "./wizard/steps/StepRewards";
import StepSeriesEventSettings from "./wizard/steps/StepSeriesEventSettings";
import StepEventSummary from "./wizard/steps/StepEventSummary";
import StepSeriesSummary from "./wizard/steps/StepSeriesSummary";

export default function EventSetupWizard(props: EventWizardProps) {
  const w = useEventWizard(props);
  // (4) Schnell anlegen: nur Grunddaten + Zusammenfassung, Rest mit Vorgaben (später unter "Weitere Einstellungen")
  const [quick, setQuick] = useState(false);
  const stepCardRef = useRef<HTMLDivElement>(null);
  const { seasonPrefill, eventTemplate, gamePrefill, pendingDraft, restoreDraft, discardDraft, router, wizardMode, setWizardMode, step, setStep, loading, isEventMode, isSeriesMode, showsTournamentStep, canProceed, handleSubmitEvent, handleSubmitSeries } = w;

  const eventStepComponents = showsTournamentStep
    ? [StepCategory, StepEventData, StepTournament, StepRewards, StepEventSummary]
    : [StepCategory, StepEventData, StepRewards, StepEventSummary];
  // Statistiken (StepSeriesEventSettings) vor den Belohnungen: erst festlegen, was erfasst wird und wie
  // viele Punkte es gibt — die Reihentabelle in StepRewards baut darauf auf.
  const seriesStepComponents = [StepCategory, StepSeriesData, StepSchedule, StepSeriesEventSettings, StepRewards, StepSeriesSummary];
  const activeSteps = isEventMode ? (quick ? [StepEventData, StepEventSummary] : eventStepComponents) : seriesStepComponents;

  // Mitglieder-Events (Ersteller ohne Mod-Rolle): Hinweis auf Freigabe und Obergrenzen
  const communityHint = props.isCommunity && (
    <div className="mb-6 rounded-control border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-amber-100/90 space-y-1">
      <p className="font-semibold text-amber-300">Mitglieder-Event</p>
      <p>Dein Event ist sofort in der App sichtbar. Auf Discord angekündigt und per Push gemeldet wird es erst, nachdem ein Mod es freigegeben hat.</p>
      <p>Für Belohnungen (Münzen, Rang-Punkte) gibt es Obergrenzen. Du siehst sie direkt an den Feldern.</p>
    </div>
  );

  // Gefundener lokaler Entwurf: übernehmen oder verwerfen (siehe wizard/draft.ts)
  const draftBanner = pendingDraft && (
    <div className="mb-6 rounded-control border border-primary/30 bg-primary/10 px-4 py-3 flex items-center gap-3 flex-wrap">
      <p className="text-sm text-primary-fg flex-1 min-w-[200px]">
        Ungespeicherter Entwurf vom {formatBerlinDateTime(new Date(pendingDraft.savedAt), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr
        {typeof pendingDraft.values.title === "string" && pendingDraft.values.title ? ` („${pendingDraft.values.title}“)` : ""} gefunden.
      </p>
      <button type="button" onClick={restoreDraft}
        className="text-xs font-semibold text-primary-ink bg-primary hover:bg-primary-hover rounded-control px-3 py-1.5">
        Wiederherstellen
      </button>
      <button type="button" onClick={discardDraft} className="text-xs text-muted hover:text-fg">
        Verwerfen
      </button>
    </div>
  );

  // ── Render: Mode Selection ───────────────────────────────────────────────────
  if (wizardMode === "select") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {draftBanner}
        {communityHint}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-fg mb-1">Neues Event erstellen</h1>
          <p className="text-sm text-subtle">Wähle, was du erstellen möchtest.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button type="button" onClick={() => setWizardMode("event")}
            className="flex flex-col items-center gap-3 rounded-card p-6 border-2 border-primary/40 bg-primary/10 hover:bg-primary/20 transition-all text-center">
            <span className="text-4xl">📅</span>
            <div>
              <p className="text-base font-semibold text-primary-fg">Einzelnes Event</p>
              <p className="text-xs text-subtle mt-1">Einmaliger Termin, optional einer bestehenden Reihe zuordnen</p>
            </div>
          </button>
          <button type="button" onClick={() => setWizardMode("series")}
            className="flex flex-col items-center gap-3 rounded-card p-6 border-2 border-primary/35 bg-primary-soft/60 hover:bg-primary-soft transition-all text-center">
            <span className="text-4xl">🔁</span>
            <div>
              <p className="text-base font-semibold text-primary-fg">Neue Eventreihe</p>
              <p className="text-xs text-subtle mt-1">Wiederkehrende Reihe mit Reihentabelle und gemeinsamen Belohnungen</p>
            </div>
          </button>

        </div>

        {/* (4) Schnell anlegen */}
        <button type="button" onClick={() => { setQuick(true); setWizardMode("event"); setStep(0); }}
          className="mt-4 flex w-full items-center gap-3 rounded-card border border-line bg-surface p-4 text-left shadow-card hover:border-line-strong hover:bg-surface-2 transition-colors">
          <span className="text-2xl">⚡</span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-fg">Schnell anlegen</span>
            <span className="block text-xs text-muted">Titel, Spiel, Termin, Plätze — fertig. Alles andere mit sinnvollen Vorgaben, änderbar.</span>
          </span>
          <ChevronRight className="size-4 shrink-0 text-subtle" />
        </button>

        {/* (2) Wie zuletzt: eigene Events als Vorlage */}
        {(props.recentEvents?.length ?? 0) > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">Wie zuletzt — als Vorlage kopieren</p>
            <ul className="space-y-1.5">
              {props.recentEvents!.map(e => (
                <li key={e.id}>
                  <a href={`/events/verwalten/neu?from=${e.id}`}
                    className="flex min-h-12 items-center gap-3 rounded-control border border-line bg-surface px-3 hover:border-line-strong hover:bg-surface-2 transition-colors">
                    <Copy className="size-4 shrink-0 text-primary-fg" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-fg">{e.title}</span>
                      <span className="block truncate text-xs text-subtle">
                        {formatBerlinDateTime(new Date(e.startAt), { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}{e.game && ` · ${e.game}`}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-primary-fg">Kopieren</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  // Begrenzen: ein wiederhergestellter Entwurf oder ein Wechsel des Event-Typs kann die Schrittanzahl ändern
  const CurrentStep = activeSteps[Math.min(step, activeSteps.length - 1)];
  const isLastStep  = step >= activeSteps.length - 1;

  // (1) Was fehlt noch? Statt eines stummen grauen Knopfs
  const problem: string | null = CurrentStep === StepEventData
    ? w.eventDataProblem()
    : CurrentStep === StepSeriesData && !w.seriesName.trim() ? "Gib der Reihe einen Namen." : null;
  const withPreview = isEventMode;

  return (
    <div className={`${withPreview ? "max-w-5xl" : "max-w-2xl"} mx-auto px-4 py-8`}>
      <div className="mb-6 flex items-center gap-3">
        {seasonPrefill ? (
          <button type="button"
            onClick={() => router.push(`/events/verwalten/reihen/${seasonPrefill.oldSeriesId}`)}
            className="min-h-9 text-sm text-muted hover:text-fg flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Zurück zur Reihe
          </button>
        ) : (
          <button type="button"
            onClick={() => { setWizardMode("select"); setStep(0); setQuick(false); }}
            className="min-h-9 text-sm text-muted hover:text-fg flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Zurück zur Auswahl
          </button>
        )}
        <div className="h-3 w-px bg-line" />
        <div className="flex items-center gap-2">
          {isSeriesMode
            ? <Repeat className="w-4 h-4 text-primary-fg" />
            : <CalendarDays className="w-4 h-4 text-primary" />}
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg">
            {seasonPrefill
              ? `Saison ${seasonPrefill.seasonNumber} einrichten`
              : isSeriesMode ? "Neue Eventreihe" : quick ? "Event schnell anlegen" : "Neues Event"}
          </h1>
        </div>
      </div>

      {draftBanner}
      {communityHint}

      {eventTemplate && (
        <p className="text-xs text-subtle -mt-3 mb-6">
          Kopie von „{eventTemplate.sourceTitle}“ — Einstellungen und Belohnungen sind übernommen, Teilnehmer
          und Ergebnisse nicht. Datum ist eine Woche später vorgeschlagen, bitte prüfen.
        </p>
      )}

      {gamePrefill && !eventTemplate && (
        <p className="text-xs text-subtle -mt-3 mb-6">
          {gamePrefill.slug
            ? <>Spiel aus der Spieleliste übernommen: <span className="text-fg/90">{gamePrefill.name}</span>. Titel, Termin und Format legst du jetzt fest.</>
            : <>OMA Blocks ist ausgewählt — als <span className="text-fg/90">Live-Turnier im Versus-Modus</span> oder Community-Challenge. Titel und Termin legst du jetzt fest.</>}
        </p>
      )}

      {seasonPrefill && (
        <p className="text-xs text-subtle -mt-3 mb-6">
          Vorausgefüllt aus „{seasonPrefill.oldSeriesName}“. Alles ist editierbar — Start- und Enddatum bitte prüfen.
        </p>
      )}

      <StepIndicator w={w} labels={quick ? ["Grunddaten", "Zusammenfassung"] : undefined} />

      <div className={withPreview ? "lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6" : ""}>
        <div className="min-w-0">
          {/* (3) Vorschau am Handy: aufklappbar über dem Formular */}
          {withPreview && (
            <details className="group mb-3 lg:hidden">
              <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-control border border-line bg-surface px-3 text-sm font-semibold text-fg [&::-webkit-details-marker]:hidden">
                <Eye className="size-4 text-primary-fg" /> Vorschau ansehen
                <ChevronRight className="ml-auto size-4 text-subtle transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-2"><EventPreviewCard w={w} /></div>
            </details>
          )}
          <div ref={stepCardRef} className="rounded-card border border-line bg-surface p-4 sm:p-6 mb-4 scroll-mt-36">
            <CurrentStep w={w} />
          </div>
          {quick && isLastStep && (
            <button type="button" onClick={() => { setQuick(false); setStep(0); }}
              className="mb-4 flex w-full min-h-11 items-center justify-center gap-2 rounded-control border border-line-strong bg-surface-2 text-sm font-semibold text-fg hover:bg-surface-3">
              Weitere Einstellungen (Kategorie, Format, Belohnungen)
            </button>
          )}
        </div>
        {/* (3) Vorschau am Desktop: klebt rechts neben dem Formular */}
        {withPreview && (
          <aside className="hidden lg:block lg:sticky lg:top-24">
            <EventPreviewCard w={w} />
          </aside>
        )}
      </div>

      {/* Navigation klebt unten (über der unteren Leiste am Handy), damit "Weiter" immer erreichbar ist */}
      <div className={`sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4 z-20 rounded-card border border-line bg-sidebar p-2.5 shadow-pop ${withPreview ? "lg:max-w-[calc(100%-19.5rem)]" : ""}`}>
        {problem && (
          <p className="mb-2 flex items-start gap-1.5 px-1 text-xs font-semibold text-warning" role="status">
            <span aria-hidden>⚠</span> Es fehlt noch: {problem}
          </p>
        )}
        <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex min-h-11 items-center gap-2 px-5 rounded-control text-sm font-semibold text-fg border border-line-strong bg-surface-2 hover:bg-surface-3 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Zurück
          </button>
        )}
        <button
          type="button"
          disabled={loading}
          aria-disabled={!!problem || !canProceed()}
          onClick={() => {
            // Unvollständig: nicht weiter, sondern zeigen, was fehlt
            if (problem || !canProceed()) {
              toast.error(problem ?? "Bitte die Pflichtfelder ausfüllen.");
              stepCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              const firstEmpty = stepCardRef.current?.querySelector<HTMLInputElement>("input[required]:placeholder-shown, input:not([type=checkbox]):not([type=radio]):placeholder-shown");
              firstEmpty?.focus({ preventScroll: true });
              return;
            }
            if (!isLastStep) setStep(s => s + 1);
            else if (isEventMode) handleSubmitEvent();
            else handleSubmitSeries();
          }}
          className={`flex-1 flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-bold bg-primary text-primary-ink hover:bg-primary-hover transition-colors disabled:opacity-40 ${problem ? "opacity-60" : ""}`}>
          {loading
            ? "Wird erstellt…"
            : isLastStep
            ? (<><Check className="w-4 h-4" /> {seasonPrefill ? "Saison erstellen" : isSeriesMode ? "Eventreihe erstellen" : "Event erstellen"}</>)
            : (<>Weiter <ChevronRight className="w-4 h-4" /></>)}
        </button>
        </div>
      </div>
    </div>
  );
}
