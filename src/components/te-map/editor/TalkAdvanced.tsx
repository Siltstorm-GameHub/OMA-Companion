"use client";

// ============================================
// Welten-Editor: erweiterte Dialog-Optionen — Bedingungen (Ereignisse, Tageszeit) und Antworten mit Würfelproben
// ============================================

import { FLAG_RE, LIMITS } from "@/lib/te-map/custom-world";
import { ITEMS } from "@/lib/dnd/items";
import { ABILITIES, ABILITY_LABEL, DC_PRESETS, WEATHERS, WEATHER_ICON, WEATHER_LABEL } from "@/lib/te-map/rpg";
import type { Outcome, Talk, TalkChoice } from "@/lib/te-map/types";

const input = "mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";

const parseFlags = (v: string): string[] => v.split(/[,\s]+/).map((f) => f.trim().toLowerCase()).filter((f) => FLAG_RE.test(f)).slice(0, LIMITS.maxFlags);

function OutcomeEditor({ title, value, onChange, canAdvance, readOnly }: { title: string; value: Outcome; onChange: (o: Outcome) => void; canAdvance: boolean; readOnly: boolean }) {
  const set = (patch: Partial<Outcome>) => onChange({ ...value, ...patch });
  return (
    <div className="rounded-lg border border-white/10 p-2 space-y-1.5">
      <p className="text-[10px] font-semibold text-sky-300 uppercase tracking-widest">{title}</p>
      <textarea value={value.lines.join("\n")} disabled={readOnly} rows={2} placeholder="Was passiert? (eine Zeile = ein Text)" onChange={(e) => set({ lines: e.target.value.split("\n").slice(0, 4).map((l) => l.slice(0, LIMITS.lineLen)) })} className={`${input} resize-y`} />
      <div className="grid grid-cols-2 gap-1.5 text-[11px] text-gray-400">
        <label>XP (0–{LIMITS.maxOutcomeXp})<input type="number" min={0} max={LIMITS.maxOutcomeXp} value={value.xp ?? 0} disabled={readOnly} onChange={(e) => set({ xp: Math.min(LIMITS.maxOutcomeXp, Math.max(0, Math.round(Number(e.target.value) || 0))) })} className={input} /></label>
        <label>Gold (0–{LIMITS.maxOutcomeGold})<input type="number" min={0} max={LIMITS.maxOutcomeGold} value={value.gold ?? 0} disabled={readOnly} onChange={(e) => set({ gold: Math.min(LIMITS.maxOutcomeGold, Math.max(0, Math.round(Number(e.target.value) || 0))) })} className={input} /></label>
        <label>Gegenstand
          <select value={value.items?.[0] ?? ""} disabled={readOnly} onChange={(e) => set({ items: e.target.value ? [e.target.value] : [] })} className={input}>
            <option value="">Keiner</option>{ITEMS.map((i) => <option key={i.key} value={i.key}>{i.emoji} {i.name}</option>)}
          </select>
        </label>
        <label>Merkt sich (Ereignisse)<input defaultValue={(value.flags ?? []).join(", ")} key={(value.flags ?? []).join(",")} disabled={readOnly} placeholder="z. B. hat-geholfen" onBlur={(e) => set({ flags: parseFlags(e.target.value) })} className={input} /></label>
      </div>
      {canAdvance && (
        <label className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <input type="checkbox" checked={!!value.advance} disabled={readOnly} onChange={(e) => set({ advance: e.target.checked || undefined })} /> Quest rückt weiter
        </label>
      )}
    </div>
  );
}

export default function TalkAdvanced({ talk, onChange, readOnly }: { talk: Talk; onChange: (patch: Partial<Talk>) => void; readOnly: boolean }) {
  const choices = talk.choices ?? [];
  const canAdvance = typeof talk.step === "number";
  const setChoice = (i: number, patch: Partial<TalkChoice>) => onChange({ choices: choices.map((c, k) => (k === i ? { ...c, ...patch } : c)) });
  const active = !!(talk.requires?.length || talk.forbids?.length || talk.time || talk.weather || choices.length);

  return (
    <details className="text-[11px]" open={active}>
      <summary className="cursor-pointer text-gray-400 hover:text-white">Erweitert: Bedingungen &amp; Antworten{active ? " ●" : ""}</summary>
      <div className="mt-2 space-y-2">
        <div className="grid gap-1.5 sm:grid-cols-4 text-gray-400">
          <label>Nur wenn erlebt<input defaultValue={(talk.requires ?? []).join(", ")} key={`r${(talk.requires ?? []).join(",")}`} disabled={readOnly} placeholder="Ereignis(se)" onBlur={(e) => onChange({ requires: parseFlags(e.target.value) })} className={input} /></label>
          <label>Nur wenn NICHT erlebt<input defaultValue={(talk.forbids ?? []).join(", ")} key={`f${(talk.forbids ?? []).join(",")}`} disabled={readOnly} placeholder="Ereignis(se)" onBlur={(e) => onChange({ forbids: parseFlags(e.target.value) })} className={input} /></label>
          <label>Tageszeit
            <select value={talk.time ?? ""} disabled={readOnly} onChange={(e) => onChange({ time: (e.target.value || undefined) as Talk["time"] })} className={input}>
              <option value="">Immer</option><option value="day">Nur tagsüber</option><option value="night">Nur nachts</option>
            </select>
          </label>
          <label>Wetter
            <select value={talk.weather ?? ""} disabled={readOnly} onChange={(e) => onChange({ weather: (e.target.value || undefined) as Talk["weather"] })} className={input}>
              <option value="">Egal</option>{WEATHERS.map((w) => <option key={w} value={w}>{WEATHER_ICON[w]} {WEATHER_LABEL[w]}{w === "rain" ? " (auch Sturm)" : ""}</option>)}
            </select>
          </label>
        </div>
        <p className="text-gray-500">Ereignisse sind Merkzettel des Charakters („hat-geholfen“): Antworten können sie setzen, andere Dialoge sie verlangen — so erinnert sich ein NPC an frühere Entscheidungen.</p>

        {choices.map((c, i) => (
          <div key={i} className="rounded-lg border border-sky-400/30 p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <input value={c.text} maxLength={80} disabled={readOnly} placeholder="Antwort des Spielers, z. B. „Ich überrede ihn.“" onChange={(e) => setChoice(i, { text: e.target.value })} className={input} />
              {!readOnly && <button type="button" onClick={() => onChange({ choices: choices.filter((_, k) => k !== i) })} aria-label="Antwort entfernen" className="mt-0.5 text-gray-500 hover:text-red-400 px-1">✕</button>}
            </div>
            <label className="flex items-center gap-1.5 text-gray-400">
              <input type="checkbox" checked={!!c.check} disabled={readOnly} onChange={(e) => setChoice(i, e.target.checked ? { check: { ability: "cha", dc: 12 }, fail: c.fail ?? { lines: ["Es misslingt."] } } : { check: undefined, fail: undefined })} /> Würfelprobe (d20 + Attribut)
            </label>
            {c.check && (
              <div className="grid grid-cols-3 gap-1.5 text-gray-400">
                <label>Attribut
                  <select value={c.check.ability} disabled={readOnly} onChange={(e) => setChoice(i, { check: { ...c.check!, ability: e.target.value as typeof c.check.ability } })} className={input}>{ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_LABEL[a]}</option>)}</select>
                </label>
                <label>Schwierigkeit (5–25)
                  <input type="number" min={5} max={25} list="dc-presets" value={c.check.dc} disabled={readOnly} onChange={(e) => setChoice(i, { check: { ...c.check!, dc: Math.min(25, Math.max(5, Math.round(Number(e.target.value) || 12))) } })} className={input} />
                </label>
                <label className="flex items-end gap-1.5 pb-1"><input type="checkbox" checked={!!c.check.retry} disabled={readOnly} onChange={(e) => setChoice(i, { check: { ...c.check!, retry: e.target.checked || undefined } })} /> Erneut versuchen</label>
              </div>
            )}
            <OutcomeEditor title={c.check ? "Bei Erfolg" : "Ergebnis"} value={c.success} onChange={(o) => setChoice(i, { success: o })} canAdvance={canAdvance} readOnly={readOnly} />
            {c.check && <OutcomeEditor title="Bei Misserfolg" value={c.fail ?? { lines: [] }} onChange={(o) => setChoice(i, { fail: o })} canAdvance={false} readOnly={readOnly} />}
          </div>
        ))}
        <datalist id="dc-presets">{DC_PRESETS.map((p) => <option key={p.dc} value={p.dc}>{p.label}</option>)}</datalist>
        {!readOnly && choices.length < LIMITS.maxChoices && (
          <button type="button" onClick={() => onChange({ choices: [...choices, { text: "", success: { lines: [""] } }], advance: undefined })} className="rounded-lg border border-white/15 text-gray-300 font-semibold px-3 py-1.5 hover:border-white/30">+ Antwort / Probe</button>
        )}
        {choices.length > 0 && <p className="text-gray-500">Mit Antworten rückt die Quest nur über deren Ergebnis weiter („Quest rückt weiter“ dort setzen). Jede Antwort zählt je Charakter einmal.</p>}
      </div>
    </details>
  );
}
