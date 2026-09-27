"use client";

// ============================================
// Welten-Editor: Quests (mehrere pro Location, auch mit Besuchen anderer Locations) und Dialoge
// ============================================
// Eine Quest besteht aus Schritten. Gesprächs-Schritte schließt ein Akteur dieser Location ab: Dialog für genau
// diese Quest und diesen Schritt mit „Quest rückt danach weiter“ (Schritt 1 ist das Angebot: der Spieler kann
// annehmen oder ablehnen). Besuchs-Schritte zählen automatisch, sobald der Spieler die gewählte andere Location
// betritt — so laufen Quests über mehrere Locations. Mehrere Quests können am selben Akteur hängen.

import { useEffect, useRef, useState } from "react";
import { docQuestSlug, LIMITS, type CustomWorldDoc, type CustomWorldQuest, type DocQuestStep } from "@/lib/te-map/custom-world";
import { allActors, bindTalkStep, locateActor, mapAllActors, updateAnyActor } from "@/lib/te-map/custom-world-edit";
import { GOAL_STEP_TYPES } from "@/lib/dnd/quest-objectives";
import { MONSTERS } from "@/lib/dnd/combat";
import TalkAdvanced from "./TalkAdvanced";
import type { Actor, Talk } from "@/lib/te-map/types";

interface Props {
  doc: CustomWorldDoc;
  readOnly: boolean;
  onChange: (doc: CustomWorldDoc) => void;
  focusActorId: string | null;
  /** Slug dieser Location (sie selbst ist kein Besuchsziel) */
  ownSlug: string;
}

const input = "mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";

export default function QuestEditor({ doc, readOnly, onChange, focusActorId, ownSlug }: Props) {
  const [qi, setQi] = useState(0);
  const [locations, setLocations] = useState<{ slug: string; name: string }[]>([]);
  const [myQuests, setMyQuests] = useState<{ slug: string; title: string; locationName: string }[]>([]);
  const [myQuestlines, setMyQuestlines] = useState<string[]>([]);
  const focusRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { focusRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }); }, [focusActorId]);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/custom-worlds/hexes").then((r) => r.json()).then((j) => { if (!cancelled && j.taken) setLocations(j.taken.map((t: { slug: string; name: string }) => ({ slug: t.slug, name: t.name }))); }).catch(() => {});
    fetch("/api/dnd/custom-worlds/my-quests").then((r) => r.json()).then((j) => { if (!cancelled) { setMyQuests(j.quests ?? []); setMyQuestlines(j.questlines ?? []); } }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const quests = doc.quests;
  const cur = Math.min(qi, quests.length - 1);
  const quest = quests[cur];
  const firstId = quests[0].id;
  const questOf = (t: Talk) => t.quest ?? firstId;

  const setQuests = (next: CustomWorldQuest[], actors: Actor[] = doc.actors) => onChange({ ...doc, quests: next, actors });
  const patchQuest = (patch: Partial<CustomWorldQuest>) => setQuests(quests.map((q, i) => (i === cur ? { ...q, ...patch } : q)));
  const patchStep = (i: number, patch: Partial<DocQuestStep>) => patchQuest({ steps: quest.steps.map((s, k) => (k === i ? { ...s, ...patch } : s)) });

  const addQuest = () => {
    if (quests.length >= LIMITS.maxQuests) return;
    let n = quests.length + 1;
    while (quests.some((q) => q.id === `q${n}`)) n++;
    setQuests([...quests, { id: `q${n}`, title: "Neue Quest", steps: [{ kind: "talk", text: "" }], done: "Abgeschlossen!", xpReward: 20 }]);
    setQi(quests.length);
  };
  const removeQuest = () => {
    if (quests.length <= 1) return;
    const gone = quest.id;
    const next = quests.filter((_, i) => i !== cur);
    // Dialoge der gelöschten Quest entfallen; wurde die erste gelöscht, gilt "ohne Angabe" nun der neuen ersten
    const newFirst = next[0].id;
    const withTalks = mapAllActors(doc, (a) => {
      const talk = a.talk
        .filter((t) => t.step === "*" || (t.quest ?? firstId) !== gone)
        .map((t) => (t.step !== "*" && (t.quest ?? firstId) === newFirst ? { step: t.step, lines: t.lines, ...(t.advance ? { advance: true } : {}) } : t));
      return { ...a, talk: talk.length ? talk : [{ step: "*" as const, lines: ["…"] }] };
    });
    onChange({ ...withTalks, quests: next });
    setQi(0);
  };

  const enterable = doc.buildings.flatMap((b, i) => (b.interior ? [{ index: i, name: b.name || `Gebäude ${i + 1}` }] : []));
  const talkers = allActors(doc).filter((a) => a.kind === "npc" || a.kind === "merchant" || a.kind === "chest");
  const placedMonsters = [...new Set(allActors(doc).flatMap((a) => (a.kind === "monster" && a.monster ? [a.monster] : [])))];
  const addStep = (kind: "talk" | "visit" | "enter" | "goal") => {
    if (quest.steps.length >= LIMITS.maxSteps) return;
    patchQuest({
      steps: [...quest.steps, {
        kind, text: "",
        ...(kind === "visit" ? { location: locations.find((l) => l.slug !== ownSlug)?.slug } : {}),
        ...(kind === "enter" && enterable[0] ? { building: enterable[0].index } : {}),
        ...(kind === "goal" ? { objectiveType: "MONSTER_SLAIN", targetCount: 3, ...(placedMonsters[0] ? { targetRef: placedMonsters[0] } : {}) } : {}),
      }],
    });
  };
  /** Diese Quest als Vorlage für den nächsten Teil einer Questreihe nutzen: gleiche Reihe, Teil+1, Voraussetzung = diese Quest. */
  const duplicateAsNextPart = () => {
    if (quests.length >= LIMITS.maxQuests) return;
    let n = quests.length + 1;
    while (quests.some((q) => q.id === `q${n}`)) n++;
    const mySlug = docQuestSlug(ownSlug, quest.id);
    setQuests([...quests, {
      id: `q${n}`, title: `${quest.title} — Teil ${(quest.part ?? 1) + 1}`, steps: [{ kind: "talk", text: "" }], done: "Abgeschlossen!", xpReward: quest.xpReward,
      ...(quest.questline ? { questline: quest.questline } : {}), part: (quest.part ?? 1) + 1, requires: mySlug,
    }]);
    setQi(quests.length);
  };
  /** Schritt „Gespräch“ an einen bestimmten NPC binden: der bekommt automatisch den passenden Dialog. */
  const bindActor = (i: number, actorId: string) => {
    const withDialog = actorId ? bindTalkStep(doc, quest.id, i, actorId) : doc;
    onChange({ ...withDialog, quests: quests.map((q, k) => (k === cur ? { ...q, steps: q.steps.map((s, si) => { if (si !== i) return s; const { actor: _a, ...rest } = s; void _a; return actorId ? { ...rest, actor: actorId } : rest; }) } : q)) });
  };
  const removeStep = (i: number) => {
    if (quest.steps.length <= LIMITS.minSteps) return;
    // Dialoge, die sich auf spätere Schritte dieser Quest beziehen, rücken mit; die des gelöschten Schritts entfallen
    const withTalks = mapAllActors(doc, (a) => {
      const talk = a.talk
        .filter((t) => !(t.step === i && questOf(t) === quest.id))
        .map((t) => (typeof t.step === "number" && questOf(t) === quest.id && t.step > i ? { ...t, step: t.step - 1 } : t));
      return { ...a, talk: talk.length ? talk : [{ step: "*" as const, lines: ["…"] }] };
    });
    onChange({ ...withTalks, quests: quests.map((q, k) => (k === cur ? { ...q, steps: q.steps.filter((_, s) => s !== i) } : q)) });
  };

  const setTalk = (a: Actor, talk: Talk[]) => onChange(updateAnyActor(doc, a.id, { talk }));
  const patchTalk = (a: Actor, i: number, patch: Partial<Talk>) => setTalk(a, a.talk.map((t, k) => (k === i ? { ...t, ...patch } : t)));
  const talkSteps = (qid: string) => (quests.find((q) => q.id === qid)?.steps ?? []).flatMap((s, i) => (s.kind === "talk" ? [i] : []));

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <div className="moba-panel rounded-2xl p-4 space-y-3 self-start">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mr-1">Quests</p>
          {quests.map((q, i) => (
            <button key={q.id} type="button" onClick={() => setQi(i)} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${i === cur ? "border-amber-400 text-amber-200" : "border-white/10 text-gray-400 hover:border-white/30"}`}>
              {q.title || `Quest ${i + 1}`}
            </button>
          ))}
          {!readOnly && quests.length < LIMITS.maxQuests && (
            <button type="button" onClick={addQuest} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-2.5 py-1 hover:border-white/30">+ Quest</button>
          )}
        </div>

        <label className="block text-[11px] text-gray-400">Titel
          <input value={quest.title} maxLength={LIMITS.titleLen} disabled={readOnly} onChange={(e) => patchQuest({ title: e.target.value })} className={input} />
        </label>
        <label className="block text-[11px] text-gray-400">XP-Belohnung (0–{LIMITS.maxXp})
          <input type="number" min={0} max={LIMITS.maxXp} value={quest.xpReward} disabled={readOnly} onChange={(e) => patchQuest({ xpReward: Math.min(LIMITS.maxXp, Math.max(0, Math.round(Number(e.target.value) || 0))) })} className={input} />
        </label>

        <div className="rounded-lg border border-violet-400/20 bg-violet-500/5 p-2.5 space-y-2">
          <p className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">Questreihe (optional)</p>
          <label className="block text-[11px] text-gray-400">Name der Reihe — Spieler sehen ihn als Serie, auch über mehrere Locations hinweg
            <input value={quest.questline ?? ""} maxLength={LIMITS.titleLen} disabled={readOnly} list="oq-questlines" placeholder="z. B. Die Asche-Chroniken" onChange={(e) => patchQuest({ questline: e.target.value || undefined })} className={input} />
            <datalist id="oq-questlines">{myQuestlines.map((n) => <option key={n} value={n} />)}</datalist>
          </label>
          {quest.questline && (
            <label className="block text-[11px] text-gray-400">Teil-Nummer
              <input type="number" min={1} max={99} value={quest.part ?? 1} disabled={readOnly} onChange={(e) => patchQuest({ part: Math.min(99, Math.max(1, Math.round(Number(e.target.value) || 1))) })} className={input} />
            </label>
          )}
          <label className="block text-[11px] text-gray-400">Voraussetzung — erst annehmbar, wenn diese Quest abgeschlossen ist
            <select value={quest.requires ?? ""} disabled={readOnly} onChange={(e) => patchQuest({ requires: e.target.value || undefined })} className={input}>
              <option value="">Keine</option>
              {myQuests.filter((q) => q.slug !== docQuestSlug(ownSlug, quest.id)).map((q) => <option key={q.slug} value={q.slug}>{q.title} ({q.locationName})</option>)}
            </select>
          </label>
          {!readOnly && (
            <button type="button" onClick={duplicateAsNextPart} disabled={quests.length >= LIMITS.maxQuests} className="w-full rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold py-1.5 hover:border-white/30 disabled:opacity-50">
              + Nächsten Teil dieser Reihe anlegen
            </button>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-[11px] text-gray-400">Schritte</p>
          {quest.steps.map((st, i) => (
            <div key={i} className="rounded-lg border border-white/10 p-2 space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 shrink-0 rounded-full bg-violet-600/30 text-violet-200 text-[10px] font-bold grid place-items-center">{i + 1}</span>
                {i === 0 ? (
                  <span className="text-[11px] text-gray-400">Gespräch — Quest-Angebot</span>
                ) : (
                  <select
                    value={st.kind} disabled={readOnly}
                    onChange={(e) => {
                      const k = e.target.value;
                      const { actor: _a, building: _b, location: _l, objectiveType: _o, targetRef: _r, tier: _t, targetCount: _c, ...rest } = st;
                      void _a; void _b; void _l; void _o; void _r; void _t; void _c;
                      patchQuest({
                        steps: quest.steps.map((s, si) => (si === i ? (
                          k === "visit" ? { ...rest, kind: "visit", location: locations.find((l) => l.slug !== ownSlug)?.slug }
                          : k === "enter" ? { ...rest, kind: "enter", ...(enterable[0] ? { building: enterable[0].index } : {}) }
                          : k === "goal" ? { ...rest, kind: "goal", objectiveType: "MONSTER_SLAIN", targetCount: 3, ...(placedMonsters[0] ? { targetRef: placedMonsters[0] } : {}) }
                          : { ...rest, kind: "talk" }
                        ) : s)),
                      });
                    }}
                    className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white text-[11px]"
                  >
                    <option value="talk">Gespräch mit einem NPC</option>
                    <option value="enter">Gebäude betreten</option>
                    <option value="visit">Location erreichen</option>
                    <option value="goal">Ziel erreichen (z. B. Monster besiegen)</option>
                  </select>
                )}
                {!readOnly && quest.steps.length > LIMITS.minSteps && (
                  <button type="button" onClick={() => removeStep(i)} aria-label={`Schritt ${i + 1} entfernen`} className="ml-auto text-gray-500 hover:text-red-400 text-sm px-1">✕</button>
                )}
              </div>
              {st.kind === "talk" && (
                <label className="block text-[10px] text-gray-500">Mit wem? (der NPC bekommt den Dialog automatisch)
                  <select value={st.actor ?? ""} disabled={readOnly} onChange={(e) => bindActor(i, e.target.value)} className={input}>
                    <option value="">Beliebiger Akteur (Dialog selbst zuweisen)</option>
                    {talkers.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.kind === "npc" ? "NPC" : a.kind === "merchant" ? "Händler" : "Truhe"})</option>)}
                  </select>
                </label>
              )}
              {st.kind === "enter" && (
                enterable.length === 0 ? (
                  <p className="text-[10px] text-amber-300">Kein Gebäude mit Innenraum vorhanden. Lege im Karten-Tab einen Innenraum an.</p>
                ) : (
                  <label className="block text-[10px] text-gray-500">Welches Gebäude?
                    <select value={st.building ?? ""} disabled={readOnly} onChange={(e) => patchStep(i, { building: e.target.value === "" ? undefined : Number(e.target.value) })} className={input}>
                      <option value="">Gebäude wählen …</option>
                      {enterable.map((b) => <option key={b.index} value={b.index}>{b.name}</option>)}
                    </select>
                  </label>
                )
              )}
              {st.kind === "visit" && (
                <select value={st.location ?? ""} disabled={readOnly} onChange={(e) => patchStep(i, { location: e.target.value })} className={input}>
                  <option value="">Location wählen …</option>
                  {locations.filter((l) => l.slug !== ownSlug).map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}
                </select>
              )}
              {st.kind === "goal" && (
                <div className="grid grid-cols-2 gap-1.5">
                  <label className="block text-[10px] text-gray-500">Ereignis
                    <select value={st.objectiveType ?? "MONSTER_SLAIN"} disabled={readOnly} onChange={(e) => patchStep(i, { objectiveType: e.target.value, ...(e.target.value !== "MONSTER_SLAIN" ? { tier: undefined } : {}) })} className={input}>
                      {GOAL_STEP_TYPES.map((t) => <option key={t.type} value={t.type}>{t.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-[10px] text-gray-500">Anzahl
                    <input type="number" min={1} max={20} value={st.targetCount ?? 1} disabled={readOnly} onChange={(e) => patchStep(i, { targetCount: Math.min(20, Math.max(1, Math.round(Number(e.target.value) || 1))) })} className={input} />
                  </label>
                  <label className="block text-[10px] text-gray-500">Monster
                    <select value={st.targetRef ?? ""} disabled={readOnly} onChange={(e) => patchStep(i, { targetRef: e.target.value || undefined })} className={input}>
                      <option value="">Beliebiges Monster</option>
                      {placedMonsters.length > 0 && <optgroup label="In dieser Location platziert">{placedMonsters.map((id) => { const m = MONSTERS.find((x) => x.id === id); return m ? <option key={id} value={id}>{m.emoji} {m.name}</option> : null; })}</optgroup>}
                      <optgroup label="Alle Monster">{MONSTERS.filter((m) => !m.raid).map((m) => <option key={m.id} value={m.id}>{m.emoji} {m.name}</option>)}</optgroup>
                    </select>
                  </label>
                  {st.objectiveType !== "COMPANION_TAMED" && (
                    <label className="block text-[10px] text-gray-500">Stufe
                      <select value={st.tier ?? ""} disabled={readOnly} onChange={(e) => patchStep(i, { tier: e.target.value || undefined })} className={input}>
                        <option value="">Beliebig</option>
                        <option value="elite">👑 nur Elite</option>
                        <option value="boss">💀 nur Boss</option>
                      </select>
                    </label>
                  )}
                  <p className="col-span-2 text-[10px] text-gray-500">Rückt automatisch weiter, sobald das Ziel erreicht ist — ohne eigenen Dialog. Ein Monster ohne Auswahl muss nicht in dieser Location stehen.</p>
                </div>
              )}
              <input value={st.text} maxLength={LIMITS.objectiveLen} disabled={readOnly} placeholder={st.kind === "visit" ? "z. B. Erreiche den Bergpass." : st.kind === "enter" ? "z. B. Betritt die Taverne." : st.kind === "goal" ? "z. B. Besiege 3 Elite-Wölfe im Krähwald." : "z. B. Sprich mit Olga."} onChange={(e) => patchStep(i, { text: e.target.value })} className={input} />
            </div>
          ))}
          {!readOnly && quest.steps.length < LIMITS.maxSteps && (
            <div className="flex gap-2">
              <button type="button" onClick={() => addStep("talk")} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">+ Gespräch</button>
              <button type="button" onClick={() => addStep("enter")} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">+ Gebäude betreten</button>
              <button type="button" onClick={() => addStep("visit")} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">+ Location erreichen</button>
              <button type="button" onClick={() => addStep("goal")} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">+ Ziel (Kampf/Zähmen)</button>
            </div>
          )}
          <label className="block text-[11px] text-gray-400">Abschlusstext
            <input value={quest.done} maxLength={LIMITS.objectiveLen} disabled={readOnly} onChange={(e) => patchQuest({ done: e.target.value })} className={input} />
          </label>
        </div>
        {!readOnly && quests.length > 1 && (
          <button type="button" onClick={removeQuest} className="w-full rounded-lg border border-red-400/30 text-red-300 text-[11px] font-semibold py-1.5 hover:bg-red-500/10">Diese Quest löschen</button>
        )}
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Schritt 1 ist immer ein Gespräch (dort nimmt der Spieler die Quest an). Besuchs-Schritte zählen automatisch beim Betreten der gewählten Location. Mehrere Quests können am selben NPC hängen.
        </p>
      </div>

      <div className="space-y-3">
        {allActors(doc).filter((a) => a.kind !== "monster").map((a) => (
          <div key={a.id} ref={a.id === focusActorId ? focusRef : undefined} className={`moba-panel rounded-2xl p-4 space-y-2 ${a.id === focusActorId ? "ring-1 ring-amber-400/60" : ""}`}>
            <p className="text-xs font-bold text-white">
              {a.name} <span className="text-[10px] font-normal text-gray-500">— {a.kind === "npc" ? "NPC" : a.kind === "merchant" ? "Händler" : a.kind === "chest" ? "Truhe" : "Schild"} {(() => { const loc = locateActor(doc, a.id); return loc?.building != null ? `in „${doc.buildings[loc.building].name || "Gebäude"}“` : `bei ${a.x}, ${a.y}`; })()}</span>
            </p>
            {a.talk.map((t, i) => {
              const qid = questOf(t);
              return (
                <div key={i} className="rounded-lg border border-white/10 p-2.5 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    {t.step !== "*" && quests.length > 1 && (
                      <select value={qid} disabled={readOnly} onChange={(e) => patchTalk(a, i, { quest: e.target.value === firstId ? undefined : e.target.value, step: talkSteps(e.target.value)[0] ?? 0 })} className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white">
                        {quests.map((q) => <option key={q.id} value={q.id}>{q.title || q.id}</option>)}
                      </select>
                    )}
                    <label className="flex items-center gap-1.5">Gilt
                      <select
                        value={String(t.step)} disabled={readOnly}
                        onChange={(e) => patchTalk(a, i, e.target.value === "*" ? { step: "*", advance: undefined, quest: undefined } : { step: Number(e.target.value) })}
                        className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white"
                      >
                        <option value="*">sonst (immer)</option>
                        {talkSteps(qid).map((s) => <option key={s} value={s}>bei Schritt {s + 1}{s === 0 ? " (Angebot)" : ""}</option>)}
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
                  <TalkAdvanced talk={t} readOnly={readOnly} onChange={(patch) => patchTalk(a, i, patch)} />
                </div>
              );
            })}
            {!readOnly && a.talk.length < LIMITS.maxTalks && (
              <button type="button" onClick={() => setTalk(a, [...a.talk, { step: 0, lines: [""], advance: undefined, ...(quest.id !== firstId ? { quest: quest.id } : {}) }])} className="rounded-lg border border-white/15 text-gray-300 text-[11px] font-semibold px-3 py-1.5 hover:border-white/30">+ Dialog</button>
            )}
          </div>
        ))}
        {allActors(doc).length === 0 && <p className="text-xs text-gray-500">Setze auf der Karte NPCs, Truhen oder Schilder, um ihnen Dialoge zu geben.</p>}
      </div>
    </div>
  );
}
