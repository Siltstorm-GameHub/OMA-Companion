import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";

export async function POST() {
  await requireRole("admin");

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    return NextResponse.json(
      { error: "DISCORD_GUILD_ID oder DISCORD_BOT_TOKEN fehlt in .env" },
      { status: 500 }
    );
  }

  const { prisma } = await import("@/lib/prisma");

  let after = "0";
  let allMembers: DiscordMember[] = [];

  // Discord paginiert Mitglieder in 1000er-Blöcken
  while (true) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Discord API Fehler: ${res.status}` }, { status: 500 });
    }
    const batch: DiscordMember[] = await res.json();
    if (!batch.length) break;
    allMembers = [...allMembers, ...batch];
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }

  // Bots herausfiltern
  const humans = allMembers.filter((m) => !m.user.bot);

  let updated = 0;
  let skipped = 0;

  for (const member of humans) {
    const discordId = member.user.id;
    const username = member.nick ?? member.user.global_name ?? member.user.username;
    const avatar = member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${member.user.avatar}.png`
      : null;

    // 1. Per discordId suchen (bereits verknüpfte User)
    let existing = await prisma.user.findUnique({ where: { discordId } });

    // 2. Falls nicht gefunden: über Account-Tabelle suchen (OAuth-Login ohne discordId)
    if (!existing) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: { provider: "discord", providerAccountId: discordId },
        },
        include: { user: true },
      });
      if (account?.user) {
        existing = account.user;
        // discordId nachträglich setzen damit zukünftige Syncs direkt treffen
        await prisma.user.update({
          where: { id: existing.id },
          data: { discordId },
        });
      }
    }

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { username, image: avatar ?? existing.image },
      });
      updated++;
    } else {
      skipped++; // Noch kein Account → muss sich selbst einloggen
    }
  }

  return NextResponse.json({ success: true, total: humans.length, updated, skipped });
}

interface DiscordMember {
  nick: string | null;
  user: {
    id: string;
    username: string;
    global_name: string | null;
    avatar: string | null;
    bot?: boolean;
  };
}
