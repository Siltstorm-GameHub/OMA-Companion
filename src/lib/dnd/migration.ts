// ============================================
// Migration Bestandsmitglieder (plan Abschnitt 6.1)
// ============================================
// Sanfter Hinweis-Banner ab Launch, nach einer Frist automatische Umwandlung
// für alle verbleibenden Mitglieder ohne eigenen Charakter — ausgelöst über
// denselben täglichen Cron wie der Reise-Cleanup-Sweep (kein zweiter Cron).

import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { getSkillTemplate } from "../battle-cards/skill-templates";
import { rollNewCharacterSheet, withDndOverriddenFields } from "./character-creation";
import { ensureDndWorldSeeded, START_LOCATION_SLUG } from "./locations";

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

// Frist: 3 Wochen ab Launch-Datum des Features. Launch-Datum ist hier fix
// hinterlegt (statt in der DB), weil es ein einmaliges Ereignis ist — analog
// zu anderen festen Konstanten wie CAMPAIGN_CHAPTER_NAME. Bei Bedarf einfach
// anpassen/verschieben (Team-Entscheidung laut Plan noch final zu setzen).
export const DND_FEATURE_LAUNCH_AT = new Date("2026-09-24T00:00:00Z");
export const DND_MIGRATION_DEADLINE = new Date(DND_FEATURE_LAUNCH_AT.getTime() + 21 * 24 * 60 * 60 * 1000);

export function isMigrationDeadlinePassed(now: Date = new Date()): boolean {
  return now >= DND_MIGRATION_DEADLINE;
}

/**
 * Würfelt für alle COMMUNITY-Karten ohne dndCreatedAt automatisch einen
 * Charakter aus (gleicher Flow wie die manuelle Erstellung, nur ohne
 * Nutzerinteraktion). No-op vor der Frist. Wird vom täglichen
 * dnd-travel-sweep-Cron aufgerufen.
 */
export async function runAutoMigrationIfDeadlinePassed(): Promise<{ migrated: number }> {
  if (!isMigrationDeadlinePassed()) return { migrated: 0 };

  await ensureDndWorldSeeded();
  const startLocation = await prisma.dndLocation.findUnique({ where: { slug: START_LOCATION_SLUG } });

  const pending = await prisma.card.findMany({
    where: { rarity: "COMMUNITY", dndCreatedAt: null, linkedDiscordId: { not: null } },
  });

  for (const card of pending) {
    const sheet = rollNewCharacterSheet(card.name);
    const template = getSkillTemplate(sheet.cardClass, card.linkedDiscordId!);
    await prisma.card.update({
      where: { id: card.id },
      data: {
        class: sheet.cardClass,
        baseHp: sheet.derivedStats.baseHp,
        baseAttack: sheet.derivedStats.baseAttack,
        baseDefense: sheet.derivedStats.baseDefense,
        speed: sheet.derivedStats.speed,
        normalAttackTargetRule: template.normalAttackTargetRule,
        passivePositive: toJson(template.passivePositive),
        passiveNegative: toJson(template.passiveNegative),
        activeSkill: toJson(template.activeSkill),
        ultimateSkill: toJson(template.ultimateSkill),
        dndRace: sheet.race.name,
        dndClass: sheet.dndClass.name,
        abilityScores: toJson(sheet.abilityScores),
        backstory: sheet.backstory,
        dndCreatedAt: new Date(),
        // Nutzer hat nicht selbst ausgewürfelt (Frist verstrichen) — bekommt
        // dafür 1 Re-Roll-Credit gratis, um die Automatik-Wahl doch noch
        // einmal zu korrigieren.
        dndRerollCredits: 1,
        currentLocationId: card.currentLocationId ?? startLocation?.id,
        overriddenFields: withDndOverriddenFields(card.overriddenFields ?? []),
      },
    });
  }

  return { migrated: pending.length };
}
