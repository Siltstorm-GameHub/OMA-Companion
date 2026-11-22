"use client";
import { useState } from "react";
import {
  COMMUNITY_GOAL_MODES, COMMUNITY_GOAL_SCOPES, RESULT_SCORE_FIELD, goalFieldLabel,
  type CommunityGoalDirection,
} from "@/lib/community-goal";
import { EMPTY_COMMUNITY_GOAL_FORM, type CommunityGoalForm } from "@/lib/community-goal-form";
import { NumberInput } from "@/components/ui/NumberInput";
import { ChevronDown } from "@/components/icons";

// Formular-Typ und Umrechnung liegen in lib/community-goal-form.ts (auch für Server-Komponenten nutzbar)
export { EMPTY_COMMUNITY_GOAL_FORM, formToGoal, goalToForm, type CommunityGoalForm } from "@/lib/community-goal-form";

/**
 * Einstellungen für das Community-Ziel (siehe lib/community-goal.ts). Gemeinsam genutzt vom
 * Event-Wizard, vom Reiter "Ziel" eines Events, vom Reiter "Ziel" einer Eventreihe und von der
 * Ziel-Planung der Reihe.
 *
 * Aufbau: Zuerst nur das Wichtigste (was wird gezählt, Zielmarke, Belohnung, Titel). Alles Weitere
 * (wer spielt aufs Ziel, Durchschnitt, Einheit, Meldungen, Serien-Bonus, Tabellenpunkte) steht unter
 * "Mehr Optionen" — aufgeklappt, sobald dort schon etwas vom Standard abweicht.
 * statFields = auswertbare Felder (goalFieldsFor) — bei Ergebnis-Formaten nur RESULT_SCORE_FIELD.
 */
const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

/** Obergrenze am Feld (Mitglieder) — wie LimitHint im Event-Assistenten */
function Limit({ value, max }: { value: number; max: number | null | undefined }) {
  if (max == null) return null;
  const over = value > max;
  return (
    <p className={`mt-1 text-xs ${over ? "text-amber-300" : "text-gray-500"}`}>
      {over ? `Höchstens ${max}, ausgezahlt werden ${max}` : `max. ${max}`}
    </p>
  );
}

/** Weicht etwas unter "Mehr Optionen" vom Standard ab? Dann startet der Bereich aufgeklappt. */
function hasAdvanced(v: CommunityGoalForm): boolean {
  const d = EMPTY_COMMUNITY_GOAL_FORM;
  return v.scope !== d.scope || v.mode !== d.mode || v.direction !== d.direction || v.minParticipants > 1
    || !!v.unit || v.streakLength > 0 || v.streakCoins > 0 || v.rewardSeriesPoints > 0;
}

export default function CommunityGoalEditor({
  value,
  onChange,
  statFields,
  inSeries = false,
  hideToggle = false,
  rewardLimit = null,
  seriesPointsLimit = null,
  hasEnd,
}: {
  value: CommunityGoalForm;
  onChange: (next: CommunityGoalForm) => void;
  statFields: string[];
  /** Termin/Vorlage einer Eventreihe — dann gibt es Serien-Bonus und Tabellenpunkte */
  inSeries?: boolean;
  /** Ohne "aktivieren"-Haken (Ziel ist immer an, z.B. eigenes Ziel eines Termins, Ziel-Planung) */
  hideToggle?: boolean;
  /** Mitglieder: Obergrenze für Münzen (Belohnung und Serien-Bonus) — null = keine Grenze */
  rewardLimit?: number | null;
  /** Mitglieder: Obergrenze für Tabellenpunkte je Belohntem — null = keine Grenze */
  seriesPointsLimit?: number | null;
  /** Hat das Event ein Ende? false → Hinweis, dass ohne Ende erst beim Abschluss abgerechnet wird.
   *  undefined = unbekannt (z.B. Reihen-Vorlage), dann kein Hinweis. */
  hasEnd?: boolean;
}) {
  const set = (patch: Partial<CommunityGoalForm>) => onChange({ ...value, ...patch });
  const [moreOpen, setMoreOpen] = useState(() => hasAdvanced(value));
  // Ergebnis-Formate (Liga, K.O., …): ausgewertet wird das Spielergebnis, keine Stat-Felder
  const resultMode = statFields.length === 1 && statFields[0] === RESULT_SCORE_FIELD;
  // Felder, die nach Umbenennen/Löschen eines Stat-Felds nicht mehr existieren, fallen still raus
  const selected = resultMode ? [RESULT_SCORE_FIELD] : value.fields.filter(f => statFields.includes(f));
  const scopes = resultMode ? COMMUNITY_GOAL_SCOPES.filter(s => s.value !== "team") : COMMUNITY_GOAL_SCOPES;
  const incomplete = value.enabled && (selected.length === 0 || !(value.target > 0));
  const avg = value.mode === "avg";
  const active = value.enabled || hideToggle;
  // Ohne Ende wird erst beim Abschluss abgerechnet — wichtig bei Ø-Zielen und der Endstand-Meldung
  const needsEndHint = active && hasEnd === false && (avg || value.announceResult);

  return (
    <div className="space-y-3">
      {!hideToggle && (
        <>
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer select-none">
            <input type="checkbox" checked={value.enabled} onChange={e => set({ enabled: e.target.checked })} className="rounded" />
            <span>🎯 Community-Ziel aktivieren</span>
          </label>
          <p className="text-xs text-gray-500 -mt-2">
            {resultMode
              ? "Zählt die Tore laut Spielergebnis über alle Spiele, z. B. „100 Tore insgesamt“."
              : "Zählt die gewählten Werte über alle Runden, z. B. „1.000 Tore zusammen“. Die Werte kommen aus den Runden bzw. den Screenshot-Meldungen der Teilnehmer."}
          </p>
        </>
      )}

      {active && (
        <div className="space-y-3">
          {/* ── 1. Was wird gezählt ── */}
          {resultMode ? (
            <p className="text-xs text-gray-400 rounded-lg border border-line bg-surface-2 px-3 py-2">
              ⚽ Gezählt werden die Tore laut Ergebnis jedes gewerteten Spiels (bei 3:1 bekommt Spieler 1 drei, Spieler 2 ein Tor).
            </p>
          ) : (
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Was wird gezählt?</p>
              {statFields.length === 0 ? (
                <p className="text-xs text-amber-300/90">Lege zuerst Statistik-Felder an (z. B. „Tore“ oder „Schritte“).</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {statFields.map(f => {
                    const on = selected.includes(f);
                    return (
                      <button key={f} type="button" aria-pressed={on}
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
              {selected.length > 1 && <p className="text-xs text-gray-500 mt-1">Mehrere Felder werden zusammengezählt.</p>}
            </div>
          )}

          {/* ── 2. Zielmarke und Belohnung ── */}
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
              <label className="text-xs text-gray-500 mb-1 block">Münzen pro Mitwirkendem bei Erreichen</label>
              <NumberInput min={0} value={value.rewardCoins}
                onChange={e => set({ rewardCoins: Math.max(0, Number(e.target.value) || 0) })} className={inputCls} />
              <Limit value={value.rewardCoins} max={rewardLimit} />
            </div>
          </div>
          <p className="text-xs text-gray-500 -mt-1">
            {value.scope === "team" ? "Belohnt wird jeder im Team, das die Marke erreicht und etwas beigetragen hat."
              : value.scope === "solo" ? "Belohnt wird jeder, der die Marke selbst erreicht."
              : "Belohnt wird jeder, der etwas beigetragen hat, sobald alle zusammen die Marke erreichen."}
            {avg
              ? " Ausgezahlt wird am Ende des Zeitraums, wenn der Durchschnitt dann passt."
              : " Bei 25 %, 50 %, 75 % und 100 % bekommen alle Teilnehmer eine Meldung."}
          </p>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Titel (optional)</label>
            <input type="text" value={value.title} maxLength={120} placeholder={avg ? "z.B. Ø 2 Kills pro Spieler" : "z.B. 1.000 Tore für die Community"}
              onChange={e => set({ title: e.target.value })} className={inputCls} />
          </div>

          {needsEndHint && (
            <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2 text-xs text-amber-200">
              Das Event hat kein Ende. Dann wird {avg ? "das Durchschnitts-Ziel" : "der Endstand"} erst beim Abschluss des Events
              abgerechnet. Mit einem Enddatum (Grunddaten) passiert das automatisch zum Schluss des Zeitraums.
            </p>
          )}

          {/* ── 3. Mehr Optionen ── */}
          <div className="rounded-lg border border-line bg-surface-2">
            <button type="button" onClick={() => setMoreOpen(o => !o)} aria-expanded={moreOpen}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-300 hover:text-white">
              Mehr Optionen
              <span className="font-normal text-gray-500 truncate">
                {moreOpen ? "" : "Team/Alleine, Durchschnitt, Einheit, Meldungen" + (inSeries ? ", Serien-Bonus, Tabellenpunkte" : "")}
              </span>
              <ChevronDown className={`ml-auto w-4 h-4 shrink-0 text-gray-500 transition-transform ${moreOpen ? "rotate-180" : ""}`} />
            </button>
            {moreOpen && (
              <div className="space-y-3 border-t border-line p-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Wer spielt aufs Ziel?</p>
                  <div className={`grid grid-cols-1 gap-2 ${scopes.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                    {scopes.map(s => (
                      <button key={s.value} type="button" onClick={() => set({ scope: s.value })} aria-pressed={value.scope === s.value}
                        className={`flex flex-col items-start gap-0.5 rounded-lg p-2.5 border text-left transition-all ${
                          value.scope === s.value ? "border-amber-500/60 bg-amber-500/10" : "border-line bg-surface-2 hover:border-line-strong"
                        }`}>
                        <span className={`text-sm font-semibold ${value.scope === s.value ? "text-amber-300" : "text-gray-300"}`}>{s.label}</span>
                        <span className="text-xs text-gray-500">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                  {value.scope === "team" && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Die Team-Zuordnung (Team A/B) setzt du pro Runde beim Eintragen der Stats im Reiter „Spielplan“.
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1.5">Berechnung</p>
                  <div className="grid grid-cols-2 gap-2">
                    {COMMUNITY_GOAL_MODES.map(m => (
                      <button key={m.value} type="button" onClick={() => set({ mode: m.value })} aria-pressed={value.mode === m.value}
                        className={`flex flex-col items-start gap-0.5 rounded-lg p-2.5 border text-left transition-all ${
                          value.mode === m.value ? "border-amber-500/60 bg-amber-500/10" : "border-line bg-surface-2 hover:border-line-strong"
                        }`}>
                        <span className={`text-sm font-semibold ${value.mode === m.value ? "text-amber-300" : "text-gray-300"}`}>{m.label}</span>
                        <span className="text-xs text-gray-500">{m.desc}</span>
                      </button>
                    ))}
                  </div>
                  {avg && (
                    <p className="text-xs text-gray-500 mt-1.5">
                      Je Teilnehmer zählt der Ø seiner Einträge, daraus wird der gemeinsame Ø gebildet. Jeder zählt gleich viel,
                      egal wie oft er meldet. Abgerechnet wird am Ende des Zeitraums.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Einheit (optional)</label>
                    <input type="text" value={value.unit} maxLength={40} placeholder={resultMode ? "Tore" : selected.join(" + ") || "z.B. Schritte"}
                      onChange={e => set({ unit: e.target.value })} className={inputCls} />
                  </div>
                  {avg && (
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Mindestanzahl Teilnehmer mit Werten</label>
                      <NumberInput min={1} value={value.minParticipants}
                        onChange={e => set({ minParticipants: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} className={inputCls} />
                      <p className="text-xs text-gray-500 mt-1">Damit nicht ein einzelner Spieler das Ziel allein entscheidet.</p>
                    </div>
                  )}
                </div>

                <label className="flex items-start gap-2 text-sm text-gray-300 cursor-pointer select-none">
                  <input type="checkbox" checked={value.announceResult} onChange={e => set({ announceResult: e.target.checked })} className="rounded mt-0.5" />
                  <span>
                    Endstand am Ende des Zeitraums melden
                    <span className="block text-xs text-gray-500">Auch wenn das Ziel verfehlt wurde („Knapp verfehlt, uns fehlten 4 %“).</span>
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
                      <Limit value={value.streakCoins} max={rewardLimit} />
                      <p className="text-xs text-gray-500 mt-1">
                        Bei 3 z. B. nach 3, 6, 9 … geschafften Zyklen in Folge. Zyklen ohne Ziel unterbrechen die Serie nicht.
                        Mindestens 2 Zyklen, 0 = aus.
                      </p>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">🏆 Tabellenpunkte für die Eventreihe bei Erreichen</label>
                      <NumberInput min={0} value={value.rewardSeriesPoints}
                        onChange={e => set({ rewardSeriesPoints: Math.max(0, Math.floor(Number(e.target.value) || 0)) })} className={`${inputCls} w-28`} />
                      <Limit value={value.rewardSeriesPoints} max={seriesPointsLimit} />
                      <p className="text-xs text-gray-500 mt-1">
                        Für jeden, der beim Erreichen belohnt wird. Erscheint in der Reihentabelle als „Ziel-Bonus“. 0 = aus.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Serien-Bonus und Tabellenpunkte gibt es bei Terminen einer Eventreihe.</p>
                )}
              </div>
            )}
          </div>

          {incomplete && !resultMode && (
            <p className="text-xs text-amber-400">
              Wähle mindestens ein Feld und eine Zielmarke über 0, sonst wird kein Ziel gespeichert.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
