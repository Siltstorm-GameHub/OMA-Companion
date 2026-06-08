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
        name: 'https://oma-companion.vercel.app/', // <--- Hier deine echte Domain eintragen!
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
          voice