import {
  Client, GatewayIntentBits, Events,
  GuildScheduledEventStatus, VoiceState, Invite,
  ActivityType, PresenceUpdateStatus // <-- Neu hinzugefügt
} from "discord.js";
import { updateEventStatus, syncAttendee } from "./sync";
import { trackVoice, trackMessage, handleMemberJoin, trackReaction, trackInvite } from "./activity";
import { setClient, notifyMonthlyLeaderboard, notifyBirthday, notifyEventReminder } from "./notify";
import { awardPoints } from "@/lib/points";
import { prisma } from "@/lib/prisma";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions, // für Reaktions-Tracking
    GatewayIntentBits.GuildInvites,           // für Invite-Tracking
  ],
});

// Voice-Tracking: Zeitpunkt des Betretens merken
const voiceJoinTimes = new Map<string, number>();

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot online: ${c.user.tag}`);
  
  // ── STATUS PERSONALISIERUNG ──────────────────────────────────────────────
  c.user.setPresence({
    activities: [{ 
        name: 'auf deine-homepage.de', // <--- Hier deine echte Domain eintragen!
        type: ActivityType.Watching   // Zeigt "Schaut auf ..."
    }],
    status: PresenceUpdateStatus.Online, // Grüner Online-Punkt
  });
  // ─────────────────────────────────────────────────────────────────────────

  setClient(client);
  scheduleMonthlyLeaderboard();
  // Bug-Fix: Geburtstage nicht beim Start prüfen (würde Nachrichten zu beliebigen Uhrzeiten senden)
  // Stattdessen nur täglich um 8 Uhr im Scheduler

  const guild = await c.guilds.fetch(process.env.DISCORD_GUILD_ID!);

  // Invite-Cache beim Start befüllen
  try {
    const guild   = await c.guilds.fetch(process.env.DISCORD_GUILD_ID!);
    const invites = await guild.invites.fetch();
    invites.forEach(inv => inviteCache.set(inv.code, inv.uses ?? 0));
    console.log(`📨 ${invites.size} Invites gecacht`);
  } catch (err) {
    console.warn("⚠ Invite-Cache konnte nicht befüllt werden:", err);
  }

  // Voice-Tracking: bereits aktive User erfassen
  // (falls Bot neugestartet wurde während User im Voice waren)
  const guild2   = await c.guilds.fetch(process.env.DISCORD_GUILD_ID!);
  const channels = await guild2.channels.fetch();
  let voiceUsersFound = 0;
  for (const [, channel] of channels) {
    if (channel?.isVoiceBased() && "members" in channel) {
      for (const [memberId, member] of channel.members) {
        if (!member.user.bot) {
          voiceJoinTimes.set(memberId, Date.now());
          voiceUsersFound++;
        }
      }
    }
  }
  if (voiceUsersFound > 0) {
    console.log(`🎙 ${voiceUsersFound} User bereits im Voice – Tracking gestartet`);
  }
});

// Voice-Aktivität
client.on(Events.VoiceStateUpdate, async (oldState: VoiceState, newState: VoiceState) => {
  // 1. Absicherung: Existiert das Member überhaupt und ist es kein Bot?
  if (!newState.member || newState.member.user.bot) return;
  
  const userId = newState.member.user.id;

  // 2. Prüfen, ob wirklich der Kanal gewechselt, betreten oder verlassen wurde
  // (Verhindert Fehler, wenn jemand nur sein Mikrofon stummschaltet)
  const joined = !oldState.channelId && newState.channelId;
  const left   = oldState.channelId && !newState.channelId;
  const moved  = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

  // Fall A: User betritt einen Sprachkanal
  if (joined) {
    voiceJoinTimes.set(userId, Date.now());
    console.log(`🎙 ${newState.member.displayName} betritt Voice`);
  }

  // Fall B: User verlässt den Sprachkanal komplett oder wechselt ihn
  if (left || moved) {
    const joinTime = voiceJoinTimes.get(userId);
    if (joinTime) {
      const minutes = (Date.now() - joinTime) / 1000 / 60;
      voiceJoinTimes.delete(userId);
      
      // Daten an Supabase übertragen
      await trackVoice(userId, minutes);
      console.log(`🤫 ${newState.member.displayName} hat Voice verlassen (${minutes.toFixed(2)} Min.)`);
    }

    // Wenn er den Kanal nur GEWECHSELT hat, starten wir die Zeitmessung für den neuen Kanal direkt neu
    if (moved) {
      voiceJoinTimes.set(userId, Date.now());
    }
  }
});

// Nachrichten-Aktivität
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
  await trackMessage(message.author.id);
});

// Reaktions-Tracking: Punkte für den Nachrichten-Autor
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  if (user.bot) return;
  // Partielle Reaktionen (aus dem Cache gefallen) vollständig laden
  if (reaction.partial) {
    try { await reaction.fetch(); } catch { return; }
  }
  if (!reaction.message.guild || reaction.message.author?.bot) return;
  const authorId = reaction.message.author?.id;
  if (!authorId || authorId === user.id) return; // keine Selbst-Reaktionen werten
  await trackReaction(authorId);
});

// Invite-Tracking: Invite-Nutzungen überwachen um Einladenden zu ermitteln
const inviteCache = new Map<string, number>(); // code → uses

client.on(Events.GuildCreate, async (guild) => {
  const invites = await guild.invites.fetch().catch(() => null);
  invites?.forEach(inv => inviteCache.set(inv.code, inv.uses ?? 0));
});

client.on(Events.InviteCreate, (invite: Invite) => {
  inviteCache.set(invite.code, invite.uses ?? 0);
});

client.on(Events.InviteDelete, (invite: Invite) => {
  inviteCache.delete(invite.code);
});

client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;

  // Welcher Invite wurde genutzt? (Nutzungszahl vergleichen)
  const invitesBefore = new Map(inviteCache);
  const invitesNow    = await member.guild.invites.fetch().catch(() => null);
  if (invitesNow) {
    invitesNow.forEach(inv => inviteCache.set(inv.code, inv.uses ?? 0));
    for (const [code, usedBefore] of invitesBefore) {
      const inviteNow = invitesNow.get(code);
      if (inviteNow && (inviteNow.uses ?? 0) > usedBefore && inviteNow.inviter) {
        await trackInvite(inviteNow.inviter.id, member.user.username);
        break;
      }
    }
  }

  // Willkommens-Punkte
  await handleMemberJoin(member.user.id, member.user.username);
});

// Discord Events → nur Status-Updates für Events, die aus der WebApp stammen
// Kein Import von Discord-Events in die WebApp (Richtung: WebApp → Discord, nicht umgekehrt)
client.on(Events.GuildScheduledEventUpdate, async (_, e) => {
  if (e.status === GuildScheduledEventStatus.Active)    await updateEventStatus(e.id, "active");
  if (e.status === GuildScheduledEventStatus.Completed) await updateEventStatus(e.id, "finished");
});
client.on(Events.GuildScheduledEventDelete, async (e) => { await updateEventStatus(e.id, "finished"); });

// Discord-Teilnahme → WebApp-Registrierung
client.on(Events.GuildScheduledEventUserAdd, async (event, user) => {
  await syncAttendee(event.id, user.id, "add");
});
client.on(Events.GuildScheduledEventUserRemove, async (event, user) => {
  await syncAttendee(event.id, user.id, "remove");
});

// Geburtstags-Boost: täglich um 8 Uhr prüfen
async function checkBirthdays() {
  const now   = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");

  // Bug-Fix #1: null-Werte explizit einschließen —
  // { lt: now } matcht keine null-Felder, deshalb OR-Bedingung
  const usersWithBirthday = await prisma.user.findMany({
    where: {
      birthday: { not: null },
      OR: [
        { birthdayBoostUntil: null },          // noch nie einen Boost gehabt
        { birthdayBoostUntil: { lt: now } },   // letzter Boost abgelaufen
      ],
    },
    select: { id: true, username: true, name: true, discordId: true, birthday: true },
  });

  for (const user of usersWithBirthday) {
    if (!user.birthday) continue;
    const bMonth = String(user.birthday.getMonth() + 1).padStart(2, "0");
    const bDay   = String(user.birthday.getDate()).padStart(2, "0");
    if (bMonth !== month || bDay !== day) continue;

    // 24h Boost aktivieren
    const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { birthdayBoostUntil: until } });

    // Bug-Fix #2: Geburtstags-Punkte vergeben (waren vorher nie ausgelöst)
    await awardPoints(user.id, "BIRTHDAY");

    // Discord-Nachricht
    if (user.discordId) await notifyBirthday(user.discordId, user.username ?? user.name ?? "Jemand");
    console.log(`🎂 Geburtstags-Boost + Punkte für ${user.username ?? user.name}`);
  }
}

// ── Scheduler: läuft stündlich ───────────────────────────────────────────────
// Prüft: Geburtstage (tägl. 8 Uhr), Event-Erinnerungen (tägl. 10 Uhr), Monats-Rangliste (1. um 12 Uhr)

let _lastLeaderboardMonth = -1;
// Set mit Event-IDs die bereits eine 24h-Erinnerung bekommen haben (in-memory, reicht für Bot-Laufzeit)
const remindedEventIds = new Set<string>();

function scheduleMonthlyLeaderboard() {
  setInterval(async () => {
    const now = new Date();
    const h   = now.getHours();

    // 08:00 – Geburtstage prüfen
    if (h === 8) await checkBirthdays();

    // 10:00 – Event-Erinnerungen für Events die in 20–28h starten
    if (h === 10) await checkEventReminders();

    // 1. des Monats 12:00 – Monatliche Rangliste
    if (now.getDate() === 1 && h === 12 && now.getMonth() !== _lastLeaderboardMonth) {
      _lastLeaderboardMonth = now.getMonth();
      await notifyMonthlyLeaderboard();
      console.log("📊 Monatliche Rangliste gepostet");
    }
  }, 60 * 60 * 1000); // stündlich prüfen
}

async function checkEventReminders() {
  const now      = new Date();
  const in20h    = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const in28h    = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  const events = await prisma.event.findMany({
    where: {
      status:  { in: ["open", "upcoming"] },
      startAt: { gte: in20h, lte: in28h },
    },
    include: { _count: { select: { registrations: true } } },
  });

  for (const event of events) {
    if (remindedEventIds.has(event.id)) continue;
    remindedEventIds.add(event.id);
    await notifyEventReminder(event);
    console.log(`📅 Event-Erinnerung gesendet: ${event.title}`);
  }
}

client.login(process.env.DISCORD_BOT_TOKEN);
export default client;

// Einfacher Mini-Webserver, damit Render nicht nach offenen Ports meckert
import http from "http";
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running smoothly!");
}).listen(PORT, () => {
  console.log(`🌍 Mini-Webserver läuft auf Port ${PORT} für Render Port-Binding`);
});