import {
  Client, GatewayIntentBits, Events,
  GuildScheduledEventStatus, VoiceState, Invite,
  ActivityType, PresenceUpdateStatus
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
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildInvites,
  ],
});

// Voice-Tracking: Zeitpunkt des Betretens merken
const voiceJoinTimes = new Map<string, number>();

// Invite-Tracking Cache
const inviteCache = new Map<string, number>(); // code → uses

// Set mit Event-IDs die bereits eine 24h-Erinnerung bekommen haben
const remindedEventIds = new Set<string>();
let _lastLeaderboardMonth = -1;

// ── SCHEDULER FUNKTIONEN (Nach oben verschoben für TS-Compiler) ──────────────
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

async function checkBirthdays() {
  const now   = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day   = String(now.getDate()).padStart(2, "0");

  const usersWithBirthday = await prisma.user.findMany({
    where: {
      birthday: { not: null },
      OR: [
        { birthdayBoostUntil: null },
        { birthdayBoostUntil: { lt: now } },
      ],
    },
    select: { id: true, username: true, name: true, discordId: true, birthday: true },
  });

  for (const user of usersWithBirthday) {
    if (!user.birthday) continue;
    const bMonth = String(user.birthday.getMonth() + 1).padStart(2, "0");
    const bDay   = String(user.birthday.getDate()).padStart(2, "0");
    if (bMonth !== month || bDay !== day) continue;

    const until = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await prisma.user.update({ where: { id: user.id }, data: { birthdayBoostUntil: until } });

    await awardPoints(user.id, "BIRTHDAY");

    if (user.discordId) await notifyBirthday(user.discordId, user.username ?? user.name ?? "Jemand");
    console.log(`🎂 Geburtstags-Boost + Punkte für ${user.username ?? user.name}`);
  }
}

function scheduleMonthlyLeaderboard() {
  setInterval(async () => {
    const now = new Date();
    const h   = now.getHours();

    if (h === 8) await checkBirthdays();
    if (h === 10) await checkEventReminders();

    if (now.getDate() === 1 && h === 12 && now.getMonth() !== _lastLeaderboardMonth) {
      _lastLeaderboardMonth = now.getMonth();
      await notifyMonthlyLeaderboard();
      console.log("📊 Monatliche Rangliste gepostet");
    }
  }, 60 * 60 * 1000);
}
// ─────────────────────────────────────────────────────────────────────────────

client.once(Events.ClientReady, async (c) => {
  console.log(`✅ Bot online: ${c.user.tag}`);
  
  // Status setzen
  c.user.setPresence({
    activities: [{ 
        name: 'auf deine-homepage.de', 
        type: ActivityType.Watching 
    }],
    status: PresenceUpdateStatus.Online,
  });

  setClient(client);
  scheduleMonthlyLeaderboard(); // Jetzt kennt TypeScript die Funktion!

  try {
    const guild   = await c.guilds.fetch(process.env.DISCORD_GUILD_ID!);
    const invites = await guild.invites.fetch();
    invites.forEach(inv => inviteCache.set(inv.code, inv.uses ?? 0));
    console.log(`📨 ${invites.size} Invites gecacht`);
  } catch (err) {
    console.warn("⚠ Invite-Cache konnte nicht befüllt werden:", err);