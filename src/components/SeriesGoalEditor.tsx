"use client";
import { useEffect, useState } from "react";
import { goalFieldsFor, supportsCommunityGoal } from "@/lib/community-goal";
import type { TournamentTemplate } from "@/lib/series-seasons";
import CommunityGoalEditor, { formToGoal, goalToForm, type CommunityGoalForm } from "@/components/CommunityGoalEditor";

/**
 * Community-Ziel einer Eventreihe (TournamentTemplate.communityGoal) — gilt automatisch für alle
 * Termine (lib/event-goal.ts). Genutzt vom Reihen-Assistenten, von der Turniervorlage und vom Reiter
 * "Ziel" der Reihe. Gibt null zurück, wenn das Format der Reihe kein Ziel kennt.
 */
export default function SeriesGoalEditor({
  format, value, onChange, statFields = [], disabled = false, rewardLimit = null, seriesPointsLimit = null,
}: {
  /** Festes Format der Reihe (leer = verschiedene Formate) */
  format: string | null | undefined;
  value: TournamentTemplate;
  onChange: (next: TournamentTemplate) => void;
  /** Stat-Felder der Reihe */
  statFields?: string[];
  disabled?: boolean;
  rewardLimit?: number | null;
  seriesPointsLimit?: number | null;
}) {
  const anyFormat = !format;
  // Auswertbare Felder: bei Liga/K.O. & Co. das Spielergebnis, sonst die Stat-Felder der Reihe
  const goalFields = format ? goalFieldsFor(format, statFields) : statFields;
  // Lokaler Formularzustand: ein unvollständiges Ziel (z.B. noch kein Feld gewählt) ergibt in der
  // Vorlage null, darf das Formular aber nicht zurücksetzen
  const [goalForm, setGoalForm] = useState<CommunityGoalForm>(() => goalToForm(value.communityGoal ?? null));
  const changeGoal = (form: CommunityGoalForm) => {
    setGoalForm(form);
    onChange({ ...value, communityGoal: formToGoal(form, goalFields) });
  };
  // Ändern sich die Stat-Felder NACH dem Ausfüllen des Ziels, muss das gespeicherte Ziel neu berechnet
  // werden — sonst zeigt das Formular ein vollständiges Ziel, in der Vorlage steht aber keins.
  const statFieldsKey = goalFields.join("\u0000");
  const derivedGoal = formToGoal(goalForm, goalFields);
  const derivedGoalKey = JSON.stringify(derivedGoal);
  useEffect(() => {
    if (JSON.stringify(value.communityGoal ?? null) !== derivedGoalKey) {
      onChange({ ...value, communityGoal: derivedGoal });
    }
    // Nur auf geänderte Stat-Felder bzw. abgeleitetes Ziel reagieren, nicht auf jeden neuen value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statFieldsKey, derivedGoalKey]);

  if (!anyFormat && !supportsCommunityGoal(format)) return null;
  return (
    <fieldset disabled={disabled} className="space-y-1 min-w-0 border-0 p-0 m-0 disabled:opacity-60">
      {anyFormat && (
        <p className="text-xs text-gray-600">
          Ohne festes Format wertet das Ziel die Stat-Felder der Reihe aus. Für ein Ziel auf Spielergebnisse lege das Format der Reihe fest.
        </p>
      )}
      <CommunityGoalEditor value={goalForm} onChange={changeGoal} statFields={goalFields} inSeries
        rewardLimit={rewardLimit} seriesPointsLimit={seriesPointsLimit} />
      <p className="text-xs text-gray-500">
        Gilt automatisch für alle Termine der Reihe. Einzelne Termine können es im Reiter „Ziel“ überschreiben oder abschalten.
      </p>
    </fieldset>
  );
}
