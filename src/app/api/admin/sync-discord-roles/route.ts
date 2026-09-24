import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { COMMUNITY_JOB_ROLE_ENV_KEYS, syncCommunityJobDiscordRole } from "@/lib/discord-roles";

const BATCH_SIZE = 10;
const DELAY_MS   = 800;

/**
 * POST /api/admin/sync-discord-roles?offset=0
 * Gleicht die Job-Rollen aller aktuellen Job-Inhaber (ACTIVE/WARNED) mit Discord ab.
 * Verarbeitet BATCH_SIZE Inhaber ab dem angegebenen Offset.
 * Arbeitslose bekommen keine Rolle; bereits vergebene Job-Rollen ehemaliger Inhaber werden
 * hier nicht entfernt (das passiert beim Ende des Jobs, siehe community-job-service).
 * Gibt { done, nextOffset, total, synced, failed, errors } zurück.
 */
export async function POST(req: NextRequest) {
  await requireRole("admin");

  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const where = { status: { in: ["ACTIVE", "WARNED"] }, user: { discordId: { not: null } } };

  const members = await prisma.communityJobMember.findMany({
    where,
    select: { jobKey: true, user: { select: { discordId: true, username: true, name: true } } },
    orderBy: { assignedAt: "asc" },
    skip: offset,
    take: BATCH_SIZE,
  });
  const total = await prisma.communityJobMember.count({ where });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const m of members) {
    const result = await syncCommunityJobDiscordRole(m.user.discordId, m.jobKey);
    if (result.ok) {
      synced++;
    } else {
      failed++;
      errors.push(`${m.user.username ?? m.user.name ?? m.user.discordId}: ${result.error ?? "Discord-Fehler"}`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const nextOffset = offset + members.length;
  return NextResponse.json({ done: nextOffset >= total, nextOffset, total, synced, failed, errors });
}

/**
 * GET /api/admin/sync-discord-roles
 * Prüft, ob die Discord-Konfiguration für die Job-Rollen vollständig ist.
 */
export async function GET() {
  await requireRole("admin");

  const roles = Object.fromEntries(
    Object.entries(COMMUNITY_JOB_ROLE_ENV_KEYS).map(([job, key]) => [job, { envKey: key, gesetzt: !!process.env[key] }]),
  );
  return NextResponse.json({
    envCheck: {
      DISCORD_GUILD_ID: !!process.env.DISCORD_GUILD_ID,
      DISCORD_BOT_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
    },
    roles,
  });
}
