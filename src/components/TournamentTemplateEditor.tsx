"use client";
import { DEFAULT_ADVANCE_PER_GROUP, GROUP_KNOCKOUT_FORMAT } from "@/lib/tournaments/groupStage";
import { DEFAULT_CHECK_IN_MINUTES } from "@/lib/checkin";
import type { TournamentTemplate } from "@/lib/series-seasons";

const numCls = "w-20 rounded-lg px-2 py-1.5 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50";

/**
 * Turniervorlage einer Eventreihe: Gruppenphase, Check-in und Punktemodus, die jeder neue Termin der
 * Reihe übernimmt (siehe lib/series-seasons.ts). Ohne festes Format der Reihe werden alle Optionen
 * gezeigt — sie greifen dann nur bei Terminen mit dem passenden Format.
 */
export default function TournamentTemplateEditor({
  format, value, onChange, disabled = false,
}: {
  /** Festes Format der Reihe (leer = verschiedene Formate) */
  format: string | null | undefined;
  value: TournamentTemplate;
  onChange: (next: TournamentTemplate) => void;
  disabled?: boolean;
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
            <input type="checkbox" checked={!!gs} className="accent-teal-500"
              onChange={e => onChange({ ...value, groupStage: e.target.checked ? {
                groupCount: 2, advancePerGroup: DEFAULT_ADVANCE_PER_GROUP, thirdPlaceMatch: false,
                groupLegs: 1, knockoutLegs: 1, singleLegFinal: true,
              } : null })} />
            Gruppenphase + K.O. vorbelegen{anyFormat && <span className="text-gray-600">(nur bei diesem Format)</span>}
          </label>
          {gs && (
            <div className="pl-6 space-y-2">
              <div className="flex flex-wrap gap-4">
                <label className="text-[11px] text-gray-500 space-y-1">
                  <span className="block">Anzahl Gruppen</span>
                  <input type="number" min={1} max={16} value={gs.groupCount} className={numCls}
                    onChange={e => setGs({ groupCount: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                </label>
                <label className="text-[11px] text-gray-500 space-y-1">
                  <span className="block">Weiter pro Gruppe</span>
                  <input type="number" min={1} max={8} value={gs.advancePerGroup} className={numCls}
                    onChange={e => setGs({ advancePerGroup: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                </label>
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" className="accent-teal-500" checked={gs.groupLegs === 2}
                  onChange={e => setGs({ groupLegs: e.target.checked ? 2 : 1 })} />
                Gruppenphase mit Hin- und Rückspiel
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" className="accent-teal-500" checked={gs.knockoutLegs === 2}
                  onChange={e => setGs({ knockoutLegs: e.target.checked ? 2 : 1 })} />
                K.O.-Runde mit Hin- und Rückspiel
              </label>
              {gs.knockoutLegs === 2 && (
                <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer pl-6">
                  <input type="checkbox" className="accent-teal-500" checked={gs.singleLegFinal !== false}
                    onChange={e => setGs({ singleLegFinal: e.target.checked })} />
                  Finale trotzdem als Einzelspiel
                </label>
              )}
              <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                <input type="checkbox" className="accent-teal-500" checked={gs.thirdPlaceMatch === true}
                  onChange={e => setGs({ thirdPlaceMatch: e.target.checked })} />
                Spiel um Platz 3
              </label>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
          <input type="checkbox" className="accent-teal-500" checked={value.checkInEnabled === true}
            onChange={e => onChange({ ...value, checkInEnabled: e.target.checked, checkInMinutes: value.checkInMinutes ?? DEFAULT_CHECK_IN_MINUTES })} />
          Check-in vor Turnierstart
        </label>
        {value.checkInEnabled && (
          <label className="pl-6 flex items-center gap-2 text-[11px] text-gray-500">
            <input type="number" min={5} max={1440} value={value.checkInMinutes ?? DEFAULT_CHECK_IN_MINUTES} className={numCls}
              onChange={e => onChange({ ...value, checkInMinutes: Math.floor(Number(e.target.value) || DEFAULT_CHECK_IN_MINUTES) })} />
            Minuten vor Start öffnet der Check-in
          </label>
        )}
      </div>

      {showPoints && (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
            <input type="checkbox" className="accent-teal-500" checked={!!value.matchResultPoints}
              onChange={e => onChange({ ...value, matchResultPoints: e.target.checked ? { win: 30, draw: 10 } : null })} />
            Liga: Münzen je Sieg/Unentschieden statt Platzierung{anyFormat && <span className="text-gray-600">(nur Liga-Modus)</span>}
          </label>
          {value.matchResultPoints && (
            <div className="pl-6 flex flex-wrap gap-4">
              <label className="text-[11px] text-gray-500 space-y-1">
                <span className="block">Münzen je Sieg</span>
                <input type="number" min={0} value={value.matchResultPoints.win} className={numCls}
                  onChange={e => onChange({ ...value, matchResultPoints: { ...value.matchResultPoints!, win: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
              </label>
              <label className="text-[11px] text-gray-500 space-y-1">
                <span className="block">Münzen je Unentschieden</span>
                <input type="number" min={0} value={value.matchResultPoints.draw} className={numCls}
                  onChange={e => onChange({ ...value, matchResultPoints: { ...value.matchResultPoints!, draw: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
              </label>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
