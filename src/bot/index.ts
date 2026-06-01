import {
  Client, GatewayIntentBits, Events,
  GuildScheduledEventStatus, VoiceState,
} from "discord.js";
import { syncEvent, updateEventStatus, syncAttendee } from "./sync";
import { trackVoice, trackMessage, handleMemberJoin } from "./activity";

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
  const userId = newState.member?.user.id;
  if (!userId || newState.member?.user.bot) return;

  const joined = !oldState.channel && newState.channel;
  const left   = oldState.channel && !newState.channel;

  if (joined) {
    voiceJoinTimes.set(userId, Date.now());
    console.log(`🎙 ${newState.member?.displayName} betritt Voice`);
  }

  if (left) {
    const joinTime = voiceJoinTimes.get(userId);
    if (joinTime) {
      const minutes = (Date.now() - joinTime) / 1000 / 60;
      voiceJoinTimes.delete(userId);
      await trackVoice(userId, minutes);
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

client.login(process.env.DISCORD_BOT_TOKEN);
export default client;
