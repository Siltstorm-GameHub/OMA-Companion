"use client";
import { DEFAULT_ADVANCE_PER_GROUP, GROUP_KNOCKOUT_FORMAT } from "@/lib/tournaments/groupStage";
import { CHECK_IN_MINUTES } from "@/lib/checkin";
import type { TournamentTemplate } from "@/lib/series-seasons";
import SeriesGoalEditor from "@/components/SeriesGoalEditor";
import { NumberInput } from "@/components/ui/NumberInput";

const numCls = "w-20 rounded-lg px-2 py-1.5 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-primary/50";

/**
 * Turniervorlage einer Eventreihe: Gruppenphase, Check-in und Punktemodus, die jeder neue Termin der
 * Reihe übernimmt (siehe lib/series-seasons.ts). Ohne festes Format der Reihe werden alle Optionen
 * gezeigt — sie greifen dann nur bei Terminen mit dem passenden Format.
 */
export default function TournamentTemplateEditor({
  format, value, onChange, disabled = false, statFields = [], hideGoal = false, goalRewardLimit = null, goalSeriesPointsLimit = null,
}: {
  /** Mitglieder: Obergrenzen der Ziel-Belohnungen (Anzeige am Feld) */
  goalRewardLimit?: number | null;
  goalSeriesPointsLimit?: number | null;
  /** Ziel nicht hier zeigen (die Reihen-Seite hat dafür den Reiter "Ziel") */
  hideGoal?: boolean;
  /** Festes Format der Reihe (leer = verschiedene Formate) */
  format: string | null | undefined;
  value: TournamentTemplate;
  onChange: (next: TournamentTemplate) => void;
  disabled?: boolean;
  /** Stat-Felder der Reihe — Auswahl für das Community-Ziel */
  statFields?: string[];
}) {
  const anyFormat = !format;
  const showGroups = anyFormat || format === GROUP_KNOCKOUT_FORMAT;
  const showPoints = anyFormat || format === "round_robin" || format === "liga";
  const gs = value.groupStage ?? null;
  const setGs = (patch: Partial<NonNullable<TournamentTemplate["groupStage"]>>) => onChange({
    ...value,
    groupStage: {
      groupCount: 2, advancePerGroup: DEFAULT_ADVANCE_PER_GROUP, thirdPlaceMatch: false,
      groupLegs: 1, knockoutLegs: 1, singleLegFinal: true,
      ...gs, ...patch,
    },
  });

  return (
    <fieldset disabled={disabled} className="space-y-4 min-w-0 border-0 p-0 m-0 disabled:opacity-60">
      {showGroups && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" checked={!!gs} className="accent-primary"
              onChange={e => onChange({ ...value, groupStage: e.target.checked ? {
                groupCount: 2, advancePerGroup: DEFAULT_ADVANCE_PER_GROUP, thirdPlaceMatch: false,
                groupLegs: 1, knockoutLegs: 1, singleLegFinal: true,
              } : null })} />
            Gruppenphase + K.O. vorbelegen{anyFormat && <span className="text-gray-600">(nur bei diesem Format)</span>}
          </label>
          {gs && (
            <div className="pl-6 space-y-2">
              <div className="flex flex-wrap gap-4">
                <label className="text-xs text-gray-500 space-y-1">
                  <span className="block">Anzahl Gruppen</span>
                  <NumberInput min={1} max={16} value={gs.groupCount} className={numCls}
                    onChange={e => setGs({ groupCount: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                </label>
                <label className="text-xs text-gray-500 space-y-1">
                  <span className="block">Weiter pro Gruppe</span>
                  <NumberInput min={1} max={8} value={gs.advancePerGroup} className={numCls}
                    onChange={e => setGs({ advancePerGroup: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" className="accent-primary" checked={gs.groupLegs === 2}
                  onChange={e => setGs({ groupLegs: e.target.checked ? 2 : 1 })} />
                Gruppenphase mit Hin- und Rückspiel
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" className="accent-primary" checked={gs.knockoutLegs === 2}
                  onChange={e => setGs({ knockoutLegs: e.target.checked ? 2 : 1 })} />
                K.O.-Runde mit Hin- und Rückspiel
              </label>
              {gs.knockoutLegs === 2 && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer pl-6">
                  <input type="checkbox" className="accent-primary" checked={gs.singleLegFinal !== false}
                    onChange={e => setGs({ singleLegFinal: e.target.checked })} />
                  Finale trotzdem als Einzelspiel
                </label>
              )}
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" className="accent-primary" checked={gs.thirdPlaceMatch === true}
                  onChange={e => setGs({ thirdPlaceMatch: e.target.checked })} />
                Spiel um Platz 3
              </label>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input type="checkbox" className="accent-primary" checked={value.checkInEnabled === true}
            onChange={e => onChange({ ...value, checkInEnabled: e.target.checked })} />
          Check-in vor Turnierstart
          {value.checkInEnabled && <span className="text-xs text-gray-500">(öffnet {CHECK_IN_MINUTES} Min. vor Start)</span>}
        </label>
      </div>

      {showPoints && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" className="accent-primary" checked={!!value.matchResultPoints}
              onChange={e => onChange({ ...value, matchResultPoints: e.target.checked ? { win: 30, draw: 10 } : null })} />
            Liga: Münzen je Sieg/Unentschieden statt Platzierung{anyFormat && <span className="text-gray-600">(nur Liga-Modus)</span>}
          </label>
          {value.matchResultPoints && (
            <div className="pl-6 flex flex-wrap gap-4">
              <label className="text-xs text-gray-500 space-y-1">
                <span className="block">Münzen je Sieg</span>
                <NumberInput min={0} value={value.matchResultPoints.win} className={numCls}
                  onChange={e => onChange({ ...value, matchResultPoints: { ...value.matchResultPoints!, win: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
              </label>
              <label className="text-xs text-gray-500 space-y-1">
                <span className="block">Münzen je Unentschieden</span>
                <NumberInput min={0} value={value.matchResultPoints.draw} className={numCls}
                  onChange={e => onChange({ ...value, matchResultPoints: { ...value.matchResultPoints!, draw: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
              </label>
            </div>
          )}
        </div>
      )}

      {!hideGoal && <SeriesGoalEditor format={format} value={value} onChange={onChange} statFields={statFields}
        rewardLimit={goalRewardLimit} seriesPointsLimit={goalSeriesPointsLimit} />}
    </fieldset>
  );
}
