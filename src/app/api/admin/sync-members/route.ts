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
  let merged  = 0;

  for (const member of humans) {
    const discordId = member.user.id;
    const username  = member.nick ?? member.user.global_name ?? member.user.username;
    const avatar    = member.user.avatar
      ? `https://cdn.discordapp.com/avatars/${discordId}/${member.user.avatar}.png`
      : null;

    // 1. Per discordId suchen (bereits verknüpfte User)
    let existing = await prisma.user.findUnique({ where: { discordId } });

    // 2. OAuth-Account-Eintrag prüfen (kann auf anderen User zeigen als der discordId-Stub)
    const oauthAccount = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: { provider: "discord", providerAccountId: discordId },
      },
      include: { user: true },
    });

    if (oauthAccount?.user && oauthAccount.user.id !== existing?.id) {
      // NextAuth hat einen echten OAuth-User angelegt → Stub und OAuth-User zusammenführen.
      const stub     = existing;   // kann null sein wenn noch kein Sync lief
      const realUser = oauthAccount.user;

      if (stub) {
        // Scalar-Werte vom Stub auf den echten User addieren
        await prisma.user.update({
          where: { id: realUser.id },
          data: {
            points:             { increment: stub.points },
            rankPoints:         { increment: stub.rankPoints },
            voiceMinutesTotal:  { increment: stub.voiceMinutesTotal },
            messagesTotal:      { increment: stub.messagesTotal },
          },
        });

        // Alle Relationen vom Stub auf den echten User umhängen
        // (updateMany, da pro Tabelle mehrere Zeilen existieren können)
        await prisma.eventRegistration.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.pointTransaction.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.matchEntry.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.userQuestProgress.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.shopPurchase.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.dailySpin.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.donation.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.userCollectible.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.lobbyMessage.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.pushSubscription.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.lulEntry.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        await prisma.lulLegacyEntry.updateMany({
          where: { userId: stub.id }, data: { userId: realUser.id },
        });
        // TournamentParticipant hat ggf. unique constraint (eventId+userId) – best effort
        try {
          await prisma.tournamentParticipant.updateMany({
            where: { userId: stub.id }, data: { userId: realUser.id },
          });
        } catch { /* Konflikt wenn realUser bereits Teilnehmer – Stub-Eintrag bleibt */ }
        try {
          await prisma.teamMember.updateMany({
            where: { userId: stub.id }, data: { userId: realUser.id },
          });
        } catch { /* Konflikt wenn realUser bereits Teammitglied */ }

        // Stub-Account-Eintrag (ohne OAuth-Tokens) löschen, dann Stub-User löschen
        await prisma.account.deleteMany({
          where: { userId: stub.id, provider: "discord" },
        });
        try {
          await prisma.user.delete({ where: { id: stub.id } });
        } catch {
          // Falls noch andere Referenzen existieren: discordId entfernen
          await prisma.user.update({ where: { id: stub.id }, data: { discordId: null } });
        }

        merged++;
      }

      existing = realUser;
      await prisma.user.update({ where: { id: realUser.id }, data: { discordId } });

    } else if (!existing && oauthAccount?.user) {
      // Kein Stub, aber OAuth-User ohne discordId gefunden
      existing = oauthAccount.user;
      await prisma.user.update({ where: { id: existing.id }, data: { discordId } });
    }

    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: {
          username,
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
    merged,
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
