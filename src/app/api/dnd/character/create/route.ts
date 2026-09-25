import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSkillTemplate } from "@/lib/battle-cards/skill-templates";
import { buildCharacterSheet, withDndOverriddenFields } from "@/lib/dnd/character-creation";
import { ensureDndWorldSeeded, START_LOCATION_SLUG } from "@/lib/dnd/locations";
import { getRace } from "@/lib/dnd/races";
import { getDndClass } from "@/lib/dnd/classes";

function toJson<T>(value: T): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value));
}

/**
 * Charaktererstellung (Erst-Erstellung für Bestandsmitglieder ohne
 * dndCreatedAt — neue Mitglieder haben bereits einen ausgewürfelten
 * Charakter aus ensureCommunityCard) ODER einmaliger Re-Roll
 * (body: { reroll: true }), plan Abschnitt 2.1 + 6.3.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const reroll = body?.reroll === true;
  const gender: "male" | "female" = body?.gender === "female" ? "female" : "male";

  const race = typeof body?.raceId === "string" ? getRace(body.raceId) : undefined;
  const dndClass = typeof body?.classId === "string" ? getDndClass(body.classId) : undefined;
  if (!race || !dndClass) {
    return NextResponse.json({ error: "Ungültige Rasse oder Klasse" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  if (!user?.discordId) return NextResponse.json({ error: "Kein verknüpfter Discord-Account" }, { status: 400 });

  const card = await prisma.card.findUnique({ where: { linkedDiscordId: user.discordId } });
  if (!card) return NextResponse.json({ error: "Keine Community-Karte gefunden" }, { status: 404 });

  // Erster Wurf der Helden-Einrichtung (Card.heroRolledAt noch leer): gilt für alle Mitglieder, auch für die mit
  // automatisch erzeugter Karte (dndCreatedAt schon gesetzt), und kostet keinen Re-Roll-Credit.
  const firstRoll = !card.heroRolledAt;
  if (!firstRoll && !reroll) {
    return NextResponse.json({ error: "Charakter wurde bereits erstellt" }, { status: 400 });
  }
  if (!firstRoll && reroll && card.dndRerollCredits <= 0) {
    return NextResponse.json({ error: "Keine Re-Roll-Credits verfügbar" }, { status: 400 });
  }

  await ensureDndWorldSeeded();
  const sheet = buildCharacterSheet(card.name, race, dndClass, gender);
  const template = getSkillTemplate(sheet.cardClass, user.discordId);

  const startLocation = card.currentLocationId
    ? null
    : await prisma.dndLocation.findUnique({ where: { slug: START_LOCATION_SLUG } });

  // Erst-Erstellung: 1 Gratis-Credit (bisheriges "einmaliger Re-Roll"-Recht,
  // jetzt als Credit statt Boolean, damit im Shop nachkaufbare Re-Rolls
  // (buy-dnd-reroll) dieselbe Zählung nutzen). Reroll: verbraucht 1 Credit.
  const dndRerollCredits = firstRoll ? Math.max(1, card.dndRerollCredits) : { decrement: 1 };

  const updated = await prisma.card.update({
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
      dndCreatedAt: card.dndCreatedAt ?? new Date(),
      ...(firstRoll ? { heroRolledAt: new Date() } : {}),
      dndRerollCredits,
      currentLocationId: startLocation ? startLocation.id : undefined,
      overriddenFields: withDndOverriddenFields(card.overriddenFields ?? []),
    },
  });

  return NextResponse.json({
    card: {
      id: updated.id,
      name: updated.name,
      dndRace: updated.dndRace,
      dndClass: updated.dndClass,
      class: updated.class,
      abilityScores: updated.abilityScores,
      backstory: updated.backstory,
      baseHp: updated.baseHp,
      baseAttack: updated.baseAttack,
      baseDefense: updated.baseDefense,
      speed: updated.speed,
      dndRerollCredits: updated.dndRerollCredits,
    },
  });
}
