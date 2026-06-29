import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { assignCurrentRole } from "@/lib/discord-roles";

/**
 * POST /api/admin/sync-discord-roles
 * Weist allen Usern mit verknüpftem Discord-Account ihre aktuelle Rang-Rolle zu.
 * Einmalig nach der Einführung des neuen Rangsystems aufrufen.
 */
export async function POST() {
  await requireRole("admin");

  const users = await prisma.user.findMany({
    where:  { discordId: { not: null } },
    select: { id: true, discordId: true, rankPoints: true },
  });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    if (!user.discordId) continue;
    try {
      await assignCurrentRole(user.discordId, user.rankPoints);
      // Rate-Limit: Discord erlaubt ~5 Rollen-Requests/Sekunde pro Bot
      await new Promise(r => setTimeout(r, 250));
      synced++;
    } catch (e) {
      failed++;
      errors.push(`${user.discordId}: ${String(e)}`);
    }
  }

  return NextResponse.json({ ok: true, total: users.length, synced, failed, errors });
}
