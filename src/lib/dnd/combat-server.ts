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
import { effectiveTeCharacter } from "../battle-cards/standard-avatars";
import type { TeCharacterConfig } from "../te-character";
import { effectsOfCard } from "./progression";
import { addFx } from "./identity";
import { traitFx } from "./identity";
import { skillEffects } from "./skills";
import { skillsOf } from "./skills-server";
import { checkParams, getInventory, grantRewards } from "./rpg-server";
import { baitChance, companionFx, ownedCompanions, performTame } from "./companions";
import { TIER_META, TIER_TITLE, tierOf, type MonsterTier } from "./monster-tier";
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
  /** Pixel-Figur des Helden für die Kampfbühne */
  character: TeCharacterConfig;
  /** Gezähmte Monster (Begleiter) und die Zähmköder im Rucksack */
  companions: string[];
  baits: { key: string; name: string; emoji: string; qty: number; chance: number }[];
}

/** Besiegte Monster-Figuren kommen nach dieser Zeit wieder. */
export const RESPAWN_MS = 15 * 60_000;
const SLAIN_RE = /^slain:(.+):([a-z0-9_-]+)@(\d+)(?:~(\d+))?$/;
const flagList = (card: Pick<Card, "dndFlags">): string[] => (Array.isArray(card.dndFlags) ? (card.dndFlags as unknown[]).filter((f): f is string => typeof f === "string") : []);

/** „slug:akteur“ aller Monster-Figuren, die dieser Held kürzlich besiegt hat. */
export function slainOf(card: Pick<Card, "dndFlags">, now = Date.now()): string[] {
  return flagList(card).flatMap((f) => { const m = SLAIN_RE.exec(f); return m && now - Number(m[3]) < (m[4] ? Number(m[4]) : RESPAWN_MS) ? [`${m[1]}:${m[2]}`] : []; });
}

export async function markSlain(cardId: string, source: { slug: string; actor: string }, tier: MonsterTier = "normal") {
  const fresh = await prisma.card.findUnique({ where: { id: cardId }, select: { dndFlags: true } });
  if (!fresh) return;
  const now = Date.now();
  const keep = flagList(fresh).filter((f) => { const m = SLAIN_RE.exec(f); return !m || (now - Number(m[3]) < (m[4] ? Number(m[4]) : RESPAWN_MS) && !(m[1] === source.slug && m[2] === source.actor)); });
  await prisma.card.update({ where: { id: cardId }, data: { dndFlags: [...keep, `slain:${source.slug}:${source.actor}@${now}~${TIER_META[tier].respawnMs}`] } });
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
  return buildFighter({ name: card.name, classId, level, mods, ...crit, fx: addFx(addFx(skillEffects(classId, skillsOf(card)), traitFx(card.dndRace, classId, level)), companionFx(equippedCompanion(card))) });
}

/** Der ausgerüstete Begleiter (nur, wenn er auch wirklich gezähmt wurde). */
export const equippedCompanion = (card: Pick<Card, "dndCompanions" | "dndCompanion">): string | null => (card.dndCompanion && ownedCompanions(card.dndCompanions).includes(card.dndCompanion) ? card.dndCompanion : null);

export async function getCombatView(card: Card): Promise<CombatView> {
  const level = levelOf(card.dndXp);
  const biome = biomeOf(card);
  const baits = (await getInventory(card.id)).filter((e) => e.item.slot === "bait" && baitChance(e.key) !== null).map((e) => ({ key: e.key, name: e.item.name, emoji: e.item.emoji, qty: e.qty, chance: baitChance(e.key)! }));
  return { slain: slainOf(card), state: stateOf(card), encounters: encountersFor(level, biome), biome, level, hero: await fighterOf(card), character: effectiveTeCharacter(card), companions: ownedCompanions(card.dndCompanions), baits };
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

/** Darf dieser Held diese Begegnung starten? Liefert das Monster oder einen Fehlertext. Raid-Bosse gehen nur im Gruppenkampf (`group`). */
export async function checkEncounter(card: Card, monsterId: string, source: { slug: string; actor: string } | undefined, group = false): Promise<{ m: Monster; view: CombatView; tier: MonsterTier } | { error: string }> {
  const m = getMonster(monsterId);
  const view = await getCombatView(card);
  if (!m) return { error: "Unbekanntes Monster." };
  if (m.raid) return group ? { m, view, tier: "raid" as const } : { error: "Dieser Boss lässt sich nur mit einer Gruppe im Raid-Modus bekämpfen." };
  if (source) {
    // Monster-Figur auf der Karte: sie muss in dieser Location stehen, der Held muss dort sein, und sie darf nicht gerade besiegt sein
    const world = await resolveWorld(source.slug);
    const figure = world ? allActorsOf(world.map).find((a) => a.id === source.actor && a.kind === "monster" && a.monster === m.id) : undefined;
    if (!figure) return { error: "Dieses Monster gibt es hier nicht." };
    const loc = card.currentLocationId ? await prisma.dndLocation.findUnique({ where: { id: card.currentLocationId }, select: { slug: true } }) : null;
    if (loc?.slug !== source.slug) return { error: "Du bist nicht in dieser Location." };
    if (view.slain.includes(`${source.slug}:${source.actor}`)) return { error: "Das Monster ist gerade besiegt — es kommt später wieder." };
    return { m, view, tier: tierOf(m, figure.tier) };
  } else if (!view.encounters.some((e) => e.id === m.id)) return { error: "Diese Begegnung gibt es hier nicht." };
  return { m, view, tier: "normal" as const };
}

export async function beginCombat(card: Card, monsterId: string, source?: { slug: string; actor: string }): Promise<{ ok: true } | { error: string }> {
  const cur = stateOf(card);
  if (cur?.status === "active") return { error: "Du steckst schon in einem Kampf." };
  const chk = await checkEncounter(card, monsterId, source);
  if ("error" in chk) return chk;
  return (await save(card, startCombat(chk.m, chk.view.hero, source, chk.tier))) ? { ok: true } : RACE;
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
    const tier = next.tier ?? "normal";
    const rew = rewardFor(m, next.fighter.level, Math.random, tier);
    const xp = Math.max(0, Math.min(500, Math.round(rew.xp * effectsOfCard(card).xpMultiplier)));
    const after = levelOf(card.dndXp + xp);
    next.result = { xp, gold: rew.gold, items: rew.items, levelUp: after > levelOf(card.dndXp) ? after : null, goldLost: 0 };
    if (!(await save(card, next))) return RACE;
    await grantRewards(card, { xp: rew.xp, gold: rew.gold, items: rew.items }, undefined);
    if (next.source) await markSlain(card.id, next.source, tier);
    await grantTierTitle(card, tier);
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

/** Zähmversuch mit einem Köder (1 AP). Erfolg: das Monster wird Begleiter (einmal je Monster) und verlässt den Kampf. Der Köder ist in jedem Fall verbraucht. */
export async function tameInCombat(card: Card, baitKey: string): Promise<{ ok: true } | { error: string }> {
  const cur = stateOf(card);
  if (!cur) return { error: "Du kämpfst gerade nicht." };
  const chance = baitChance(baitKey);
  if (chance === null) return { error: "Das ist kein Zähmköder." };
  const have = (await getInventory(card.id)).find((e) => e.key === baitKey);
  if (!have || have.qty < 1) return { error: "Du hast diesen Köder nicht." };
  const owned = ownedCompanions(card.dndCompanions);
  const r = performTame(cur, chance, owned);
  if (r.error) return { error: r.error };
  const next = r.state;
  if (next.status === "tamed") next.result = { xp: 0, gold: 0, items: [], levelUp: null, goldLost: 0 };
  if (!(await save(card, next))) return RACE;
  // Köder verbrauchen
  if (have.qty <= 1) await prisma.dndInventoryItem.deleteMany({ where: { cardId: card.id, itemKey: baitKey } });
  else await prisma.dndInventoryItem.updateMany({ where: { cardId: card.id, itemKey: baitKey }, data: { qty: { decrement: 1 } } });
  if (next.status === "tamed") {
    await prisma.card.update({ where: { id: card.id }, data: { dndCompanions: [...owned, next.monsterId], ...(card.dndCompanion ? {} : { dndCompanion: next.monsterId }) } });
    if (next.source) await markSlain(card.id, next.source, next.tier);
  }
  return { ok: true };
}

/** Erster Sieg über eine Elite-, Boss- oder Raid-Stufe: Ehrentitel (einmalig). */
export async function grantTierTitle(card: Pick<Card, "id" | "name" | "dndOwnedTitles">, tier: MonsterTier): Promise<void> {
  const title = TIER_TITLE[tier];
  if (!title) return;
  const fresh = await prisma.card.findUnique({ where: { id: card.id }, select: { dndOwnedTitles: true } });
  const owned = Array.isArray(fresh?.dndOwnedTitles) ? (fresh!.dndOwnedTitles as unknown[]).filter((t): t is string => typeof t === "string") : [];
  if (owned.includes(title)) return;
  await prisma.card.update({ where: { id: card.id }, data: { dndOwnedTitles: [...owned, title] } });
  await logChronicle("event", `${card.name} hat den Ehrentitel „${title}“ verdient.`, undefined);
}

/** Beendeten Kampf wegräumen (Ergebnis bestätigt) bzw. aktiven aufgeben. */
export async function closeCombat(card: Card): Promise<{ ok: true } | { error: string }> {
  const cur = stateOf(card);
  if (!cur) return { ok: true };
  if (cur.status === "active") return { error: "Erst den Kampf beenden (fliehen)." };
  return (await save(card, null)) ? { ok: true } : RACE;
}
