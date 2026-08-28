// ============================================
// POST /api/internal/backfill-community-cards
// ============================================
// Einmalig auszuführen: legt für ALLE bestehenden User mit discordId eine
// Community-Karte an, falls noch keine existiert. Der DB-Trigger für
// /api/internal/user-sync feuert nur bei INSERT/UPDATE OF discordId — für
// Mitglieder, die es schon vor dem Trigger gab, ist er nie gelaufen. Dieser
// Endpoint holt das nach. Idempotent (ensureCommunityCard prüft selbst auf
// bereits vorhandene Karten), kann gefahrlos mehrfach laufen.

import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ensureCommunityCard } from "@/lib/season/card-provisioning";

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

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const members = await prisma.user.findMany({
    where: { discordId: { not: null } },
    select: { id: true, discordId: true, username: true, name: true },
  });

  let created = 0;
  let alreadyExisted = 0;
  const errors: { discordId: string; message: string }[] = [];

  for (const member of members) {
    if (!member.discordId) continue;
    try {
      const result = await ensureCommunityCard({
        userId: member.id,
        discordId: member.discordId,
        displayName: member.username ?? member.name ?? "OMA-Mitglied",
      });
      if (result.created) created++;
      else alreadyExisted++;
    } catch (error) {
      errors.push({
        discordId: member.discordId,
        message: error instanceof Error ? error.message : "Unbekannter Fehler",
      });
    }
  }

  return Response.json({ totalMembers: members.length, created, alreadyExisted, errors });
}
