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
  let fixed   = 0;

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

        // seriesStandingsJson: Stub-ID in allen Eventreihen durch echte User-ID ersetzen
        const affectedSeries = await prisma.eventSeries.findMany({
          where: { seriesStandingsJson: { contains: stub.id } },
          select: { id: true, seriesStandingsJson: true },
        });
        for (const series of affectedSeries) {
          if (!series.seriesStandingsJson) continue;
          try {
            const standings = JSON.parse(series.seriesStandingsJson) as {
              raw: Record<string, Record<string, number>>;
              lastUpdated: string;
              processedEventIds: string[];
            };
            if (standings.raw[stub.id]) {
              // Stub-Einträge auf den echten User addieren
              if (!standings.raw[realUser.id]) standings.raw[realUser.id] = {};
              for (const [field, val] of Object.entries(standings.raw[stub.id])) {
                standings.raw[realUser.id][field] = (standings.raw[realUser.id][field] ?? 0) + val;
              }
              delete standings.raw[stub.id];
              await prisma.eventSeries.update({
                where: { id: series.id },
                data: { seriesStandingsJson: JSON.stringify(standings) },
              });
            }
          } catch { /* ungültiges JSON – ignorieren */ }
        }

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

  // ── Phase 2: Korrumpierte Discord-Accounts reparieren ────────────────────
  // Erkennung: discordId ist keine numerische Snowflake (enthält Buchstaben/Bindestriche).
  // Die echte Discord-ID steckt immer in der Avatar-URL:
  //   https://cdn.discordapp.com/avatars/{DISCORD_ID}/{HASH}.png
  const allDiscordUsers = await prisma.user.findMany({
    where: { discordId: { not: null } },
    include: { accounts: { where: { provider: "discord" } } },
  });

  const corruptedUsers = allDiscordUsers.filter(
    u => !/^\d{17,20}$/.test(u.discordId!)
  );

  for (const badUser of corruptedUsers) {
    const avatarMatch = badUser.image?.match(/cdn\.discordapp\.com\/avatars\/(\d+)\//);
    if (!avatarMatch) {
      console.warn(`[SYNC] Korrumpierter User ${badUser.id} ohne Avatar-URL – übersprungen`);
      continue;
    }

    const realDiscordId = avatarMatch[1];
    const stub = await prisma.user.findUnique({
      where:   { discordId: realDiscordId },
      include: { accounts: { where: { provider: "discord" } } },
    });

    try {
      await prisma.$transaction(async (tx) => {
        // Stub-Account (hat echte providerAccountId) löschen
        if (stub) {
          await tx.account.deleteMany({ where: { userId: stub.id, provider: "discord" } });
        }

        // Korrumpierten Account des echten Users reparieren
        const badAcct = badUser.accounts[0];
        if (badAcct) {
          await tx.account.update({
            where: { id: badAcct.id },
            data:  { providerAccountId: realDiscordId },
          });
        }

        // discordId-Unique freigeben, dann korrekt setzen
        if (stub) {
          await tx.user.update({ where: { id: stub.id }, data: { discordId: null } });
        }
        await tx.user.update({ where: { id: badUser.id }, data: { discordId: realDiscordId } });

        // Stub-Daten auf echten User addieren
        if (stub) {
          await tx.user.update({
            where: { id: badUser.id },
            data: {
              points:            { increment: stub.points },
              rankPoints:        { increment: stub.rankPoints },
              voiceMinutesTotal: { increment: stub.voiceMinutesTotal },
              messagesTotal:     { increment: stub.messagesTotal },
            },
          });

          // Alle Relationen umhängen
          await tx.eventRegistration.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.pointTransaction.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.lulEntry.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.lulLegacyEntry.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.shopPurchase.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.dailySpin.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.donation.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.userCollectible.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.lobbyMessage.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          await tx.pushSubscription.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } });
          try { await tx.tournamentParticipant.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } }); } catch { /* unique constraint */ }
          try { await tx.teamMember.updateMany({ where: { userId: stub.id }, data: { userId: badUser.id } }); } catch { /* unique constraint */ }

          await tx.user.delete({ where: { id: stub.id } });
        }
      });

      fixed++;
      console.log(`[SYNC] Korrumpierter Account repariert: ${badUser.id} → discordId=${realDiscordId}`);
    } catch (err) {
      console.error(`[SYNC] Reparatur fehlgeschlagen für ${badUser.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    total:   humans.length,
    created,
    updated,
    merged,
    fixed,
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
