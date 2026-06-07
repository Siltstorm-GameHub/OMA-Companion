import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { prisma } from "@/lib/prisma";

let _client: Client | null = null;

export function setClient(client: Client) {
  _client = client;
}

async function getTextChannel(id: string | undefined): Promise<TextChannel | null> {
  if (!id || !_client) return null;
  try {
    const ch = await _client.channels.fetch(id);
    return ch?.isTextBased() ? (ch as TextChannel) : null;
  } catch { return null; }
}

// ── Event-Ankündigung ────────────────────────────────────────────────────────

export async function notifyNewEvent(event: {
  title: string; game: string | null; startAt: Date;
  maxPlayers: number | null; pointReward: number;
}) {
  const ch = await getTextChannel(process.env.DISCORD_EVENTS_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0x4ade80)
    .setTitle(`📅 Neues Event: ${event.title}`)
    .setDescription("Ein neues Community-Event wurde angekündigt! Meldet euch jetzt an.")
    .addFields(
      { name: "🎮 Spiel",         value: event.game ?? "–",                                                                                                         inline: true },
      { name: "📆 Start",         value: event.startAt.toLocaleString("de-DE", { weekday: "long", day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }), inline: true },
      { name: "👥 Max. Spieler",  value: event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt",                                                                 inline: true },
      { name: "⭐ Punkte",        value: `+${event.pointReward} Pts bei Teilnahme`,                                                                                  inline: true },
    )
    .setFooter({ text: "OMA Companion · Events" })
    .setTimestamp();

  await ch.send({ embeds: [embed] });
}

// ── Event startet ────────────────────────────────────────────────────────────

export async function notifyEventStarted(event: { title: string; game: string | null }) {
  const ch = await getTextChannel(process.env.DISCORD_EVENTS_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🚀 Event läuft jetzt!")
    .setDescription(`**${event.title}** hat soeben begonnen.${event.game ? `\n🎮 ${event.game}` : ""}`)
    .setFooter({ text: "OMA Companion · Events" })
    .setTimestamp();

  const ping = process.env.DISCORD_EVENTS_PING ?? "@here";
  await ch.send({ content: ping, embeds: [embed] });
}

// ── Event beendet ────────────────────────────────────────────────────────────

export async function notifyEventEnded(event: { title: string }, attendeeCount: number) {
  const ch = await getTextChannel(process.env.DISCORD_EVENTS_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0x6b7280)
    .setTitle(`✅ Event beendet: ${event.title}`)
    .addFields({ name: "👥 Teilnehmer", value: String(attendeeCount), inline: true })
    .setFooter({ text: "OMA Companion · Events" })
    .setTimestamp();

  await ch.send({ embeds: [embed] });
}

// ── Turnier gestartet ────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<string, string> = {
  single_elimination: "K.O.-System",
  double_elimination: "Double Elimination",
  round_robin:        "Jeder gegen Jeden",
  liga:               "Liga",
  ffa:                "Free for All",
  coop_stats:         "Kooperativ",
};

export async function notifyTournamentStarted(tournament: {
  format: string;
  event: { title: string; game: string | null };
  participants: { user: { username: string | null; name: string | null; discordId: string | null } }[];
}) {
  const ch = await getTextChannel(process.env.DISCORD_GENERAL_CHANNEL_ID);
  if (!ch) return;

  const mentions = tournament.participants
    .map(p => p.user.discordId ? `<@${p.user.discordId}>` : (p.user.username ?? p.user.name ?? "?"))
    .join(" ");

  const embed = new EmbedBuilder()
    .setColor(0xf43f5e)
    .setTitle(`⚔️ Turnier gestartet: ${tournament.event.title}`)
    .addFields(
      { name: "🎮 Spiel",      value: tournament.event.game ?? "–",                        inline: true },
      { name: "📋 Format",     value: FORMAT_LABELS[tournament.format] ?? tournament.format, inline: true },
      { name: "👥 Teilnehmer", value: String(tournament.participants.length),               inline: true },
    )
    .setFooter({ text: "OMA Companion · Turniere" })
    .setTimestamp();

  await ch.send({ content: mentions || undefined, embeds: [embed] });
}

// ── Level-Up ─────────────────────────────────────────────────────────────────

export async function notifyLevelUp(discordId: string, newLevel: number) {
  const ch = await getTextChannel(process.env.DISCORD_GENERAL_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xa855f7)
    .setTitle("🎉 Level Up!")
    .setDescription(`<@${discordId}> hat **Level ${newLevel}** erreicht! 🏆`)
    .setFooter({ text: "OMA Companion · Fortschritt" })
    .setTimestamp();

  await ch.send({ embeds: [embed] });
}

// ── Quest abgeschlossen (DM) ─────────────────────────────────────────────────

export async function notifyQuestCompleted(discordId: string, questTitle: string, reward: number) {
  if (!_client) return;
  try {
    const user = await _client.users.fetch(discordId);
    const embed = new EmbedBuilder()
      .setColor(0x4ade80)
      .setTitle("✅ Quest abgeschlossen!")
      .setDescription(`Du hast die Quest **„${questTitle}"** erfolgreich abgeschlossen!`)
      .addFields({ name: "⭐ Belohnung", value: `+${reward} Punkte`, inline: true })
      .setFooter({ text: "OMA Companion · Quests" })
      .setTimestamp();
    await user.send({ embeds: [embed] });
  } catch { /* DMs deaktiviert oder User nicht erreichbar */ }
}

// ── Geburtstag ───────────────────────────────────────────────────────────────

export async function notifyBirthday(discordId: string, username: string) {
  const ch = await getTextChannel(process.env.DISCORD_GENERAL_CHANNEL_ID);
  if (!ch) return;

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🎂 Alles Gute zum Geburtstag!")
    .setDescription(`<@${discordId}> hat heute Geburtstag! 🎉\nAls Geschenk gibt es für die nächsten **24 Stunden** doppelte Punkte auf alle Aktivitäten!`)
    .setFooter({ text: "OMA Companion · Geburtstag" })
    .setTimestamp();

  await ch.send({ content: `🎂 <@${discordId}>`, embeds: [embed] });
}

// ── Monats-Rangliste ─────────────────────────────────────────────────────────

export async function notifyMonthlyLeaderboard() {
  const ch = await getTextChannel(process.env.DISCORD_GENERAL_CHANNEL_ID);
  if (!ch) return;

  const now       = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const monthName = lastMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const topUsers = await prisma.user.findMany({
    orderBy: { points: "desc" },
    take: 10,
    select: { username: true, name: true, points: true, discordId: true },
  });

  const medals = ["🥇", "🥈", "🥉"];
  const lines = topUsers.map((u, i) => {
    const name  = u.username ?? u.name ?? "Unbekannt";
    const medal = medals[i] ?? `**${i + 1}.**`;
    const pts   = u.points.toLocaleString("de-DE");
    return `${medal} ${u.discordId ? `<@${u.discordId}>` : name} — ${pts} Pts`;
  });

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`🏆 Monats-Rangliste · ${monthName}`)
    .setDescription(lines.join("\n") || "Keine Daten verfügbar.")
    .setFooter({ text: "OMA Companion · Leaderboard" })
    .setTimestamp();

  await ch.send({ embeds: [embed] });
}
