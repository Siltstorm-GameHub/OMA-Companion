"use client";

// ============================================
// OMA Quest — Kampfbühne (Seitenansicht wie im klassischen Rollenspiel): Monster rechts oben, Helden links, Befehle unten
// ============================================
// Für Einzel- und Gruppenkampf. Handy zuerst: große Tippflächen, Figuren und Balken skalieren mit der Anzahl der Helden.
// Schaden und Heilung schweben als Zahlen über den Figuren (FxLayer), der Angreifer spielt seine Angriffsanimation.

import { useState } from "react";
import BattleFigure from "@/components/te-character/BattleFigure";
import MonsterSprite from "@/components/te-map/play/MonsterSprite";
import { ClassIcon, FxLayer } from "@/components/te-map/play/Fx";
import { apOf, getMonster, slotAbilities, type Fighter } from "@/lib/dnd/combat";
import { TIER_META, type MonsterTier } from "@/lib/dnd/monster-tier";
import { ELEMENT_ICON, ELEMENT_LABEL, STATUS_DESC, STATUS_ICON, STATUS_LABEL, getAbility, type AbilityDef, type StatusId } from "@/lib/dnd/abilities";
import { BACKDROPS, type BackdropKey } from "@/lib/dnd/oq-backdrop";
import { berlinHour, isNight } from "@/lib/te-map/rpg";
import type { FxEvent } from "@/lib/dnd/oq-fx";
import type { TeCharacterConfig } from "@/lib/te-character";
import { defaultTeConfig } from "@/lib/te-character";

export interface StageHero {
  key: string;
  name: string;
  classId: string;
  character: TeCharacterConfig | null;
  hp: number;
  maxHp: number;
  ac: number;
  guard: boolean;
  /** Schild-LP */
  shield?: number;
  down: boolean;
  left: boolean;
  /** Ist gerade am Zug */
  active: boolean;
  mine: boolean;
}

const PARTICLES: Partial<Record<StatusId, { glyph: string; fall?: boolean; xs: number[] }>> = {
  burn: { glyph: "🔥", xs: [22, 46, 68] }, poison: { glyph: "🫧", xs: [26, 50, 72] }, bleed: { glyph: "🩸", fall: true, xs: [30, 60] }, taunt: { glyph: "💢", xs: [70] },
};

/** Überlagerung am Monster: Partikel und Symbole je aktivem Zustand (die Figur selbst wird über `statusClass` gefärbt). */
function StatusAura({ status }: { status?: Partial<Record<StatusId, number>> }) {
  const on = (k: StatusId) => (status?.[k] ?? 0) > 0;
  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-visible">
      {(Object.keys(PARTICLES) as StatusId[]).filter(on).flatMap((k) => PARTICLES[k]!.xs.map((x, i) => (
        <span key={`${k}${i}`} className={`oq-st-p ${PARTICLES[k]!.fall ? "oq-st-fall" : ""}`} style={{ left: `${x}%`, bottom: PARTICLES[k]!.fall ? undefined : "18%", top: PARTICLES[k]!.fall ? "20%" : undefined, animationDelay: `${i * 0.45}s` }}>{PARTICLES[k]!.glyph}</span>
      )))}
      {on("stun") && [0, 0.55, 1.1].map((d) => <span key={d} className="oq-st-orbit" style={{ animationDelay: `-${d}s` }}>⭐</span>)}
      {on("vulnerable") && <span className="oq-st-ring" />}
      {on("slow") && <span className="oq-st-p" style={{ left: "40%", top: "0", animationName: "oq-st-pulse", animationDuration: "1.4s" }}>❄️</span>}
    </div>
  );
}
const statusClass = (st?: Partial<Record<StatusId, number>>): string => (["burn", "poison", "bleed", "slow", "taunt"] as StatusId[]).filter((k) => (st?.[k] ?? 0) > 0).map((k) => `oq-st-${k}`).join(" ");

/** Hintergrund der Location: Himmel-Verlauf oben, Pixel-Boden unten (abgedunkelt), nachts zusätzlich dunkler. */
function Backdrop({ backdrop, night }: { backdrop: BackdropKey; night: boolean }) {
  const b = BACKDROPS[backdrop];
  return (
    <>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${b.sky[0]} 0%, ${b.sky[1]} 54%)` }} />
      <div
        className="absolute inset-x-0 bottom-0 h-[46%]"
        style={{ backgroundImage: `linear-gradient(180deg, rgba(0,0,0,${b.dim * 0.5}), rgba(0,0,0,${b.dim + 0.15})), url(/oq/tex/${b.ground}.png)`, backgroundSize: "auto, 64px 64px", imageRendering: "pixelated", borderTop: "2px solid rgba(0,0,0,0.45)" }}
      />
      {night && <div className="absolute inset-0 bg-[#050a25]/45 pointer-events-none" />}
    </>
  );
}

function Bar({ value, max, color, h = "h-2" }: { value: number; max: number; color: string; h?: string }) {
  return (
    <div className={`${h} w-full rounded-sm bg-black/60 border border-black/70 overflow-hidden`} role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100))}%` }} />
    </div>
  );
}

function figureHeight(n: number): string {
  return n <= 1 ? "h-[130px] sm:h-[150px]" : n <= 3 ? "h-[100px] sm:h-[120px]" : n <= 6 ? "h-[70px] sm:h-[90px]" : "h-[58px] sm:h-[74px]";
}

interface StageProps {
  monsterId: string;
  monsterHp: number;
  monsterMaxHp: number;
  monsterNote?: string;
  /** Stufe des Monsters (Elite/Boss/Raid): größerer Sprite, farbiger Rahmen, Symbol, Banner */
  monsterTier?: MonsterTier;
  /** Zustände am Monster (Restrunden) */
  monsterStatus?: Partial<Record<StatusId, number>>;
  /** Hintergrund passend zur Location (siehe lib/dnd/oq-backdrop) */
  backdrop?: BackdropKey;
  heroes: StageHero[];
  fx: FxEvent[];
  status: "active" | "won" | "lost" | "fled" | "tamed";
  /** Tippen auf einen Helden wählt ihn als Ziel (Heilung, Schutz) */
  selectedKey?: string;
  onPickHero?: (key: string) => void;
}

export function BattleStage({ monsterId, monsterHp, monsterMaxHp, monsterNote, monsterTier = "normal", monsterStatus, backdrop = "plains", heroes, fx, status, selectedKey, onPickHero }: StageProps) {
  const night = isNight(berlinHour()) && backdrop !== "cave";
  const m = getMonster(monsterId);
  const solo = heroes.length === 1;
  const hClass = figureHeight(heroes.length);
  const heroKeyOf = (e: FxEvent): string | undefined => (solo ? heroes[0].key : heroes.find((h) => h.name === e.hero)?.key ?? heroes.find((h) => h.mine)?.key);
  const won = status === "won";
  const tamed = status === "tamed";

  return (
    <div className="relative w-full h-[330px] sm:h-[390px] overflow-hidden rounded-md border-2 border-[#4a3b1c] shadow-[0_3px_0_rgba(0,0,0,0.6)]">
      <Backdrop backdrop={backdrop} night={night} />

      {/* Monster: rechts oben, Namensschild darüber */}
      <div className={`absolute right-2 top-2 w-[46%] max-w-[190px] flex flex-col items-center gap-1 transition-opacity duration-700 ${won ? "opacity-0 delay-700" : ""} ${tamed ? "opacity-60" : ""}`}>
        <div className="w-full rounded-md bg-black/70 border px-2 py-1" style={{ borderColor: monsterTier === "normal" ? "rgba(255,255,255,0.15)" : TIER_META[monsterTier].color, boxShadow: monsterTier === "normal" ? undefined : `0 0 8px ${TIER_META[monsterTier].color}66` }}>
          <p className="text-[11px] font-black text-white truncate">{monsterTier !== "normal" && <span aria-label={TIER_META[monsterTier].label} title={TIER_META[monsterTier].label} className="mr-1">{TIER_META[monsterTier].icon}</span>}{m?.name ?? "Monster"} <span className="text-gray-400 font-bold">Lv {m?.level}</span>{monsterTier !== "normal" && <span className="ml-1 text-[9px] uppercase tracking-wider" style={{ color: TIER_META[monsterTier].color }}>{TIER_META[monsterTier].label}</span>}</p>
          <Bar value={monsterHp} max={monsterMaxHp} color="bg-red-500" h="h-2.5" />
          <p className="text-[10px] text-gray-300 tabular-nums">{monsterHp}/{monsterMaxHp} LP · RK {m?.ac}{monsterNote ? ` · ${monsterNote}` : ""}</p>
          {(m?.weak?.length || m?.resist?.length) ? (
            <p className="text-[10px] leading-tight flex flex-wrap gap-x-1.5">
              {m?.weak?.map((e) => <span key={`w${e}`} className="text-emerald-300" title={`Schwach gegen ${ELEMENT_LABEL[e]} (×1,5)`}>{ELEMENT_ICON[e]}▲</span>)}
              {m?.resist?.map((e) => <span key={`r${e}`} className="text-rose-300" title={`Resistent gegen ${ELEMENT_LABEL[e]} (×0,5)`}>{ELEMENT_ICON[e]}▼</span>)}
            </p>
          ) : null}
          {monsterStatus && Object.entries(monsterStatus).some(([, v]) => (v ?? 0) > 0) && (
            <p className="text-[10px] leading-tight flex flex-wrap gap-x-1.5">
              {(Object.entries(monsterStatus) as [StatusId, number][]).filter(([, v]) => v > 0).map(([k, v]) => <span key={k} className="text-amber-200 font-bold" title={`${STATUS_LABEL[k]}: ${STATUS_DESC[k]}`}>{STATUS_ICON[k]}{v}</span>)}
            </p>
          )}
        </div>
        <div className="relative flex items-end justify-center min-h-[96px]">
          <FxLayer events={fx.filter((e) => e.side === "monster")} />
          <StatusAura status={monsterStatus} />
          <div className={statusClass(monsterStatus)}><MonsterSprite monsterId={monsterId} box={monsterTier === "raid" ? 150 : monsterTier === "boss" ? 130 : monsterTier === "elite" ? 118 : 96} flip hitKey={fx.filter((e) => e.side === "monster" && e.kind !== "miss").at(-1)?.id} attackKey={fx.filter((e) => e.side === "hero" && (e.kind === "hurt" || e.kind === "miss")).at(-1)?.id} /></div>
        </div>
      </div>

      {/* Helden: links unten */}
      <div className={`absolute left-1 bottom-1 ${solo ? "w-[46%] items-end justify-center" : "w-[62%] items-end content-end"} flex flex-wrap gap-x-0.5 gap-y-1`}>
        {heroes.map((h) => {
          const mine = fx.filter((e) => e.side === "hero" && heroKeyOf(e) === h.key);
          const acted = fx.filter((e) => e.side === "monster" && e.actor && (solo ? e.actor === "self" : e.actor === h.name));
          const attackKey = acted.at(-1)?.id ?? 0;
          const blockKey = mine.filter((e) => e.kind === "barrier").at(-1)?.id ?? 0;
          const alive = !h.down && !h.left;
          const selected = selectedKey === h.key;
          const cell = (
            <>
              {h.active && status === "active" && <span aria-hidden className="absolute -top-3 left-1/2 -translate-x-1/2 text-amber-300 text-[12px] leading-none animate-bounce">▼</span>}
              <div className={`relative flex items-end justify-center ${h.left ? "opacity-30" : ""}`}>
                <FxLayer events={mine} scale={heroes.length > 3 ? 0.55 : 0.8} />
                {h.character !== undefined && (
                  <BattleFigure
                    config={h.character ?? defaultTeConfig()} unitClass={["magier", "kleriker", "barde"].includes(h.classId) ? "SUPPORT" : undefined} team="A" facing="right" attackKey={attackKey} blockKey={blockKey}
                    alive={alive} victory={won && alive} scale={8} title={h.name} className={`${hClass} w-auto`}
                  />
                )}
                {h.guard && alive && <span aria-hidden className="absolute -right-1 top-1 text-[11px] rounded bg-sky-500/80 text-white px-1 font-black">RK+</span>}
              </div>
              <div className={`${solo ? "w-24" : "w-[62px] sm:w-[72px]"} mt-0.5`}>
                <p className={`text-[9px] sm:text-[10px] font-black leading-tight text-center truncate ${h.mine ? "text-amber-200" : "text-white"}`} style={{ textShadow: "0 1px 2px #000" }}>
                  <ClassIcon classId={h.classId} size={10} className="mr-0.5 align-[-1px]" />{h.name}
                </p>
                <Bar value={h.hp} max={h.maxHp} color={h.hp / Math.max(1, h.maxHp) < 0.3 ? "bg-red-500" : "bg-emerald-500"} />
                <p className="text-[9px] text-gray-100 text-center tabular-nums leading-tight" style={{ textShadow: "0 1px 2px #000" }}>{h.left ? "geflohen" : h.down ? "am Boden" : `${h.hp}/${h.maxHp}`}{alive && (h.shield ?? 0) > 0 ? <span className="text-sky-300"> +{h.shield}🛡</span> : null}</p>
              </div>
            </>
          );
          const base = `relative flex flex-col items-center rounded-md px-0.5 pt-3 ${selected ? "ring-2 ring-amber-300 bg-white/10" : ""}`;
          return onPickHero && !h.left ? (
            <button key={h.key} type="button" onClick={() => onPickHero(h.key)} aria-pressed={selected} aria-label={`${h.name} als Ziel wählen`} className={`${base} touch-manipulation`}>{cell}</button>
          ) : (
            <div key={h.key} className={base}>{cell}</div>
          );
        })}
      </div>

      {monsterTier !== "normal" && status === "active" && (
        <div key={monsterId} className="oq-boss-banner absolute inset-x-0 top-[38%] text-center pointer-events-none">
          <span className="inline-block px-5 py-1.5 rounded-md border-2 bg-black/80 text-lg font-black tracking-widest" style={{ borderColor: TIER_META[monsterTier].color, color: TIER_META[monsterTier].color }}>{TIER_META[monsterTier].icon} {TIER_META[monsterTier].label.toUpperCase()}</span>
        </div>
      )}

      {status !== "active" && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className={`inline-block px-4 py-1.5 rounded-md border-2 bg-black/75 text-lg font-black tracking-wide ${won || tamed ? "border-emerald-300 text-emerald-200" : status === "fled" ? "border-amber-300 text-amber-200" : "border-red-400 text-red-300"}`}>
            {won ? "SIEG!" : tamed ? "GEZÄHMT!" : status === "fled" ? "RÜCKZUG" : "NIEDERLAGE"}
          </span>
        </div>
      )}
    </div>
  );
}

export interface AbilityCardData { key: string; def: AbilityDef; ap: number; cd: number; disabled: boolean; mastered: boolean; onClick: () => void }

/** Karten für die Fähigkeiten, die der Held gerade nutzen darf (Platz 1 = Aktion „ability“, sonst „abilityN“). */
export function abilityCards(f: Fighter, cooldowns: Record<string, number>, ap: number, act: (action: string) => void): AbilityCardData[] {
  const mastered = !!f.fx?.mastery;
  return slotAbilities(f).map((def) => {
    const cost = apOf(f, def);
    return { key: def.id, def, ap: cost, cd: cooldowns[def.id] ?? 0, disabled: ap < cost, mastered: mastered && def.slot === 1, onClick: () => act(def.slot === 1 ? "ability" : `ability${def.slot}`) };
  });
}

/** Beschreibung mit Meisterschaft (falls freigeschaltet). */
const descOf = (c: AbilityCardData): string => c.def.desc + (c.mastered && c.def.mastery ? ` ★ ${c.def.mastery.desc}` : "");
export const masteryOf = (classId: string): string | undefined => getAbility(classId, 1)?.mastery?.desc;

export interface Cmd {
  key: string;
  label: string;
  icon: string;
  cost?: number;
  /** Verbleibende Abklingzeit in Runden */
  cd?: number;
  disabled?: boolean;
  gold?: boolean;
  hint?: string;
  onClick: () => void;
}

/** Befehlsleiste unten: große Tippflächen (3 pro Zeile), darunter „Zug beenden“ und die Aktionspunkte. */
export function CommandBar({ round, ap, apMax, cmds, abilities, onEnd, busy, endLabel = "Zug beenden", info }: { round: number; ap: number; apMax: number; cmds: Cmd[]; abilities?: AbilityCardData[]; onEnd: () => void; busy: boolean; endLabel?: string; info?: string }) {
  const [hint, setHint] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const many = (abilities?.length ?? 0) > 1;
  const ready = abilities?.filter((c) => !c.disabled && c.cd === 0).length ?? 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-white">
        <span className="font-black">Runde {round}</span>
        <span className="flex gap-1" aria-label={`${ap} von ${apMax} Aktionspunkten`}>
          {Array.from({ length: apMax }, (_, i) => <span key={i} className={`w-3.5 h-3.5 rounded-full border-2 border-amber-300 ${i < ap ? "bg-amber-300" : ""}`} />)}
        </span>
        {info && <span className="ml-auto text-[11px] text-gray-300 tabular-nums">{info}</span>}
      </div>
      {sheet && many && (
        <div className="grid grid-cols-2 gap-1.5" role="menu" aria-label="Fähigkeiten">
          {abilities!.map((c) => (
            <button
              key={c.key} type="button" role="menuitem" disabled={busy || c.disabled || c.cd > 0} onClick={() => { setSheet(false); c.onClick(); }}
              className="oq-btn oq-btn-gold relative min-h-[64px] text-left px-2 py-1.5 flex flex-col gap-0.5 touch-manipulation"
            >
              <span className="flex items-center gap-1 text-[12px] font-black leading-tight"><span aria-hidden>{ELEMENT_ICON[c.def.element]}</span>{c.def.name}{c.mastered && <span className="text-amber-200" title="Meisterschaft">★</span>}<span className="ml-auto text-[10px] opacity-80">{c.ap} AP · {c.def.cd} R</span></span>
              <span className="text-[10px] leading-snug opacity-90">{descOf(c)}</span>
              <span className="text-[9px] uppercase tracking-wider opacity-70">{ELEMENT_LABEL[c.def.element]}{c.def.target === "ally" ? " · Ziel antippen" : ""}</span>
              {c.cd > 0 && <span className="absolute inset-0 grid place-items-center rounded bg-black/60 text-sm font-black text-amber-200">{c.cd} R</span>}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5">
        {abilities && abilities.length === 1 && (
          <button type="button" disabled={busy || abilities[0].disabled || abilities[0].cd > 0} onClick={() => { setHint(descOf(abilities[0])); abilities[0].onClick(); }} onPointerEnter={() => setHint(descOf(abilities[0]))} className="oq-btn oq-btn-gold relative min-h-[54px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 touch-manipulation">
            <span className="text-xl leading-none" aria-hidden>{abilities[0].def.icon}</span>
            <span className="text-[11px] font-black leading-tight text-center">{abilities[0].def.name}</span>
            <span className="absolute top-0.5 right-1 text-[10px] font-black opacity-80">{abilities[0].ap}</span>
            {abilities[0].cd > 0 && <span className="absolute inset-0 grid place-items-center rounded bg-black/55 text-sm font-black text-amber-200">{abilities[0].cd} R</span>}
          </button>
        )}
        {many && (
          <button type="button" disabled={busy} aria-expanded={sheet} onClick={() => setSheet((o) => !o)} className="oq-btn oq-btn-gold relative min-h-[54px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 touch-manipulation">
            <span className="text-xl leading-none" aria-hidden>✨</span>
            <span className="text-[11px] font-black leading-tight text-center">Fähigkeiten {sheet ? "▼" : "▲"}</span>
            <span className="absolute top-0.5 right-1 text-[10px] font-black opacity-80">{ready}</span>
          </button>
        )}
        {cmds.map((c) => (
          <button
            key={c.key} type="button" disabled={busy || c.disabled || (c.cd ?? 0) > 0}
            onClick={() => { setHint(c.hint ?? null); c.onClick(); }}
            onPointerEnter={() => setHint(c.hint ?? null)}
            className={`oq-btn relative min-h-[54px] flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 touch-manipulation ${c.gold ? "oq-btn-gold" : ""}`}
          >
            <span className="text-xl leading-none" aria-hidden>{c.icon}</span>
            <span className="text-[11px] font-black leading-tight text-center">{c.label}</span>
            {c.cost !== undefined && <span className="absolute top-0.5 right-1 text-[10px] font-black opacity-80">{c.cost}</span>}
            {(c.cd ?? 0) > 0 && <span className="absolute inset-0 grid place-items-center rounded bg-black/55 text-sm font-black text-amber-200">{c.cd} R</span>}
          </button>
        ))}
      </div>
      <button type="button" disabled={busy} onClick={onEnd} className="oq-btn w-full min-h-[44px] text-sm font-black touch-manipulation">{endLabel} ▶</button>
      {hint && <p className="text-[11px] text-gray-300 leading-snug">{hint}</p>}
    </div>
  );
}

/** Verlauf: standardmäßig nur die letzten drei Zeilen, ausklappbar. */
export function BattleLog({ log }: { log: string[] }) {
  const [open, setOpen] = useState(false);
  const lines = open ? log.slice(-30) : log.slice(-3);
  return (
    <div className="oq-slot p-2 text-[11px] text-gray-200 space-y-0.5" aria-live="polite">
      <div className={`space-y-0.5 ${open ? "max-h-40 overflow-y-auto" : ""}`}>
        {lines.map((l, i) => <p key={`${log.length}-${i}`} className={i === lines.length - 1 ? "text-white font-semibold" : "text-gray-300"}>{l}</p>)}
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-[10px] font-black uppercase tracking-wider text-amber-200/90 hover:text-amber-100">{open ? "Verlauf einklappen ▴" : "Ganzen Verlauf zeigen ▾"}</button>
    </div>
  );
}
