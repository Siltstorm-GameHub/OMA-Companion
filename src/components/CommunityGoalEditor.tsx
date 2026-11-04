"use client";
import { COMMUNITY_GOAL_SCOPES, sanitizeCommunityGoal, type CommunityGoal, type CommunityGoalScope } from "@/lib/community-goal";

/**
 * Einstellungen für das Community-Ziel (Zusatz zum Skill-Index Modus, siehe lib/community-goal.ts).
 * Gemeinsam genutzt vom Event-Wizard und vom Event-Editor (Reiter "Turnier").
 */
export type CommunityGoalForm = {
  enabled: boolean;
  title: string;
  fields: string[];
  target: number;
  scope: CommunityGoalScope;
  unit: string;
};

export const EMPTY_COMMUNITY_GOAL_FORM: CommunityGoalForm = {
  enabled: false, title: "", fields: [], target: 100, scope: "community", unit: "",
};

export function goalToForm(goal: CommunityGoal | null): CommunityGoalForm {
  if (!goal) return EMPTY_COMMUNITY_GOAL_FORM;
  return { enabled: true, title: goal.title ?? "", fields: goal.fields, target: goal.target, scope: goal.scope, unit: goal.unit ?? "" };
}

/** Formular → gespeichertes Ziel (null = kein Ziel / unvollständig). Nur Felder, die das Event hat. */
export function formToGoal(form: CommunityGoalForm, statFields: string[]): CommunityGoal | null {
  if (!form.enabled) return null;
  return sanitizeCommunityGoal(form, statFields);
}

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

export default function CommunityGoalEditor({
  value,
  onChange,
  statFields,
}: {
  value: CommunityGoalForm;
  onChange: (next: CommunityGoalForm) => void;
  statFields: string[];
}) {
  const set = (patch: Partial<CommunityGoalForm>) => onChange({ ...value, ...patch });
  // Felder, die nach Umbenennen/Löschen eines Stat-Felds nicht mehr existieren, fallen still raus
  const selected = value.fields.filter(f => statFields.includes(f));
  const incomplete = value.enabled && (selected.length === 0 || !(value.target > 0));

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
        <input type="checkbox" checked={value.enabled} onChange={e => set({ enabled: e.target.checked })} className="rounded" />
        <span>🎯 Community-Ziel aktivieren</span>
      </label>
      <p className="text-[11px] text-gray-500 -mt-2">
        Zählt die Werte der gewählten Stat-Felder über alle Runden zusammen, bis die Zielmarke erreicht
        ist — egal ob Tore, Kills oder Schritte im echten Leben. Die Werte trägst du wie gewohnt pro
        Runde im Skill-Index ein.
      </p>

      {value.enabled && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Wer spielt aufs Ziel?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {COMMUNITY_GOAL_SCOPES.map(s => (
                <button key={s.value} type="button" onClick={() => set({ scope: s.value })}
                  className={`flex flex-col items-start gap-0.5 rounded-lg p-2.5 border text-left transition-all ${
                    value.scope === s.value ? "border-amber-500/60 bg-amber-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}>
                  <span className={`text-sm font-semibold ${value.scope === s.value ? "text-amber-300" : "text-gray-300"}`}>{s.label}</span>
                  <span className="text-[11px] text-gray-500">{s.desc}</span>
                </button>
              ))}
            </div>
            {value.scope === "team" && (
              <p className="text-[10px] text-gray-500 mt-1.5">
                Die Team-Zuordnung (Team A/B) setzt du pro Runde beim Eintragen der Stats im Reiter „Turnier“.
              </p>
            )}
          </div>

          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Gezählte Stat-Felder</p>
            {statFields.length === 0 ? (
              <p className="text-[11px] text-gray-600">Lege zuerst Statistik-Felder an (z.B. „Tore“ oder „Schritte“).</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {statFields.map(f => {
                  const on = selected.includes(f);
                  return (
                    <button key={f} type="button"
                      onClick={() => set({ fields: on ? selected.filter(x => x !== f) : [...selected, f] })}
                      className={`rounded-full px-3 py-1 text-xs border transition-colors ${
                        on ? "border-teal-500/60 bg-teal-500/15 text-teal-300" : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                      }`}>
                      {on ? "✓ " : ""}{f}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Zielmarke</label>
              <input type="number" min={1} value={value.target}
                onChange={e => set({ target: Number(e.target.value) })} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Einheit (optional)</label>
              <input type="text" value={value.unit} maxLength={40} placeholder={selected.join(" + ") || "z.B. Schritte"}
                onChange={e => set({ unit: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titel (optional)</label>
            <input type="text" value={value.title} maxLength={120} placeholder="z.B. 1.000 Tore für die Community"
              onChange={e => set({ title: e.target.value })} className={inputCls} />
          </div>

          {incomplete && (
            <p className="text-[11px] text-amber-400">
              Wähle mindestens ein Stat-Feld und eine Zielmarke über 0 — sonst wird kein Ziel gespeichert.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
