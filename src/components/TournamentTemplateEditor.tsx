"use client";
import { DEFAULT_ADVANCE_PER_GROUP, GROUP_KNOCKOUT_FORMAT } from "@/lib/tournaments/groupStage";
import { DEFAULT_CHECK_IN_MINUTES } from "@/lib/checkin";
import { useEffect, useState } from "react";
import type { TournamentTemplate } from "@/lib/series-seasons";
import CommunityGoalEditor, { formToGoal, goalToForm, type CommunityGoalForm } from "@/components/CommunityGoalEditor";
import { NumberInput } from "@/components/ui/NumberInput";

const numCls = "w-20 rounded-lg px-2 py-1.5 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50";

/**
 * Turniervorlage einer Eventreihe: Gruppenphase, Check-in und Punktemodus, die jeder neue Termin der
 * Reihe übernimmt (siehe lib/series-seasons.ts). Ohne festes Format der Reihe werden alle Optionen
 * gezeigt — sie greifen dann nur bei Terminen mit dem passenden Format.
 */
export default function TournamentTemplateEditor({
  format, value, onChange, disabled = false, statFields = [],
}: {
  /** Festes Format der Reihe (leer = verschiedene Formate) */
  format: string | null | undefined;
  value: TournamentTemplate;
  onChange: (next: TournamentTemplate) => void;
  disabled?: boolean;
  /** Stat-Felder der Reihe — Auswahl für das Community-Ziel */
  statFields?: string[];
}) {
  const anyFormat = !format;
  const showGoal = anyFormat || format === "coop_stats";
  // Lokaler Formularzustand: ein unvollständiges Ziel (z.B. noch kein Feld gewählt) ergibt in der
  // Vorlage null, darf das Formular aber nicht zurücksetzen
  const [goalForm, setGoalForm] = useState<CommunityGoalForm>(() => goalToForm(value.communityGoal ?? null));
  const changeGoal = (form: CommunityGoalForm) => {
    setGoalForm(form);
    onChange({ ...value, communityGoal: formToGoal(form, statFields) });
  };
  // Ändern sich die Stat-Felder NACH dem Ausfüllen des Ziels (z.B. Ziel zuerst ausgefüllt, Statistiken
  // danach angelegt oder umbenannt), muss das gespeicherte Ziel neu berechnet werden — sonst zeigt das
  // Formular ein vollständiges Ziel, in der Vorlage steht aber keins (bzw. eins mit veralteten Feldern).
  const statFieldsKey = statFields.join("\u0000");
  const derivedGoal = formToGoal(goalForm, statFields);
  const derivedGoalKey = JSON.stringify(derivedGoal);
  useEffect(() => {
    if (JSON.stringify(value.communityGoal ?? null) !== derivedGoalKey) {
      onChange({ ...value, communityGoal: derivedGoal });
    }
    // Nur auf geänderte Stat-Felder bzw. abgeleitetes Ziel reagieren, nicht auf jeden neuen value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statFieldsKey, derivedGoalKey]);
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
                  <NumberInput min={1} max={16} value={gs.groupCount} className={numCls}
                    onChange={e => setGs({ groupCount: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
                </label>
                <label className="text-[11px] text-gray-500 space-y-1">
                  <span className="block">Weiter pro Gruppe</span>
                  <NumberInput min={1} max={8} value={gs.advancePerGroup} className={numCls}
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
            <NumberInput min={5} max={1440} value={value.checkInMinutes ?? DEFAULT_CHECK_IN_MINUTES} className={numCls}
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
                <NumberInput min={0} value={value.matchResultPoints.win} className={numCls}
                  onChange={e => onChange({ ...value, matchResultPoints: { ...value.matchResultPoints!, win: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
              </label>
              <label className="text-[11px] text-gray-500 space-y-1">
                <span className="block">Münzen je Unentschieden</span>
                <NumberInput min={0} value={value.matchResultPoints.draw} className={numCls}
                  onChange={e => onChange({ ...value, matchResultPoints: { ...value.matchResultPoints!, draw: Math.max(0, Math.floor(Number(e.target.value) || 0)) } })} />
              </label>
            </div>
          )}
        </div>
      )}

      {showGoal && (
        <div className="space-y-1">
          {anyFormat && <p className="text-[11px] text-gray-600">Community-Ziel greift nur bei Terminen im Format „Punktewertung“.</p>}
          <CommunityGoalEditor value={goalForm} onChange={changeGoal} statFields={statFields} />
          <p className="text-[10px] text-gray-500">
            Gilt automatisch für alle Termine der Reihe. Einzelne Termine können es in ihren Einstellungen überschreiben oder abschalten.
          </p>
        </div>
      )}
    </fieldset>
  );
}
