// ============================================
// OMA Quest — Fähigkeitsbaum (Server): gelernte Talente lesen, freischalten
// ============================================

import type { Card } from "@prisma/client";
import { prisma } from "../prisma";
import { levelOf } from "../te-map/rpg";
import { canUnlock, sanitizeSkills, skillPointsLeft, skillPointsSpent, skillPointsTotal, treeOf, type SkillNode } from "./skills";

export const classOf = (card: Pick<Card, "dndClass">): string => card.dndClass ?? "krieger";
export const skillsOf = (card: Pick<Card, "dndSkills" | "dndClass">): string[] => sanitizeSkills(classOf(card), card.dndSkills);

export interface SkillView {
  classId: string;
  className: string;
  level: number;
  owned: string[];
  points: { total: number; spent: number; left: number };
  tree: SkillNode[];
}

export function getSkillView(card: Card, className: string): SkillView {
  const classId = classOf(card);
  const level = levelOf(card.dndXp);
  const owned = skillsOf(card);
  return {
    classId, className, level, owned, tree: treeOf(classId),
    points: { total: skillPointsTotal(level), spent: skillPointsSpent(classId, owned), left: skillPointsLeft(classId, level, owned) },
  };
}

export async function unlockSkill(card: Card, id: string): Promise<{ ok: true } | { error: string }> {
  // Frisch lesen und in einer Transaktion schreiben, damit schnelle Doppelklicks keine Punkte doppelt ausgeben
  return prisma.$transaction(async (tx) => {
    const fresh = await tx.card.findUnique({ where: { id: card.id } });
    if (!fresh) return { error: "Charakter nicht gefunden" } as const;
    const classId = classOf(fresh);
    const owned = skillsOf(fresh);
    const check = canUnlock(classId, levelOf(fresh.dndXp), owned, id);
    if (!check.ok) return { error: check.reason } as const;
    await tx.card.update({ where: { id: fresh.id }, data: { dndSkills: sanitizeSkills(classId, [...owned, id]) } });
    return { ok: true } as const;
  });
}
