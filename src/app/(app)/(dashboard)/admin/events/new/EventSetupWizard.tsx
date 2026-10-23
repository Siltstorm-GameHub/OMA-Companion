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
  const { seasonPrefill, eventTemplate, pendingDraft, restoreDraft, discardDraft, router, wizardMode, setWizardMode, step, setStep, loading, isEventMode, isSeriesMode, showsTournamentStep, canProceed, handleSubmitEvent, handleSubmitSeries } = w;

  const eventStepComponents = showsTournamentStep
    ? [StepCategory, StepEventData, StepTournament, StepRewards, StepEventSummary]
    : [StepCategory, StepEventData, StepRewards, StepEventSummary];
  const seriesStepComponents = [StepCategory, StepSeriesData, StepSchedule, StepRewards, StepSeriesEventSettings, StepSeriesSummary];
  const activeSteps = isEventMode ? eventStepComponents : seriesStepComponents;

  // Gefundener lokaler Entwurf: übernehmen oder verwerfen (siehe wizard/draft.ts)
  const draftBanner = pendingDraft && (
    <div className="mb-6 rounded-xl border border-teal-500/30 bg-teal-500/10 px-4 py-3 flex items-center gap-3 flex-wrap">
      <p className="text-sm text-teal-200 flex-1 min-w-[200px]">
        Ungespeicherter Entwurf vom {formatBerlinDateTime(new Date(pendingDraft.savedAt), { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })} Uhr
        {typeof pendingDraft.values.title === "string" && pendingDraft.values.title ? ` („${pendingDraft.values.title}“)` : ""} gefunden.
      </p>
      <button type="button" onClick={restoreDraft}
        className="text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg px-3 py-1.5">
        Wiederherstellen
      </button>
      <button type="button" onClick={discardDraft} className="text-xs text-gray-400 hover:text-white">
        Verwerfen
      </button>
    </div>
  );

  // ── Render: Mode Selection ───────────────────────────────────────────────────
  if (wizardMode === "select") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        {draftBanner}
        <div className="mb-8">
          <h1 className="text-xl font-bold text-white mb-1">Neues Event erstellen</h1>
          <p className="text-sm text-gray-500">Wähle, was du erstellen möchtest.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button type="button" onClick={() => setWizardMode("event")}
            className="flex flex-col items-center gap-3 rounded-2xl p-6 border-2 border-teal-500/40 bg-teal-500/10 hover:bg-teal-500/20 transition-all text-center">
            <span className="text-4xl">📅</span>
            <div>
              <p className="text-base font-semibold text-teal-300">Einzelnes Event</p>
              <p className="text-xs text-gray-500 mt-1">Einmaliger Termin, optional einer bestehenden Reihe zuordnen</p>
            </div>
          </button>
          <button type="button" onClick={() => setWizardMode("series")}
            className="flex flex-col items-center gap-3 rounded-2xl p-6 border-2 border-violet-500/40 bg-violet-500/10 hover:bg-violet-500/20 transition-all text-center">
            <span className="text-4xl">🔁</span>
            <div>
              <p className="text-base font-semibold text-violet-300">Neue Eventreihe</p>
              <p className="text-xs text-gray-500 mt-1">Wiederkehrende Reihe mit Gesamttabelle und gemeinsamen Belohnungen</p>
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
            onClick={() => router.push(`/admin/series/${seasonPrefill.oldSeriesId}`)}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            Zurück zur Reihe
          </button>
        ) : (
          <button type="button"
            onClick={() => { setWizardMode("select"); setStep(0); }}
            className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
            <ChevronLeft className="w-3.5 h-3.5" />
            Zurück zur Auswahl
          </button>
        )}
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          {isSeriesMode
            ? <Repeat className="w-4 h-4 text-violet-400" />
            : <CalendarDays className="w-4 h-4 text-teal-400" />}
          <h1 className="text-xl font-bold text-white">
            {seasonPrefill
              ? `Saison ${seasonPrefill.seasonNumber} einrichten`
              : isSeriesMode ? "Neue Eventreihe" : "Neues Event"}
          </h1>
        </div>
      </div>

      {draftBanner}

      {eventTemplate && (
        <p className="text-xs text-gray-500 -mt-3 mb-6">
          Kopie von „{eventTemplate.sourceTitle}“ — Einstellungen und Belohnungen sind übernommen, Teilnehmer
          und Ergebnisse nicht. Datum ist eine Woche später vorgeschlagen, bitte prüfen.
        </p>
      )}

      {seasonPrefill && (
        <p className="text-xs text-gray-500 -mt-3 mb-6">
          Vorausgefüllt aus „{seasonPrefill.oldSeriesName}". Alles ist editierbar — Start- und Enddatum bitte prüfen.
        </p>
      )}

      <StepIndicator w={w} />

      <div className="rounded-2xl p-6 mb-6"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <CurrentStep w={w} />
      </div>

      <div className="flex gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(s => s - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-gray-400 border border-white/10 hover:border-white/20 transition-colors">
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
          className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-40"
          style={{
            background: isSeriesMode
              ? "linear-gradient(135deg, #7c3aed, #8b5cf6)"
              : "linear-gradient(135deg, #0d9488, #14b8a6)",
          }}>
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
