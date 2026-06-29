import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { assignCurrentRole } from "@/lib/discord-roles";

/**
 * POST /api/admin/sync-discord-roles
 * Weist allen Usern mit verknüpftem Discord-Account ihre aktuelle Rang-Rolle zu.
 */
export async function POST() {
  await requireRole("admin");

  const users = await prisma.user.findMany({
    where:  { discordId: { not: null } },
    select: { id: true, discordId: true, rankPoints: true, username: true, name: true },
  });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    if (!user.discordId) continue;
    const result = await assignCurrentRole(user.discordId, user.rankPoints);
    if (result.ok) {
      synced++;
    } else {
      failed++;
      const name = user.username ?? user.name ?? user.discordId;
      errors.push(`${name}: ${result.error ?? `Discord HTTP ${result.discordStatus} – ${JSON.stringify(result.discordBody)}`}`);
    }
    // Rate-Limit: Discord erlaubt ~5 Rollen-Requests/Sekunde pro Bot
    await new Promise(r => setTimeout(r, 250));
  }

  return NextResponse.json({ ok: true, total: users.length, synced, failed, errors });
}

/**
 * GET /api/admin/sync-discord-roles?discordId=XXX
 * Testet einen einzelnen User und gibt die rohe Discord-Antwort zurück.
 */
export async function GET(req: Request) {
  await requireRole("admin");

  const { searchParams } = new URL(req.url);
  const discordId = searchParams.get("discordId");
  if (!discordId) return NextResponse.json({ error: "?discordId= fehlt" }, { status: 400 });

  const user = await prisma.user.findFirst({
    where:  { discordId },
    select: { discordId: true, rankPoints: true, username: true },
  });
  if (!user) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  const result = await assignCurrentRole(discordId, user.rankPoints);

  return NextResponse.json({
    user:        { discordId, rankPoints: user.rankPoints, username: user.username },
    envCheck: {
      DISCORD_GUILD_ID:              !!process.env.DISCORD_GUILD_ID,
      DISCORD_BOT_TOKEN:             !!process.env.DISCORD_BOT_TOKEN,
      DISCORD_ROLE_ZIVI_ANWAERTER_1: process.env.DISCORD_ROLE_ZIVI_ANWAERTER_1 ?? "❌ nicht gesetzt",
    },
    discordResult: result,
  });
}
