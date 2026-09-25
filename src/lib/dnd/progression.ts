// ============================================
// OMA Quest — Fortschritt (Server): Stufenbelohnungen abrechnen, Attribute/Fähigkeiten wählen, Übersicht, Rangliste
// ============================================
// Belohnungen werden lazy abgerechnet: sobald der Charakterbogen geladen oder etwas ausgegeben wird, vergleicht der Server die aktuelle
// Stufe (aus den XP) mit `dndLevelClaimed` und schreibt die fehlenden Attributspunkte/Fähigkeitswahlen gut. So funktioniert es für
// jede XP-Quelle und rückwirkend für Charaktere, die schon vor diesem System Stufen hatten.

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { ABILITIES, MAX_LEVEL, levelOf, xpForLevel, type Ability } from "../te-map/rpg";
import { displayTitle } from "./coin-shop";
import { MAX_ABILITY, isPerkId, levelReward, milestones, rewardsBetween, titleOf, type Milestone } from "./perks";

export const perksOf = (card: Pick<Card, "dndPerks">): string[] => (Array.isArray(card.dndPerks) ? (card.dndPerks as unknown[]).filter(isPerkId) : []);

export function abilityBonusOf(card: Pick<Card, "dndAbilityBonus">): Partial<Record<Ability, number>> {
  const raw = (card.dndAbilityBonus ?? {}) as Record<string, unknown>;
  const out: Partial<Record<Ability, number>> = {};
  for (const a of ABILITIES) if (typeof raw[a] === "number" && (raw[a] as number) > 0) out[a] = Math.min(MAX_ABILITY, Math.round(raw[a] as number));
  return out;
}

const baseScore = (card: Pick<Card, "abilityScores">, a: Ability): number => {
  const s = (card.abilityScores ?? {}) as Partial<Record<Ability, number>>;
  return typeof s[a] === "number" ? (s[a] as number) : 10;
};

/** Fehlende Stufenbelohnungen gutschreiben. Gibt den (ggf. aktualisierten) Charakter zurück. */
export async function syncLevelRewards(card: Card): Promise<Card> {
  const level = levelOf(card.dndXp);
  if (level <= card.dndLevelClaimed) return card;
  const r = rewardsBetween(card.dndLevelClaimed, level);
  return prisma.card.update({
    where: { id: card.id },
    data: { dndLevelClaimed: level, dndAttrPoints: { increment: r.attrPoints }, dndPerkPicks: { increment: r.perkPicks } },
  });
}

/** Einen Attributspunkt auf ein Attribut legen (Attribut + Bonus bleibt bei höchstens 20). */
export async function spendAttribute(card: Card, ability: unknown): Promise<{ ok: true } | { error: string }> {
  if (typeof ability !== "string" || !(ABILITIES as string[]).includes(ability)) return { error: "Unbekanntes Attribut" };
  const a = ability as Ability;
  const fresh = await syncLevelRewards(card);
  if (fresh.dndAttrPoints < 1) return { error: "Du hast keine Attributspunkte zu verteilen." };
  const bonus = abilityBonusOf(fresh);
  if (baseScore(fresh, a) + (bonus[a] ?? 0) >= MAX_ABILITY) return { error: `Dieses Attribut ist schon auf ${MAX_ABILITY}.` };
  // Atomar: nur abbuchen, wenn noch ein Punkt da ist
  const taken = await prisma.card.updateMany({ where: { id: fresh.id, dndAttrPoints: { gte: 1 } }, data: { dndAttrPoints: { decrement: 1 } } });
  if (!taken.count) return { error: "Du hast keine Attributspunkte zu verteilen." };
  await prisma.card.update({ where: { id: fresh.id }, data: { dndAbilityBonus: { ...bonus, [a]: (bonus[a] ?? 0) + 1 } } });
  return { ok: true };
}

export async function choosePerk(card: Card, perkId: unknown): Promise<{ ok: true } | { error: string }> {
  if (!isPerkId(perkId)) return { error: "Unbekannte Fähigkeit" };
  const fresh = await syncLevelRewards(card);
  if (fresh.dndPerkPicks < 1) return { error: "Du darfst gerade keine Fähigkeit wählen." };
  const owned = perksOf(fresh);
  if (owned.includes(perkId)) return { error: "Diese Fähigkeit hast du schon." };
  const taken = await prisma.card.updateMany({ where: { id: fresh.id, dndPerkPicks: { gte: 1 } }, data: { dndPerkPicks: { decrement: 1 } } });
  if (!taken.count) return { error: "Du darfst gerade keine Fähigkeit wählen." };
  await prisma.card.update({ where: { id: fresh.id }, data: { dndPerks: [...owned, perkId] } });
  return { ok: true };
}

// ── Übersicht ───────────────────────────────────────────────

export interface ProgressView {
  level: number;
  xp: number;
  title: string;
  attrPoints: number;
  perkPicks: number;
  perks: string[];
  /** Was die nächste Stufe bringt (null bei Höchststufe) */
  next: { level: number; xpNeeded: number; xpMissing: number; attrPoints: number; perkPick: boolean; title: string | null } | null;
  milestones: (Milestone & { reached: boolean })[];
  stats: { questsCompleted: number; questsActive: number; perksChosen: number };
  rank: { position: number; of: number } | null;
}

export async function getProgress(card: Card): Promise<ProgressView> {
  const c = await syncLevelRewards(card);
  const level = levelOf(c.dndXp);
  const [completed, active, ahead, total] = await Promise.all([
    prisma.dndQuestProgress.count({ where: { cardId: c.id, completed: true } }),
    prisma.dndQuestProgress.count({ where: { cardId: c.id, completed: false } }),
    prisma.card.count({ where: { dndCreatedAt: { not: null }, dndXp: { gt: c.dndXp } } }),
    prisma.card.count({ where: { dndCreatedAt: { not: null } } }),
  ]);
  const nextLevel = level + 1;
  const nr = level < MAX_LEVEL ? levelReward(nextLevel) : null;
  return {
    level, xp: c.dndXp, title: displayTitle(c, titleOf(level)), attrPoints: c.dndAttrPoints, perkPicks: c.dndPerkPicks, perks: perksOf(c),
    next: nr ? { level: nextLevel, xpNeeded: xpForLevel(nextLevel), xpMissing: Math.max(0, xpForLevel(nextLevel) - c.dndXp), attrPoints: nr.attrPoints, perkPick: nr.perkPick, title: milestones().find((m) => m.level === nextLevel)?.title ?? null } : null,
    milestones: milestones().map((m) => ({ ...m, reached: level >= m.level })),
    stats: { questsCompleted: completed, questsActive: active, perksChosen: perksOf(c).length },
    rank: { position: ahead + 1, of: total },
  };
}

export interface LeaderboardEntry { position: number; cardId: string; name: string; level: number; title: string; xp: number; avatarUrl: string | null; mine: boolean }

export async function leaderboard(myCardId: string, limit = 10): Promise<LeaderboardEntry[]> {
  const rows = await prisma.card.findMany({
    where: { dndCreatedAt: { not: null }, dndXp: { gt: 0 } },
    orderBy: [{ dndXp: "desc" }, { name: "asc" }],
    take: limit,
    select: { id: true, name: true, dndXp: true, linkedDiscordId: true, dndTitle: true, dndOwnedTitles: true },
  });
  const ids = rows.map((r) => r.linkedDiscordId).filter((v): v is string => !!v);
  const users = ids.length ? await prisma.user.findMany({ where: { discordId: { in: ids } }, select: { discordId: true, image: true } }) : [];
  const img = new Map(users.map((u) => [u.discordId!, u.image]));
  return rows.map((r, i) => {
    const level = levelOf(r.dndXp);
    return { position: i + 1, cardId: r.id, name: r.name, level, title: displayTitle(r, titleOf(level)), xp: r.dndXp, avatarUrl: r.linkedDiscordId ? img.get(r.linkedDiscordId) ?? null : null, mine: r.id === myCardId };
  });
}

