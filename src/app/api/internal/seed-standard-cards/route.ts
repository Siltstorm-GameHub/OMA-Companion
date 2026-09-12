// ============================================
// POST /api/internal/seed-standard-cards
// ============================================
// Einmalig auszuführender Seed für die 6 Standard-Karten. Läuft als
// echte Route statt als lokales Skript, weil die Produktions-DB-Zugangsdaten
// nur als Vercel-Secret existieren (nirgends lokal auslesbar) — dieser
// Endpoint läuft dort, wo die echte DATABASE_URL schon vorhanden ist.
//
// Idempotent: upsert über (name, rarity=STANDARD), kann gefahrlos mehrfach
// aufgerufen werden (z.B. nach einer Anpassung der Skill-Daten erneut).

import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STANDARD_CARDS } from "../../../../../prisma/battle-cards-seed-data";

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

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: { name: string; action: "created" | "updated" }[] = [];

  for (const seed of STANDARD_CARDS) {
    const existing = await prisma.card.findFirst({
      where: { name: seed.name, rarity: "STANDARD" },
    });

    const data = {
      name: seed.name,
      title: seed.title,
      class: seed.class,
      rarity: "STANDARD" as const,
      flavorText: seed.flavorText,
      baseHp: seed.baseHp,
      baseAttack: seed.baseAttack,
      baseDefense: seed.baseDefense,
      speed: seed.speed,
      normalAttackTargetRule: seed.normalAttackTargetRule,
      imageUrl: seed.imageUrl,
      passivePositive: toJson(seed.passivePositive),
      passiveNegative: toJson(seed.passiveNegative),
      activeSkill: toJson(seed.activeSkill),
      ultimateSkill: toJson(seed.ultimateSkill),
    };

    if (existing) {
      await prisma.card.update({ where: { id: existing.id }, data });
      results.push({ name: seed.name, action: "updated" });
    } else {
      await prisma.card.create({ data });
      results.push({ name: seed.name, action: "created" });
    }
  }

  return Response.json({ results });
}
