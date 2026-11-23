"use client";
// Event-Wizard: Einstieg (Einzel-Event oder Eventreihe) und Schritt-Navigation. Zustand und Aktionen
// stehen in ./wizard/useEventWizard.ts, die einzelnen Schritte in ./wizard/steps/*.
import { ChevronLeft, ChevronRight, Repeat, Check, CalendarDays } from "@/components/icons";
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
  const { seasonPrefill, eventTemplate, gamePrefill, pendingDraft, restoreDraft, discardDraft, router, wizardMode, setWizardMode, step, setStep, loading, isEventMode, isSeriesMode, showsTournamentStep, canProceed, handleSubmitEvent, handleSubmitSeries } = w;

  const eventStepComponents = showsTournamentStep
    ? [StepCategory, StepEventData, StepTournament, StepRewards, StepEventSummary]
    : [StepCategory, StepEventData, StepRewards, StepEventSummary];
  // Statistiken (StepSeriesEventSettings) vor den Belohnungen: erst festlegen, was erfasst wird und wie
  // viele Punkte es gibt — die Reihentabelle in StepRewards baut darauf auf.
  const seriesStepComponents = [StepCategory, StepSeriesData, StepSchedule, StepSeriesEventSettings, StepRewards, StepSeriesSummary];
  const activeSteps = isEventMode ? eventStepComponents : seriesStepComponents;

  // Mitglieder-Events (Ersteller ohne Mod-Rolle): Hinweis auf Freigabe und Obergrenzen
  const communityHint = props.isCommunity && (
    <div className="mb-6 rounded-control border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3 text-xs text-amber-100/90 space-y-1">
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
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────────
  // Begrenzen: ein wiederhergestellter Entwurf oder ein Wechsel des Event-Typs kann die Schrittanzahl ändern
  const CurrentStep = activeSteps[Math.min(step, activeSteps.length - 1)];
  const isLastStep  = step >= activeSteps.length - 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
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
            onClick={() => { setWizardMode("select"); setStep(0); }}
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
              : isSeriesMode ? "Neue Eventreihe" : "Neues Event"}
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
          Vorausgefüllt aus „{seasonPrefill.oldSeriesName}". Alles ist editierbar — Start- und Enddatum bitte prüfen.
        </p>
      )}

      <StepIndicator w={w} />

      <div className="rounded-card border border-line bg-surface p-4 sm:p-6 mb-4">
        <CurrentStep w={w} />
      </div>

      {/* Navigation klebt unten (über der unteren Leiste am Handy), damit "Weiter" immer erreichbar ist */}
      <div className="sticky bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4 z-20 flex gap-3 rounded-card border border-line bg-sidebar p-2.5 shadow-pop">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex min-h-11 items-center gap-2 px-5 rounded-control text-sm font-semibold text-fg border border-line-strong bg-surface-2 hover:bg-surface-3 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Zurück
          </button>
        )}
        <button
          type="button"
          disabled={!canProceed() || loading}
          onClick={() => {
            if (!isLastStep) setStep(s => s + 1);
            else if (isEventMode) handleSubmitEvent();
            else handleSubmitSeries();
          }}
          className="flex-1 flex min-h-11 items-center justify-center gap-2 rounded-control text-sm font-bold bg-primary text-primary-ink hover:bg-primary-hover transition-colors disabled:opacity-40">
          {loading
            ? "Wird erstellt…"
            : isLastStep
            ? (<><Check className="w-4 h-4" /> {seasonPrefill ? "Saison erstellen" : isSeriesMode ? "Eventreihe erstellen" : "Event erstellen"}</>)
            : (<>Weiter <ChevronRight className="w-4 h-4" /></>)}
        </button>
      </div>
    </div>
  );
}
