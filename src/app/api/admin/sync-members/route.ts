import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";

export async function POST() {
  await requireRole("admin");

  const guildId  = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    return NextResponse.json(
      { error: "DISCORD_GUILD_ID oder DISCORD_BOT_TOKEN fehlt in .env" },
      { status: 500 }
    );
  }

  const { prisma } = await import("@/lib/prisma");

  // ── Alle Guild-Mitglieder von Discord laden (paginiert à 1000) ────────
  let after = "0";
  let allMembers: DiscordMember[] = [];

  while (true) {
    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members?limit=1000&after=${after}`,
      { headers: { Authorization: `Bot ${botToken}` } }
    );

    if (!res.ok) {
      const body = await res.text();
      const hint = res.status === 403
        ? " — Stelle sicher dass der Bot den 'Server Members Intent' im Discord Developer Portal aktiviert hat (Privileged Gateway Intents)"
        : res.status === 401
        ? " — DISCORD_BOT_TOKEN ist ungültig"
        : "";
      return NextResponse.json(
        { error: `Discord API Fehler ${res.status}${hint}: ${body}` },
        { status: 500 }
      );
    }

    const batch: DiscordMember[] = await res.json();
    if (!batch.length) break;
    allMembers = [...allMembers, ...batch];
    after = batch[batch.length - 1].user.id;
    if (batch.length < 1000) break;
  }

  // Bots herausfiltern
  const humans = allMembers.filter((m) => !m.user.bot);

  let created = 0;
  let updated = 0;

  for (const member of humans) {
    const discordId = member.user.id;
    const username  = member.nick ?? member.user.global_name ?? member.user.username;
    const avatar    = member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${member.user.avatar}.png`
      : null;

    // 1. Per discordId suchen (bereits verknüpfte User)
    let existing = await prisma.user.findUnique({ where: { discordId } });

    // 2. Falls nicht gefunden: über Account-Tabelle suchen (OAuth-Login ohne discordId im User)
    if (!existing) {
      const account = await prisma.account.findUnique({
        where: {
          provider_providerAccountId: { provider: "discord", providerAccountId: discordId },
        },
        include: { user: true },
      });
      if (account?.user) {
        existing = account.user;
        // discordId nachträglich setzen damit zukünftige Syncs direkt greifen
        await prisma.user.update({ where: { id: existing.id }, data: { discordId } });
      }
    }

    if (existing) {
      // Vorhandenen User aktualisieren (Name + Avatar)
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          username,
          // Avatar nur überschreiben wenn kein benutzerdefiniertes Bild vorhanden
          ...(avatar && { image: avatar }),
        },
      });
      updated++;
    } else {
      // Neuen Stub-User anlegen
      const newUser = await prisma.user.create({
        data: {
          discordId,
          username,
          name: username,
          image: avatar,
        },
      });

      // Account-Eintrag nur anlegen wenn noch keiner existiert
      // (verhindert, dass ein echtes OAuth-Login-Account mit Tokens überschrieben wird)
      const existingAccount = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider: "discord", providerAccountId: discordId } },
      });
      if (!existingAccount) {
        await prisma.account.create({
          data: {
            userId:            newUser.id,
            type:              "oauth",
            provider:          "discord",
            providerAccountId: discordId,
          },
        });
      }
      created++;
    }
  }

  return NextResponse.json({
    success: true,
    total:   humans.length,
    created,
    updated,
  });
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
