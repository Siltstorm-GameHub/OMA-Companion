import {
  Client, GatewayIntentBits, Events,
  GuildScheduledEventStatus, VoiceState,
} from "discord.js";
import { syncEvent, updateEventStatus, syncAttendee } from "./sync";
import { trackVoice, trackMessage, handleMemberJoin } from "./activity";
import { setClient, notifyMonthlyLeaderboard, notifyBirthday } from "./notify";
import { prisma } from "@/lib/prisma";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildScheduledEvents,
    GatewayIntentBits.MessageContent,
  ],
});

// Voice-Tracking: Zeitpunkt des Betretens merken
const voiceJoinTimes = new Map<string, number>();

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot online: ${c.user.tag}`);
  setClient(client);
  scheduleMonthlyLeaderboard();
  checkBirthdays(); // sofort beim Start prüfen

  const guild = await c.guilds.fetch(process.env.DISCORD_GUILD_ID!);

  // Discord-Events synchronisieren
  const scheduledEvents = await guild.scheduledEvents.fetch();
  for (const [, event] of scheduledEvents) await syncEvent(event);
  console.log(`✅ ${scheduledEvents.size} Events synchronisiert`);

  // Voice-Tracking: bereits aktive User erfassen
  // (falls Bot neugestartet wurde während User im Voice waren)
  const channels = await guild.channels.fetch();
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

// Neues Mitglied
client.on(Events.GuildMemberAdd, async (member) => {
  if (member.user.bot) return;
  await handleMemberJoin(member.user.id, member.user.username);
});

// Discord Events
client.on(Events.GuildScheduledEventCreate, async (e) => { await syncEvent(e); });
client.on(Events.GuildScheduledEventUpdate, async (_, e) => {
  await syncEvent(e);
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

// Geburtstags-Boost: täglich prüfen
async function checkBirthdays() {
  const now   = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");

  // User mit Geburtstag heute (gespeichert als 2000-MM-DD)
  const usersWithBirthday = await prisma.user.findMany({
    where: {
      birthday: { not: null },
      birthdayBoostUntil: { lt: now }, // kein aktiver Boost mehr
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

    // Discord-Nachricht
    if (user.discordId) await notifyBirthday(user.discordId, user.username ?? user.name ?? "Jemand");
    console.log(`🎂 Geburtstags-Boost aktiviert für ${user.username ?? user.name}`);
  }
}

// Monatliche Rangliste: jeden 1. des Monats um 12:00 Uhr
let _lastLeaderboardMonth = -1;
function scheduleMonthlyLeaderboard() {
  setInterval(async () => {
    const now = new Date();
    // Täglich um 8 Uhr Geburtstage prüfen
    if (now.getHours() === 8 && now.getMinutes() < 60) await checkBirthdays();

    if (now.getDate() === 1 && now.getHours() === 12 && now.getMonth() !== _lastLeaderboardMonth) {
      _lastLeaderboardMonth = now.getMonth();
      await notifyMonthlyLeaderboard();
      console.log("📊 Monatliche Rangliste gepostet");
    }
  }, 60 * 60 * 1000); // stündlich prüfen
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
