// ============================================
// POST /api/internal/seed-tactic-cards
// ============================================
// Einmalig auszuführender Seed für die OMA-Duels-Taktik-Karten (Items/Fallen).
// Läuft als echte Route statt als lokales Skript, weil die Produktions-DB-
// Zugangsdaten nur als Vercel-Secret existieren — analog zu
// /api/internal/seed-standard-cards.
//
// Idempotent: upsert über `name` (TacticCard.name ist nicht unique erzwungen,
// aber pro Name soll es nur eine Zeile geben — findFirst+update/create statt
// blindem create), kann gefahrlos mehrfach aufgerufen werden.

import { timingSafeEqual } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { TACTIC_CARDS } from "../../../../../prisma/battle-cards-tactic-seed-data";

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

  for (const seed of TACTIC_CARDS) {
    const existing = await prisma.tacticCard.findFirst({ where: { name: seed.name } });

    const data = {
      name: seed.name,
      kind: seed.kind,
      flavorText: seed.flavorText,
      description: seed.description,
      effects: toJson(seed.effects),
      triggerCondition: seed.triggerCondition ? toJson(seed.triggerCondition) : Prisma.JsonNull,
      rarity: "STANDARD" as const,
    };

    if (existing) {
      await prisma.tacticCard.update({ where: { id: existing.id }, data });
      results.push({ name: seed.name, action: "updated" });
    } else {
      await prisma.tacticCard.create({ data });
      results.push({ name: seed.name, action: "created" });
    }
  }

  return Response.json({ results });
}
