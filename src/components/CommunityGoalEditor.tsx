"use client";
import {
  COMMUNITY_GOAL_MODES, COMMUNITY_GOAL_SCOPES, RESULT_SCORE_FIELD, goalFieldLabel,
  type CommunityGoalDirection,
} from "@/lib/community-goal";
import type { CommunityGoalForm } from "@/lib/community-goal-form";
import { NumberInput } from "@/components/ui/NumberInput";

// Formular-Typ und Umrechnung liegen in lib/community-goal-form.ts (auch für Server-Komponenten nutzbar)
export { EMPTY_COMMUNITY_GOAL_FORM, formToGoal, goalToForm, type CommunityGoalForm } from "@/lib/community-goal-form";

/**
 * Einstellungen für das Community-Ziel (siehe lib/community-goal.ts). Gemeinsam genutzt vom
 * Event-Wizard, vom Event-Editor (Reiter "Turnier"), von der Turniervorlage einer Eventreihe, vom
 * Ziel eines einzelnen Termins und von der Ziel-Planung der Reihe.
 * statFields = auswertbare Felder (goalFieldsFor) — bei Ergebnis-Formaten nur RESULT_SCORE_FIELD.
 */
const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

export default function CommunityGoalEditor({
  value,
  onChange,
  statFields,
  inSeries = false,
  hideToggle = false,
}: {
  value: CommunityGoalForm;
  onChange: (next: CommunityGoalForm) => void;
  statFields: string[];
  /** Termin/Vorlage einer Eventreihe — dann gibt es Serien-Bonus und Tabellenpunkte */
  inSeries?: boolean;
  /** Ohne "aktivieren"-Haken (Ziel ist immer an, z.B. eigenes Ziel eines Termins, Ziel-Planung) */
  hideToggle?: boolean;
}) {
  const set = (patch: Partial<CommunityGoalForm>) => onChange({ ...value, ...patch });
  // Ergebnis-Formate (Liga, K.O., …): ausgewertet wird das Spielergebnis, keine Stat-Felder
  const resultMode = statFields.length === 1 && statFields[0] === RESULT_SCORE_FIELD;
  // Felder, die nach Umbenennen/Löschen eines Stat-Felds nicht mehr existieren, fallen still raus
  const selected = resultMode ? [RESULT_SCORE_FIELD] : value.fields.filter(f => statFields.includes(f));
  const scopes = resultMode ? COMMUNITY_GOAL_SCOPES.filter(s => s.value !== "team") : COMMUNITY_GOAL_SCOPES;
  const incomplete = value.enabled && (selected.length === 0 || !(value.target > 0));
  const avg = value.mode === "avg";

  return (
    <div className="space-y-3">
      {!hideToggle && (
        <>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input type="checkbox" checked={value.enabled} onChange={e => set({ enabled: e.target.checked })} className="rounded" />
            <span>🎯 Community-Ziel aktivieren</span>
          </label>
          <p className="text-[11px] text-gray-500 -mt-2">
            {resultMode
              ? "Zählt die Tore laut Spielergebnis über alle Spiele — z. B. „100 Tore insgesamt“ oder „Ø mindestens 3 Tore pro Spiel“. Jeder Spieler bekommt seine eigenen Tore gutgeschrieben."
              : "Wertet die gewählten Stat-Felder über alle Runden aus — als Summe („1.000 Tore zusammen“) oder als gemeinsamer Durchschnitt („Ø mindestens 2 Kills pro Spieler“). Die Werte kommen wie gewohnt aus den Runden bzw. den Screenshot-Meldungen der Teilnehmer."}
          </p>
        </>
      )}

      {(value.enabled || hideToggle) && (
        <div className="space-y-3">
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Wer spielt aufs Ziel?</p>
            <div className={`grid grid-cols-1 gap-2 ${scopes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              {scopes.map(s => (
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
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">Berechnung</p>
            <div className="grid grid-cols-2 gap-2">
              {COMMUNITY_GOAL_MODES.map(m => (
                <button key={m.value} type="button" onClick={() => set({ mode: m.value })}
                  className={`flex flex-col items-start gap-0.5 rounded-lg p-2.5 border text-left transition-all ${
                    value.mode === m.value ? "border-amber-500/60 bg-amber-500/10" : "border-white/8 bg-white/3 hover:border-white/15"
                  }`}>
                  <span className={`text-sm font-semibold ${value.mode === m.value ? "text-amber-300" : "text-gray-300"}`}>{m.label}</span>
                  <span className="text-[11px] text-gray-500">{m.desc}</span>
                </button>
              ))}
            </div>
            {avg && (
              <p className="text-[10px] text-gray-500 mt-1.5">
                Je Teilnehmer zählt der Ø seiner Einträge, daraus wird der gemeinsame Ø gebildet — jeder zählt
                gleich viel, egal wie oft er meldet. Abgerechnet wird am Ende des Zeitraums: Liegt der gemeinsame Ø
                dann {value.direction === "atMost" ? "genau auf oder unter" : "genau auf oder über"} dem Ziel, ist es geschafft.
              </p>
            )}
          </div>

          {resultMode ? (
            <p className="text-[11px] text-gray-400 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              ⚽ Gezählt werden die Tore laut Ergebnis jedes gewerteten Spiels (bei 3:1 bekommt Spieler 1 drei, Spieler 2 ein Tor).
              {avg && " Beim Durchschnitt zählt je Spieler der Ø seiner Tore pro Spiel."}
            </p>
          ) : (
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wide mb-1.5">{avg ? "Ausgewertete Stat-Felder" : "Gezählte Stat-Felder"}</p>
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
                      {on ? "✓ " : ""}{goalFieldLabel(f)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {avg && selected.length > 1 && (
            <p className="text-[10px] text-gray-500 -mt-1">Mehrere Felder werden je Eintrag addiert, bevor der Ø gebildet wird.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">{avg ? "Ziel-Durchschnitt" : "Zielmarke"}</label>
              <div className="flex gap-2">
                {avg && (
                  <select value={value.direction} onChange={e => set({ direction: e.target.value as CommunityGoalDirection })}
                    aria-label="Richtung" className={`${inputCls} w-auto`}>
                    <option value="atLeast">mindestens</option>
                    <option value="atMost">höchstens</option>
                  </select>
                )}
                <NumberInput min={avg ? 0.01 : 1} step={avg ? 0.01 : 1} value={value.target}
                  onChange={e => set({ target: Number(e.target.value) })} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Einheit (optional)</label>
              <input type="text" value={value.unit} maxLength={40} placeholder={resultMode ? "Tore" : selected.join(" + ") || "z.B. Schritte"}
                onChange={e => set({ unit: e.target.value })} className={inputCls} />
            </div>
          </div>
          {avg && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Mindestanzahl Teilnehmer mit Werten</label>
              <NumberInput min={1} value={value.minParticipants}
                onChange={e => set({ minParticipants: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className={inputCls} />
              <p className="text-[10px] text-gray-500 mt-1">Damit nicht schon ein einzelner Spieler das Ziel allein entscheidet.</p>
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titel (optional)</label>
            <input type="text" value={value.title} maxLength={120} placeholder={avg ? "z.B. Ø 2 Kills pro Spieler" : "z.B. 1.000 Tore für die Community"}
              onChange={e => set({ title: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Belohnung bei Erreichen (Münzen pro Mitwirkendem, optional)</label>
            <NumberInput min={0} value={value.rewardCoins}
              onChange={e => set({ rewardCoins: Math.max(0, Number(e.target.value) || 0) })} className={inputCls} />
            <p className="text-[10px] text-gray-500 mt-1">
              {value.scope === "team" ? "Jeder im Team, das die Marke erreicht und etwas beigetragen hat."
                : value.scope === "solo" ? "Jeder, der die Marke selbst erreicht."
                : "Jeder, der etwas beigetragen hat — sobald die Community die Marke gemeinsam erreicht."}
              {avg
                ? " Ausgezahlt und gemeldet wird am Ende des Zeitraums, wenn der Durchschnitt dann passt."
                : " Bei 25 %, 50 %, 75 % und 100 % gibt es automatisch eine Meldung an alle Teilnehmer."}
            </p>
          </div>

          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-3">
            <p className="text-[11px] text-gray-500 uppercase tracking-wide">Zusatzoptionen</p>
            <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer select-none">
              <input type="checkbox" checked={value.announceResult} onChange={e => set({ announceResult: e.target.checked })} className="rounded mt-0.5" />
              <span>
                Endstand am Ende des Zeitraums melden
                <span className="block text-[10px] text-gray-500">Auch wenn das Ziel verfehlt wurde („Knapp verfehlt — uns fehlten 4 %“).</span>
              </span>
            </label>
            {inSeries ? (
              <>
                <div>
                  <p className="text-xs text-gray-400 mb-1">🔥 Serien-Bonus</p>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500">
                    <span>Alle</span>
                    <NumberInput min={0} value={value.streakLength} aria-label="Zyklen in Folge"
                      onChange={e => set({ streakLength: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${inputCls} w-20`} />
                    <span>Zyklen in Folge geschafft →</span>
                    <NumberInput min={0} value={value.streakCoins} aria-label="Bonus-Münzen"
                      onChange={e => set({ streakCoins: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${inputCls} w-24`} />
                    <span>Bonus-Münzen</span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Bei 3 z. B. nach 3, 6, 9 … geschafften Zyklen in Folge, für alle, die im Zyklus belohnt werden. Zyklen ohne Ziel
                    unterbrechen die Serie nicht. Mindestens 2 Zyklen, 0 = aus.
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">🏆 Tabellenpunkte für die Eventreihe bei Erreichen</label>
                  <NumberInput min={0} value={value.rewardSeriesPoints}
                    onChange={e => set({ rewardSeriesPoints: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${inputCls} w-28`} />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Für jeden, der beim Erreichen belohnt wird — erscheint in der Reihentabelle als „Ziel-Bonus“. 0 = aus.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-[10px] text-gray-500">Serien-Bonus und Tabellenpunkte gibt es bei Terminen einer Eventreihe.</p>
            )}
          </div>

          {incomplete && !resultMode && (
            <p className="text-[11px] text-amber-400">
              Wähle mindestens ein Stat-Feld und eine Zielmarke über 0 — sonst wird kein Ziel gespeichert.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
