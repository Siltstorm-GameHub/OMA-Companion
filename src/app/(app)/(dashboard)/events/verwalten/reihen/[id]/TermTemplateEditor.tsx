"use client";
import TournamentTemplateEditor from "@/components/TournamentTemplateEditor";
import { Section, inputCls, numCls } from "./series-shared";
import type { SeriesDetail } from "./useSeriesDetail";

/**
 * "Vorlage für neue Termine" — die eine Stelle für alles, was ein neu angelegter Termin übernimmt:
 * Spieler-Limit und Zuschauer (lib/series-term-template.ts) und die Turnier-Einstellungen (Check-in,
 * Gruppenphase, Liga-Punkte; lib/series-seasons.ts). Gespeichert über die Speicherleiste wie die übrigen
 * Einstellungen. Datum und Dauer kommen aus der Planung, Spiel/Format/Umfragen/Ziel aus den anderen Reitern.
 */
export default function TermTemplateEditor({ ctx, termLabel }: { ctx: SeriesDetail; termLabel: string }) {
  const {
    termTemplate: tpl, setTermTemplate: setTpl, applyTermTemplate, setApplyTermTemplate, rewardLimits,
    isTournamentSeries, fixedFormat, tournamentTemplate, setTournamentTemplate, eventStatFields, isArchived, setActiveSettingsTab,
    series,
  } = ctx;
  const savedBefore = !!series.termTemplateJson;

  return (
    <Section title="Vorlage für neue Termine">
      <fieldset disabled={isArchived} className="space-y-3 disabled:opacity-60">
        <p className="text-xs text-subtle">
          Das übernimmt jeder neu angelegte {termLabel}. Datum und Dauer kommen aus der Planung oben, Spiel, Format, Umfragen und Ziel aus den anderen Reitern.
          {!savedBefore && " Bisher übernahmen neue Termine die Werte des letzten Termins — mit dem Speichern gilt diese Vorlage."}
        </p>
        <label className="block text-xs text-subtle">
          Max. Spieler je {termLabel}
          <input type="number" min={2} value={tpl.maxPlayers ?? ""} placeholder="unbegrenzt"
            onChange={e => setTpl(t => ({ ...t, maxPlayers: e.target.value ? Math.max(2, Math.floor(Number(e.target.value)) || 2) : null }))}
            className={`${inputCls} mt-1`} />
        </label>
        <label className="flex items-start gap-2 text-sm text-fg/90 cursor-pointer select-none">
          <input type="checkbox" checked={tpl.spectatorMode} className="rounded mt-0.5"
            onChange={e => setTpl(t => ({ ...t, spectatorMode: e.target.checked }))} />
          <span>Zuschauer können sich anmelden</span>
        </label>
        {tpl.spectatorMode && (
          <div className="flex flex-wrap items-end gap-3 pl-6">
            <label className="text-xs text-subtle">Münzen je Zuschauer
              <input type="number" min={0} value={tpl.spectatorReward.coins} className={`${numCls} mt-1 block`}
                onChange={e => setTpl(t => ({ ...t, spectatorReward: { ...t.spectatorReward, coins: Math.max(0, Math.floor(Number(e.target.value) || 0)) } }))} />
            </label>
            <label className="text-xs text-subtle">Rang-Punkte
              <input type="number" min={0} value={tpl.spectatorReward.rankPoints} className={`${numCls} mt-1 block`}
                onChange={e => setTpl(t => ({ ...t, spectatorReward: { ...t.spectatorReward, rankPoints: Math.max(0, Math.floor(Number(e.target.value) || 0)) } }))} />
            </label>
            {rewardLimits && <p className="text-xs text-subtle w-full">Höchstens {rewardLimits.spectatorCoins} Münzen und {rewardLimits.spectatorRankPoints} Rang-Punkte.</p>}
          </div>
        )}
        <label className="flex items-start gap-2 text-sm text-fg/90 cursor-pointer select-none">
          <input type="checkbox" checked={applyTermTemplate} className="rounded mt-0.5" onChange={e => setApplyTermTemplate(e.target.checked)} />
          <span>
            Spieler-Limit und Zuschauer beim Speichern auch für die schon angelegten, kommenden Termine übernehmen
            <span className="block text-xs text-subtle">Laufende und vergangene Termine bleiben unverändert.</span>
          </span>
        </label>

        {isTournamentSeries && (
          <div className="space-y-2 pt-3 border-t border-line">
            <p className="text-xs font-semibold text-fg">Turnier-Einstellungen</p>
            <p className="text-xs text-subtle">
              Check-in, Gruppenphase und Liga-Punkte. Änderungen gelten auch für kommende Termine, die noch nicht ausgelost sind.
            </p>
            <TournamentTemplateEditor format={fixedFormat} value={tournamentTemplate} onChange={setTournamentTemplate} statFields={eventStatFields} disabled={isArchived} hideGoal />
            <button type="button" onClick={() => setActiveSettingsTab("goal")} className="text-xs font-semibold text-primary-fg hover:text-primary-fg">
              🎯 Community-Ziel der Reihe einstellen →
            </button>
          </div>
        )}
      </fieldset>
    </Section>
  );
}
