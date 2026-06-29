import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { assignCurrentRole } from "@/lib/discord-roles";

const BATCH_SIZE = 15;
const DELAY_MS   = 600;

/**
 * POST /api/admin/sync-discord-roles?offset=0
 * Verarbeitet BATCH_SIZE User ab dem angegebenen Offset.
 * Gibt { done, nextOffset, synced, failed, errors } zurück.
 */
export async function POST(req: NextRequest) {
  await requireRole("admin");

  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);

  const users = await prisma.user.findMany({
    where:   { discordId: { not: null } },
    select:  { id: true, discordId: true, rankPoints: true, username: true, name: true },
    orderBy: { createdAt: "asc" },
    skip:    offset,
    take:    BATCH_SIZE,
  });

  const total = await prisma.user.count({ where: { discordId: { not: null } } });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of users) {
    if (!user.discordId) continue;

    const result = await assignCurrentRole(user.discordId, user.rankPoints);

    if (result.ok) {
      synced++;
    } else if (result.discordStatus === 429) {
      // Rate-Limited: warten und einmal wiederholen
      const retryAfter = (result.discordBody as { retry_after?: number } | null)?.retry_after ?? 5;
      await new Promise(r => setTimeout(r, (retryAfter + 0.5) * 1000));
      const retry = await assignCurrentRole(user.discordId, user.rankPoints);
      if (retry.ok) {
        synced++;
      } else {
        failed++;
        errors.push(`${user.username ?? user.name}: HTTP ${retry.discordStatus}`);
      }
    } else {
      failed++;
      const name = user.username ?? user.name ?? user.discordId;
      errors.push(`${name}: ${result.error ?? `HTTP ${result.discordStatus} – ${JSON.stringify(result.discordBody)}`}`);
    }

    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const nextOffset = offset + users.length;
  const done       = nextOffset >= total;

  return NextResponse.json({ done, nextOffset, total, synced, failed, errors });
}

/**
 * GET /api/admin/sync-discord-roles?discordId=XXX
 * Testet einen einzelnen User und gibt die rohe Discord-Antwort zurück.
 */
export async function GET(req: NextRequest) {
  await requireRole("admin");

  const discordId = req.nextUrl.searchParams.get("discordId");
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
