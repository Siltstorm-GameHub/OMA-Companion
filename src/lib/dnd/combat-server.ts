// ============================================
// OMA Quest — Kampf (Server): Begegnungen, Zustand speichern, Belohnungen
// ============================================
// Der Kampfzustand liegt als JSON an der Karte (ein Kampf zur Zeit). Jede Änderung prüft eine Versionsnummer (dndCombatV), damit zwei
// gleichzeitige Klicks nicht doppelt würfeln oder Belohnungen doppelt gutschreiben.

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { ABILITIES, abilityMod, biomeOfTerrain, levelBonus, levelOf, type Ability } from "../te-map/rpg";
import { terrainAt } from "./hex/world";
import { effectsOf } from "./perks";
import { resolveWorld } from "./custom-worlds";
import { allActorsOf } from "../te-map/interior";
import { perksOf } from "./progression";
import { skillEffects } from "./skills";
import { skillsOf } from "./skills-server";
import { checkParams, grantRewards } from "./rpg-server";
import { logChronicle } from "./chronicle";
import { advanceDndQuestObjective } from "./quests";
import { buildFighter, encountersFor, getMonster, performAction, rewardFor, startCombat, type Biome, type CombatAction, type CombatState, type Fighter, type Monster } from "./combat";

export interface CombatView {
  /** Besiegte Monster-Figuren auf Karten („slug:akteur“), die noch nicht nachgewachsen sind */
  slain: string[];
  state: CombatState | null;
  encounters: Monster[];
  biome: Biome;
  level: number;
  hero: Fighter;
}

/** Besiegte Monster-Figuren kommen nach dieser Zeit wieder. */
export const RESPAWN_MS = 15 * 60_000;
const SLAIN_RE = /^slain:(.+):([a-z0-9_-]+)@(\d+)$/;
const flagList = (card: Pick<Card, "dndFlags">): string[] => (Array.isArray(card.dndFlags) ? (card.dndFlags as unknown[]).filter((f): f is string => typeof f === "string") : []);

/** „slug:akteur“ aller Monster-Figuren, die dieser Held kürzlich besiegt hat. */
export function slainOf(card: Pick<Card, "dndFlags">, now = Date.now()): string[] {
  return flagList(card).flatMap((f) => { const m = SLAIN_RE.exec(f); return m && now - Number(m[3]) < RESPAWN_MS ? [`${m[1]}:${m[2]}`] : []; });
}

async function markSlain(cardId: string, source: { slug: string; actor: string }) {
  const fresh = await prisma.card.findUnique({ where: { id: cardId }, select: { dndFlags: true } });
  if (!fresh) return;
  const now = Date.now();
  const keep = flagList(fresh).filter((f) => { const m = SLAIN_RE.exec(f); return !m || (now - Number(m[3]) < RESPAWN_MS && !(m[1] === source.slug && m[2] === source.actor)); });
  await prisma.card.update({ where: { id: cardId }, data: { dndFlags: [...keep, `slain:${source.slug}:${source.actor}@${now}`] } });
}

const stateOf = (card: Pick<Card, "dndCombat">): CombatState | null => {
  const raw = card.dndCombat as CombatState | null;
  return raw && typeof raw === "object" && typeof raw.monsterId === "string" && raw.fighter ? raw : null;
};

function biomeOf(card: Card): Biome {
  const hex = card.currentHexCol != null && card.currentHexRow != null ? { col: card.currentHexCol, row: card.currentHexRow } : null;
  const b = biomeOfTerrain(hex ? terrainAt(hex) : null);
  return b === "cave" ? "temperate" : b;
}

/** Held-Schnappschuss: Attribut + Stufe + Ausrüstung + Fähigkeiten in einem Modifikator je Attribut. */
export async function fighterOf(card: Card): Promise<Fighter> {
  const level = levelOf(card.dndXp);
  const mods = {} as Record<Ability, number>;
  let crit = { critMin: 20, rerollFumble: false };
  for (const a of ABILITIES) {
    const p = await checkParams(card, a);
    mods[a] = abilityMod(p.score) + levelBonus(p.level) + p.equipmentBonus;
    crit = { critMin: p.critMin ?? 20, rerollFumble: !!p.rerollFumble };
  }
  const classId = card.dndClass ?? "krieger";
  return buildFighter({ name: card.name, classId, level, mods, ...crit, fx: skillEffects(classId, skillsOf(card)) });
}

export async function getCombatView(card: Card): Promise<CombatView> {
  const level = levelOf(card.dndXp);
  const biome = biomeOf(card);
  return { slain: slainOf(card), state: stateOf(card), encounters: encountersFor(level, biome), biome, level, hero: await fighterOf(card) };
}

/** Speichert den neuen Zustand nur, wenn seit dem Laden niemand anderes geschrieben hat. */
async function save(card: Card, next: CombatState | null): Promise<boolean> {
  const r = await prisma.card.updateMany({
    where: { id: card.id, dndCombatV: card.dndCombatV },
    data: { dndCombat: next ? JSON.parse(JSON.stringify(next)) : null, dndCombatV: { increment: 1 } },
  });
  return r.count === 1;
}
const RACE = { error: "Zu schnell — versuch es noch einmal." } as const;

export async function beginCombat(card: Card, monsterId: string, source?: { slug: string; actor: string }): Promise<{ ok: true } | { error: string }> {
  const cur = stateOf(card);
  if (cur?.status === "active") return { error: "Du steckst schon in einem Kampf." };
  const m = getMonster(monsterId);
  const view = await getCombatView(card);
  if (!m) return { error: "Unbekanntes Monster." };
  if (source) {
    // Monster-Figur auf der Karte: sie muss in dieser Location stehen, der Held muss dort sein, und sie darf nicht gerade besiegt sein
    const world = await resolveWorld(source.slug);
    const figure = world ? allActorsOf(world.map).find((a) => a.id === source.actor && a.kind === "monster" && a.monster === m.id) : undefined;
    if (!figure) return { error: "Dieses Monster gibt es hier nicht." };
    const loc = card.currentLocationId ? await prisma.dndLocation.findUnique({ where: { id: card.currentLocationId }, select: { slug: true } }) : null;
    if (loc?.slug !== source.slug) return { error: "Du bist nicht in dieser Location." };
    if (view.slain.includes(`${source.slug}:${source.actor}`)) return { error: "Das Monster ist gerade besiegt — es kommt später wieder." };
  } else if (!view.encounters.some((e) => e.id === m.id)) return { error: "Diese Begegnung gibt es hier nicht." };
  return (await save(card, startCombat(m, view.hero, source))) ? { ok: true } : RACE;
}

export async function actInCombat(card: Card, action: CombatAction): Promise<{ ok: true } | { error: string }> {
  const cur = stateOf(card);
  if (!cur) return { error: "Du kämpfst gerade nicht." };
  const r = performAction(cur, action);
  if (r.error) return { error: r.error };
  const next = r.state;
  const m = getMonster(next.monsterId);

  if (next.status === "won" && m) {
    // Erst den Zustand sichern (Versionsprüfung), dann gutschreiben — so wird nie doppelt belohnt
    const rew = rewardFor(m, next.fighter.level, Math.random);
    const xp = Math.max(0, Math.min(500, Math.round(rew.xp * effectsOf(perksOf(card)).xpMultiplier)));
    const after = levelOf(card.dndXp + xp);
    next.result = { xp, gold: rew.gold, items: rew.items, levelUp: after > levelOf(card.dndXp) ? after : null, goldLost: 0 };
    if (!(await save(card, next))) return RACE;
    await grantRewards(card, { xp: rew.xp, gold: rew.gold, items: rew.items }, undefined);
    if (next.source) await markSlain(card.id, next.source);
    await advanceDndQuestObjective(card.id, "MONSTER_SLAIN", 1, m.id).catch(() => {});
    if (m.level >= 6) await logChronicle("event", `${card.name} hat ${m.name} besiegt.`, undefined);
    return { ok: true };
  }
  if (next.status === "lost") {
    const lost = Math.min(card.dndGold, Math.floor(card.dndGold * 0.1));
    next.result = { xp: 0, gold: 0, items: [], levelUp: null, goldLost: lost };
    if (!(await save(card, next))) return RACE;
    if (lost) await prisma.card.update({ where: { id: card.id }, data: { dndGold: { decrement: lost } } });
    return { ok: true };
  }
  return (await save(card, next)) ? { ok: true } : RACE;
}

/** Beendeten Kampf wegräumen (Ergebnis bestätigt) bzw. aktiven aufgeben. */
export async function closeCombat(card: Card): Promise<{ ok: true } | { error: string }> {
  const cur = stateOf(card);
  if (!cur) return { ok: true };
  if (cur.status === "active") return { error: "Erst den Kampf beenden (fliehen)." };
  return (await save(card, null)) ? { ok: true } : RACE;
}
