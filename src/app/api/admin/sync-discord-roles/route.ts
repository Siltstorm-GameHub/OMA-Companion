import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { REPUTATION_ROLE_ENV_KEYS } from "@/lib/discord-roles";
import { syncReputationRoleForUser } from "@/lib/community-job-service";
import { levelTitle } from "@/lib/job-badges";

const BATCH_SIZE = 10;
const DELAY_MS   = 800;

/**
 * POST /api/admin/sync-discord-roles?offset=0
 * Gleicht die Ansehens-Rollen (Bronze/Silber/Gold/Platin) aller User mit Discord ab, die
 * gerade Ansehens-Punkte haben (= im Fenster aktiv) — und entfernt dabei alte Job-Rollen.
 * Verarbeitet BATCH_SIZE User ab dem angegebenen Offset.
 * Gibt { done, nextOffset, total, synced, failed, errors } zurück.
 */
export async function POST(req: NextRequest) {
  await requireRole("admin");

  const offset = parseInt(req.nextUrl.searchParams.get("offset") ?? "0", 10);
  const where = { reputationPoints: { gt: 0 }, discordId: { not: null }, deletedAt: null };

  const users = await prisma.user.findMany({
    where,
    select: { id: true, discordId: true, username: true, name: true },
    orderBy: { createdAt: "asc" },
    skip: offset,
    take: BATCH_SIZE,
  });
  const total = await prisma.user.count({ where });

  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const u of users) {
    const result = await syncReputationRoleForUser(u.id);
    if (result.ok) {
      synced++;
    } else {
      failed++;
      errors.push(`${u.username ?? u.name ?? u.discordId}: ${result.error ?? "Discord-Fehler"}`);
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  const nextOffset = offset + users.length;
  return NextResponse.json({ done: nextOffset >= total, nextOffset, total, synced, failed, errors });
}

/**
 * GET /api/admin/sync-discord-roles
 * Prüft, ob die Discord-Konfiguration für die Ansehens-Rollen vollständig ist.
 */
export async function GET() {
  await requireRole("admin");

  const roles = Object.fromEntries(
    REPUTATION_ROLE_ENV_KEYS.map((key, i) => [levelTitle(i + 1), { envKey: key, gesetzt: !!process.env[key] }]),
  );
  return NextResponse.json({
    envCheck: {
      DISCORD_GUILD_ID: !!process.env.DISCORD_GUILD_ID,
      DISCORD_BOT_TOKEN: !!process.env.DISCORD_BOT_TOKEN,
    },
    roles,
  });
}
