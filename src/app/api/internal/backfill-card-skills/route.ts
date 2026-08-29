// ============================================
// POST /api/internal/backfill-card-skills
// ============================================
// Einmalig auszuführen: runSeasonUpdate() aktualisiert bei einem Klassen-
// wechsel seit Kurzem auch Passiv/Aktiv/Ultimate-Skills (siehe
// lib/battle-cards/skill-templates.ts) — vorher wurden nur Stats/Klasse
// aktualisiert, sodass bereits reklassifizierte Community-Karten seitdem
// Skills der ALTEN Klasse an Stats der NEUEN Klasse hängen haben konnten.
// Dieser Endpoint gleicht das für alle bestehenden Community-Karten einmalig
// nach (respektiert overriddenFields). Idempotent, kann gefahrlos mehrfach
// laufen.

import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSkillTemplate } from "@/lib/battle-cards/skill-templates";

function isAuthorized(request: Request): boolean {
  const expectedSecret = process.env.INTERNAL_WEBHOOK_SECRET;
  if (!expectedSecret) return false;

  const header = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${expectedSecret}`;
  const headerBuf = Buffer.from(header);
  const expectedBuf = Buffer.from(expected);
  if (headerBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(headerBuf, expectedBuf);
}

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

function isOverridden(overriddenFields: string[], field: string): boolean {
  return overriddenFields.includes(field);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cards = await prisma.card.findMany({ where: { rarity: "COMMUNITY" } });

  let updated = 0;
  let skipped = 0;

  for (const card of cards) {
    const overridden = card.overriddenFields ?? [];
    const template = getSkillTemplate(card.class, card.linkedDiscordId ?? card.id);

    const updateData: Record<string, unknown> = {};
    if (!isOverridden(overridden, "passivePositive")) {
      updateData.passivePositive = toJson(template.passivePositive);
    }
    if (!isOverridden(overridden, "passiveNegative")) {
      updateData.passiveNegative = toJson(template.passiveNegative);
    }
    if (!isOverridden(overridden, "activeSkill")) {
      updateData.activeSkill = toJson(template.activeSkill);
    }
    if (!isOverridden(overridden, "ultimateSkill")) {
      updateData.ultimateSkill = toJson(template.ultimateSkill);
    }
    if (!isOverridden(overridden, "normalAttackTargetRule")) {
      updateData.normalAttackTargetRule = template.normalAttackTargetRule;
    }

    if (Object.keys(updateData).length === 0) {
      skipped++;
      continue;
    }

    await prisma.card.update({ where: { id: card.id }, data: updateData });
    updated++;
  }

  return Response.json({ totalCommunityCards: cards.length, updated, skipped });
}
