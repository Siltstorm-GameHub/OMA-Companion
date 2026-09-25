"use client";

// ============================================
// Welten-Editor: Quest (Schritte) und Dialoge der NPCs/Truhen/Schilder
// ============================================
// Eine Quest besteht aus Schritten. Ein Schritt ist geschafft, wenn ein Akteur einen Dialog für genau diesen
// Schritt mit „Quest rückt danach weiter“ zu Ende gesprochen hat. Truhen und Zweit-NPCs funktionieren nach
// demselben Prinzip: Dialog für Schritt N + „rückt weiter“ = Schritt N ist erledigt, sobald man dort war.

import { useEffect, useRef } from "react";
import { LIMITS, type CustomWorldDoc } from "@/lib/te-map/custom-world";
import { updateActor } from "@/lib/te-map/custom-world-edit";
import type { Actor, Talk } from "@/lib/te-map/types";

interface Props {
  doc: CustomWorldDoc;
  readOnly: boolean;
  onChange: (doc: CustomWorldDoc) => void;
  focusActorId: string | null;
}

const input = "mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";

export default function QuestEditor({ doc, readOnly, onChange, focusActorId }: Props) {
  const steps = doc.quest.objectives.length - 1;
  const focusRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [focusActorId]);

  const setQuest = (patch: Partial<CustomWorldDoc["quest"]>) => onChange({ ...doc, quest: { ...doc.quest, ...patch } });
  const setObjective = (i: number, v: string) => setQuest({ objectives: doc.quest.objectives.map((o, k) => (k === i ? v : o)) });
  const addStep = () => {
    if (steps >= LIMITS.maxSteps) return;
    const o = doc.quest.objectives;
    setQuest({ objectives: [...o.slice(0, -1), "", o[o.length - 1]] });
  };
  const removeStep = (i: number) => {
    if (steps <= LIMITS.minSteps) return;
    // Dialoge, die sich auf spätere Schritte beziehen, rücken mit; Dialoge des gelöschten Schritts entfallen
    const actors = doc.actors.map((a) => ({
      ...a,
      talk: a.talk
        .filter((t) => t.step !== i)
        .map((t) => (typeof t.step === "number" && t.step > i ? { ...t, step: t.step - 1 } : t)),
    }));
    onChange({ ...doc, actors: actors.map((a) => (a.talk.length ? a : { ...a, talk: [{ step: "*", lines: ["…"] }] })), quest: { ...doc.quest, objectives: doc.quest.objectives.filter((_, k) => k !== i) } });
  };

  const setTalk = (a: Actor, talk: Talk[]) => onChange(updateActor(doc, a.id, { talk }));
  const patchTalk = (a: Actor, i: number, patch: Partial<Talk>) => setTalk(a, a.talk.map((t, k) => (k === i ? { ...t, ...patch } : t)));

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="moba-panel rounded-2xl p-4 space-y-3 self-start">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Quest</p>
        <label className="block text-[11px] text-gray-400">Titel
          <input value={doc.quest.title} maxLength={LIMITS.titleLen} disabled={readOnly} onChange={(e) => setQuest({ title: e.target.value })} className={input} />
        </label>
        <label className="block text-[11px] text-gray-400">XP-Belohnung (0–{LIMITS.maxXp})
          <input type="number" min={0} max={LIMITS.maxXp} value={doc.quest.xpReward} disabled={readOnly} onChange={(e) => setQuest({ xpReward: Math.min(LIMITS.maxXp, Math.max(0, Math.round(Number(e.target.value) || 0))) })} className={input} />
        </label>
        <div className="space-y-2">
          <p className="text-[11px] text-gray-400">Schritte (Anzeige für den Spieler)</p>
          {doc.quest.objectives.slice(0, -1).map((o, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-1.5 w-5 h-5 shrink-0 rounded-full bg-violet-600/30 text-violet-200 text-[10px] font-bold grid place-items-center">{i + 1}</span>
              <input value={o} maxLength={LIMITS.objectiveLen} disabled={readOnly} placeholder="z. B. Sprich mit Olga." onChange={(e) => setObjective(i, e.target.value)} className={input} />
              {!readOnly && steps > LIMITS.minSteps && (
                <button type="button" onClick={() => removeStep(i)} aria-label={`Schritt ${i + 1} entfernen`} className="mt-1 text-gray-500 hover:text-red-400 text-sm px-1">✕</button>
              )}
            </div>
          ))}
          {!readOnly && steps < LIMITS.maxSteps && (
            <button type="button" onClick={addStep} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">+ Schritt</button>
          )}
          <label className="block text-[11px] text-gray-400">Abschlusstext
            <input value={doc.quest.objectives[steps]} maxLength={LIMITS.objectiveLen} disabled={readOnly} onChange={(e) => setObjective(steps, e.target.value)} className={input} />
          </label>
        </div>
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Tipp: Schritt 1 = Auftraggeber ansprechen, Schritt 2 = Truhe oder zweiten NPC finden, letzter Schritt = zurück zum Auftraggeber.
        </p>
      </div>

      <div className="space-y-3">
        {doc.actors.map((a) => (
          <div key={a.id} ref={a.id === focusActorId ? focusRef : undefined} className={`moba-panel rounded-2xl p-4 space-y-2 ${a.id === focusActorId ? "ring-1 ring-amber-400/60" : ""}`}>
            <p className="text-xs font-bold text-white">
              {a.name} <span className="text-[10px] font-normal text-gray-500">— {a.kind === "npc" ? "NPC" : a.kind === "chest" ? "Truhe" : "Schild"} bei {a.x}, {a.y}</span>
            </p>
            {a.talk.map((t, i) => (
              <div key={i} className="rounded-lg border border-white/10 p-2.5 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                  <label className="flex items-center gap-1.5">Gilt
                    <select
                      value={String(t.step)} disabled={readOnly}
                      onChange={(e) => patchTalk(a, i, e.target.value === "*" ? { step: "*", advance: undefined } : { step: Number(e.target.value) })}
                      className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white"
                    >
                      <option value="*">sonst (immer)</option>
                      {Array.from({ length: steps }, (_, s) => <option key={s} value={s}>bei Schritt {s + 1}</option>)}
                    </select>
                  </label>
                  {t.step !== "*" && (
                    <label className="flex items-center gap-1.5">
                      <input type="checkbox" checked={!!t.advance} disabled={readOnly} onChange={(e) => patchTalk(a, i, { advance: e.target.checked || undefined })} />
                      Quest rückt danach weiter
                    </label>
                  )}
                  {!readOnly && a.talk.length > 1 && (
                    <button type="button" onClick={() => setTalk(a, a.talk.filter((_, k) => k !== i))} className="ml-auto text-gray-500 hover:text-red-400">Entfernen</button>
                  )}
                </div>
                <textarea
                  value={t.lines.join("\n")} disabled={readOnly} rows={Math.min(6, Math.max(2, t.lines.length + 1))}
                  placeholder="Eine Zeile = ein Sprechblasen-Text"
                  onChange={(e) => patchTalk(a, i, { lines: e.target.value.split("\n").slice(0, LIMITS.maxLines).map((l) => l.slice(0, LIMITS.lineLen)) })}
                  className={`${input} resize-y`}
                />
              </div>
            ))}
            {!readOnly && a.talk.length < LIMITS.maxTalks && (
              <button type="button" onClick={() => setTalk(a, [...a.talk, { step: 0, lines: [""], advance: undefined }])} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">+ Dialog</button>
            )}
          </div>
        ))}
        {doc.actors.length === 0 && <p className="text-xs text-gray-500">Setze auf der Karte NPCs, Truhen oder Schilder, um ihnen Dialoge zu geben.</p>}
      </div>
    </div>
  );
}
