import {
  Client, GatewayIntentBits, Events,
  GuildScheduledEventStatus, VoiceState, Invite,
  ActivityType, PresenceUpdateStatus // <-- Neu hinzugefügt
} from "discord.js";
import { updateEventStatus, syncAttendee } from "./sync";
import { trackVoice, checkpointVoice, trackMessage, handleMemberJoin, trackReaction, trackInvite } from "./activity";
import { setClient } from "./notify";
import { processPendingPolls } from "./polls";
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

// Voice-Tracking: Zeitpunkt des Betretens merken (Discord-ID → Timestamp)
const voiceJoinTimes = new Map<string, number>();
// Bereits per Checkpoint gespeicherte Minuten pro User (Discord-ID → Minuten)
const voiceCheckpointed = new Map<string, number>();

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot online: ${c.user.tag}`);
  
  // ── STATUS PERSONALISIERUNG ──────────────────────────────────────────────
  c.user.setPresence({
    activities: [{ 
        name: 'https://oma-app.de/', // <--- Hier deine echte Domain eintragen!
        type: ActivityType.Watching   // Zeigt "Schaut auf ..."
    }],
    status: PresenceUpdateStatus.Online, // Grüner Online-Punkt
  });
  // ─────────────────────────────────────────────────────────────────────────

  setClient(client);
  schedulePollChecker(client);
  // Geburtstage, Event-Erinnerungen und Monats-Rangliste laufen jetzt
  // zuverlässig als Vercel Cron Jobs — nicht mehr im Bot nötig.
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

  // Periodischer Checkpoint: alle 5 Minuten aktive Sessions speichern
  // → Quest-Fortschritt + voiceMinutesTotal werden laufend aktualisiert
  setInterval(async () => {
    const now = Date.now();
    for (const [discordId, joinTime] of voiceJoinTimes) {
      const totalMinutes    = (now - joinTime) / 1000 / 60;
      const alreadySaved    = voiceCheckpointed.get(discordId) ?? 0;
      const deltaMinutes    = totalMinutes - alreadySaved;
      if (deltaMinutes >= 1) {
        voiceCheckpointed.set(discordId, totalMinutes);
        await checkpointVoice(discordId, deltaMinutes).catch(err =>
          console.error("⚠ checkpointVoice Fehler:", err),
        );
      }
    }
  }, 5 * 60 * 1000);
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
      const totalMinutes      = (Date.now() - joinTime) / 1000 / 60;
      const checkpointedMins  = voiceCheckpointed.get(userId) ?? 0;
      voiceJoinTimes.delete(userId);
      voiceCheckpointed.delete(userId);

      await trackVoice(userId, totalMinutes, checkpointedMins);
      console.log(`🤫 ${newState.member.displayName} hat Voice verlassen (${totalMinutes.toFixed(2)} Min. gesamt, ${checkpointedMins.toFixed(0)} bereits gespeichert)`);
    }

    if (moved) {
      voiceJoinTimes.set(userId, Date.now());
      voiceCheckpointed.delete(userId); // neuer Kanal = neuer Checkpoint-Zähler
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

// Geburtstage, Event-Erinnerungen und Monats-Rangliste wurden nach
// Vercel Cron Jobs ausgelagert (src/app/api/cron/*).
// Der Bot behandelt nur noch Echtzeit-WebSocket-Events.

// ── Poll-Checker: läuft jede Minute ─────────────────────────────────────────
function schedulePollChecker(client: Client) {
  setInterval(() => processPendingPolls(client), 60 * 1000);
}


// ── Fehler-Handling: verhindert Crash bei unbehandelten Promises ────────────
process.on("unhandledRejection", (err) => {
  console.error("⚠ Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught exception:", err);
  // Kurz warten, dann sauber neu starten
  setTimeout(() => process.exit(1), 500);
});

// ── Discord Disconnect → automatisch reconnecten ─────────────────────────────
client.on(Events.ShardDisconnect, (event, shardId) => {
  console.warn(`🔌 Shard ${shardId} getrennt (code ${event.code}). Reconnect läuft…`);
});
client.on(Events.ShardReconnecting, (shardId) => {
  console.log(`🔄 Shard ${shardId} verbindet sich erneut…`);
});
client.on(Events.ShardResume, (shardId, replayed) => {
  console.log(`✅ Shard ${shardId} wieder online (${replayed} Events nachgeholt)`);
});
client.on(Events.Error, (err) => {
  console.error("❌ Discord Client Fehler:", err);
});

// ── Login mit automatischem Retry ────────────────────────────────────────────
async function loginWithRetry(delay = 5000, attempt = 1) {
  try {
    await client.login(process.env.DISCORD_BOT_TOKEN);
  } catch (err) {
    const wait = Math.min(delay * attempt, 60_000); // max 60s
    console.error(`❌ Login fehlgeschlagen (Versuch ${attempt}), retry in ${wait / 1000}s…`, err);
    setTimeout(() => loginWithRetry(delay, attempt + 1), wait);
  }
}

loginWithRetry();
export default client;

// ── Health-Check Webserver ────────────────────────────────────────────────────
// Dient als HTTP-Endpunkt für Railway / UptimeRobot / eigene Pings
import http from "http";
const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  const status = client.isReady() ? 200 : 503;
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status:  client.isReady() ? "online" : "connecting",
    uptime:  Math.floor(process.uptime()),
    ping:    client.ws.ping,
    guilds:  client.guilds.cache.size,
    ts:      new Date().toISOString(),
  }));
});

server.listen(PORT, () => {
  console.log(`🌍 Health-Check Server läuft auf Port ${PORT}`);
});

// ── Self-Ping: alle 4 Minuten den eigenen Health-Endpoint pingen ──────────────
// Verhindert Sleep auf Plattformen die den Container bei Inaktivität einschläfern.
// Zusätzlicher Schutz neben externem UptimeRobot.
const SELF_URL = process.env.SELF_HEALTH_URL; // z.B. https://oma-bot.railway.app/
if (SELF_URL) {
  setInterval(async () => {
    try {
      const res = await fetch(SELF_URL);
      console.log(`💓 Self-ping: ${res.status}`);
    } catch (err) {
      console.warn("⚠ Self-ping fehlgeschlagen:", err);
    }
  }, 4 * 60 * 1000); // alle 4 Minuten
  console.log(`💓 Self-ping aktiviert → ${SELF_URL}`);
}