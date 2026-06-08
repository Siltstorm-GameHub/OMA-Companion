import { Client, EmbedBuilder, TextChannel } from "discord.js";
import { prisma } from "@/lib/prisma";
import { isBotMessageEnabled, getBotMessageText, fillPlaceholders } from "@/lib/bot-config";

// ── Rang-Schwellen ───────────────────────────────────────────────────────────
export const RANK_THRESHOLDS = [
  { min:     0, label: "Neuling",     emoji: "🔰", color: 0x6b7280 },
  { min:   500, label: "Kämpfer",     emoji: "⚔️", color: 0x4ade80 },
  { min:  3000, label: "Veteran",     emoji: "🛡️", color: 0x60a5fa },
  { min: 10000, label: "Elite",       emoji: "💎", color: 0xa855f7 },
  { min: 25000, label: "Legende",     emoji: "🌟", color: 0xf59e0b },
  { min: 60000, label: "Grandmaster", emoji: "👑", color: 0xef4444 },
] as const;

export function getRank(points: number) {
  return [...RANK_THRESHOLDS].reverse().find(r => points >= r.min) ?? RANK_THRESHOLDS[0];
}

// Datum-Formatter
function fmtDate(d: Date) {
  return d.toLocaleString("de-DE", {
    weekday: "long", day: "2-digit", month: "long",
    hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin",
  });
}

let _client: Client | null = null;

export function setClient(client: Client) {
  _client = client;
}

/** Kanal-ID auflösen: event-spezifisch → globaler News-Kanal */
function newsChannel(eventChannelId?: string | null): string | undefined {
  return eventChannelId ?? process.env.DISCORD_NEWS_CHANNEL_ID;
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
  maxPlayers: number | null; pointReward: number; discordChannelId?: string | null;
}) {
  if (!await isBotMessageEnabled("event_new")) return;
  const ch = await getTextChannel(newsChannel(event.discordChannelId));
  if (!ch) return;

  const rawText = await getBotMessageText("event_new");
  const text = fillPlaceholders(rawText, {
    "{eventName}":  event.title,
    "{game}":       event.game ?? "–",
    "{date}":       fmtDate(event.startAt),
    "{maxPlayers}": event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt",
    "{points}":     String(event.pointReward),
  });

  const embed = new EmbedBuilder()
    .setColor(0x4ade80)
    .setTitle(`📅 Neues Event: ${event.title}`)
    .setDescription(text)
    .addFields(
      { name: "🎮 Spiel",        value: event.game ?? "–",                                                                                         inline: true },
      { name: "📆 Start",        value: fmtDate(event.startAt),                                                                                    inline: true },
      { name: "👥 Max. Spieler", value: event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt",                                                inline: true },
      { name: "⭐ Punkte",       value: `+${event.pointReward} Pts bei Teilnahme`,                                                                 inline: true },
    )
    .setFooter({ text: "OMA Companion · Events" })
    .setTimestamp();

  await ch.send({ embeds: [embed] });
}

// ── Event startet ────────────────────────────────────────────────────────────

export async function notifyEventStarted(event: {
  title: string; game: string | null; discordChannelId?: string | null;
}) {
  if (!await isBotMessageEnabled("event_started")) return;
  const ch = await getTextChannel(newsChannel(event.discordChannelId));
  if (!ch) return;

  const rawText = await getBotMessageText("event_started");
  const text = fillPlaceholders(rawText, {
    "{eventName}": event.title,
    "{game}":      event.game ?? "–",
  });

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🚀 Event läuft jetzt!")
    .setDescription(`**${event.title}**${event.game ? ` · 🎮 ${event.game}` : ""}\n${text}`)
    .setFooter({ text: "OMA Companion · Events" })
    .setTimestamp();

  const ping = process.env.DISCORD_EVENTS_PING ?? "@here";
  await ch.send({ content: ping, embeds: [embed] });
}

// ── Event beendet ────────────────────────────────────────────────────────────

export async function notifyEventEnded(
  event: { title: string; discordChannelId?: string | null },
  attendeeCount: number,
) {
  if (!await isBotMessageEnabled("event_ended")) return;
  const ch = await getTextChannel(newsChannel(event.discordChannelId));
  if (!ch) return;

  const rawText = await getBotMessageText("event_ended");
  const text = fillPlaceholders(rawText, {
    "{eventName}":    event.title,
    "{attendeeCount}": String(attendeeCount),
  });

  const embed = new EmbedBuilder()
    .setColor(0x6b7280)
    .setTitle(`✅ Event beendet: ${event.title}`)
    .setDescription(text)
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
  const ch = await getTextChannel(newsChannel());
  if (!ch) return;

  const mentions = tournament.participants
    .map(p => p.user.discordId ? `<@${p.user.discordId}>` : (p.user.username ?? p.user.name ?? "?"))
    .join(" ");

  const embed = new EmbedBuilder()
    .setColor(0xf43f5e)
    .setTitle(`⚔️ Turnier gestartet: ${tournament.event.title}`)
    .addFields(
      { name: "🎮 Spiel",      value: tournament.event.game ?? "–",                         inline: true },
      { name: "📋 Format",     value: FORMAT_LABELS[tournament.format] ?? tournament.format, inline: true },
      { name: "👥 Teilnehmer", value: String(tournament.participants.length),                inline: true },
    )
    .setFooter({ text: "OMA Companion · Turniere" })
    .setTimestamp();

  await ch.send({ content: mentions || undefined, embeds: [embed] });
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
  if (!await isBotMessageEnabled("birthday")) return;
  const ch = await getTextChannel(newsChannel());
  if (!ch) return;

  const rawText = await getBotMessageText("birthday");
  const text = fillPlaceholders(rawText, {
    "{username}": `<@${discordId}>`,
  });

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle("🎂 Alles Gute zum Geburtstag!")
    .setDescription(text)
    .setFooter({ text: "OMA Companion · Geburtstag" })
    .setTimestamp();

  await ch.send({ content: `🎂 <@${discordId}>`, embeds: [embed] });
}

// ── Event-Erinnerung (24h vorher) ────────────────────────────────────────────

export async function notifyEventReminder(event: {
  id: string; title: string; game: string | null; startAt: Date;
  maxPlayers: number | null; pointReward: number; discordChannelId?: string | null;
  _count: { registrations: number };
}) {
  if (!await isBotMessageEnabled("event_reminder")) return;
  const ch = await getTextChannel(newsChannel(event.discordChannelId));
  if (!ch) return;

  const registrationsStr = event.maxPlayers
    ? `${event._count.registrations} / ${event.maxPlayers}`
    : String(event._count.registrations);

  const rawText = await getBotMessageText("event_reminder");
  const text = fillPlaceholders(rawText, {
    "{eventName}":    event.title,
    "{game}":         event.game ?? "–",
    "{date}":         fmtDate(event.startAt),
    "{registrations}": registrationsStr,
    "{maxPlayers}":   event.maxPlayers ? String(event.maxPlayers) : "Unbegrenzt",
    "{points}":       String(event.pointReward),
  });

  const ping = process.env.DISCORD_EVENTS_PING ?? "@here";

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`⏰ Morgen: ${event.title}`)
    .setDescription(text)
    .addFields(
      { name: "🎮 Spiel",       value: event.game ?? "–",                                   inline: true },
      { name: "📆 Start",       value: fmtDate(event.startAt),                              inline: true },
      { name: "👥 Anmeldungen", value: registrationsStr,                                    inline: true },
      { name: "⭐ Punkte",      value: `+${event.pointReward} Pts bei Teilnahme`,           inline: true },
    )
    .setFooter({ text: "OMA Companion · Events" })
    .setTimestamp();

  await ch.send({ content: ping, embeds: [embed] });
}

// ── Turnierergebnis ───────────────────────────────────────────────────────────

export async function notifyTournamentResult(data: {
  eventTitle: string;
  game: string | null;
  format: string;
  discordChannelId?: string | null;
  ranking: { place: number; name: string; discordId: string | null; points: number }[];
}) {
  if (!await isBotMessageEnabled("tournament_result")) return;
  const ch = await getTextChannel(newsChannel(data.discordChannelId));
  if (!ch) return;

  const medals  = ["🥇", "🥈", "🥉"];
  const lines   = data.ranking.slice(0, 8).map(p => {
    const medal = medals[p.place - 1] ?? `**${p.place}.**`;
    const name  = p.discordId ? `<@${p.discordId}>` : p.name;
    const pts   = p.points > 0 ? ` · +${p.points.toLocaleString("de-DE")} Pts` : "";
    return `${medal} ${name}${pts}`;
  });

  const winner        = data.ranking[0];
  const winnerMention = winner?.discordId ? `<@${winner.discordId}>` : winner?.name ?? "Unbekannt";

  const rawText = await getBotMessageText("tournament_result");
  const text = fillPlaceholders(rawText, {
    "{eventName}": data.eventTitle,
    "{game}":      data.game ?? "–",
    "{winner}":    winnerMention,
  });

  const embed = new EmbedBuilder()
    .setColor(0xf43f5e)
    .setTitle(`🏆 Turnierergebnis: ${data.eventTitle}`)
    .setDescription(`${text}\n\n${lines.join("\n") || "Keine Platzierungen verfügbar."}`)
    .addFields(
      { name: "🎮 Spiel",  value: data.game ?? "–",                           inline: true },
      { name: "📋 Format", value: FORMAT_LABELS[data.format] ?? data.format,  inline: true },
    )
    .setFooter({ text: "OMA Companion · Turniere" })
    .setTimestamp();

  await ch.send({ content: `🎉 Herzlichen Glückwunsch ${winnerMention}!`, embeds: [embed] });
}

// ── Rang-Aufstieg ─────────────────────────────────────────────────────────────

export async function notifyRankUp(
  discordId: string,
  username: string,
  newRank: { label: string; emoji: string; color: number },
) {
  if (!await isBotMessageEnabled("rank_up")) return;
  const ch = await getTextChannel(newsChannel());
  if (!ch) return;

  const rawText = await getBotMessageText("rank_up");
  const text = fillPlaceholders(rawText, {
    "{username}": `<@${discordId}>`,
    "{rank}":     newRank.label,
  });

  const embed = new EmbedBuilder()
    .setColor(newRank.color)
    .setTitle(`${newRank.emoji} Rang-Aufstieg!`)
    .setDescription(text)
    .setFooter({ text: "OMA Companion · Rangliste" })
    .setTimestamp();

  await ch.send({ embeds: [embed] });
}

// ── Monats-Rangliste ─────────────────────────────────────────────────────────

export async function notifyMonthlyLeaderboard() {
  if (!await isBotMessageEnabled("leaderboard")) return;
  const ch = await getTextChannel(newsChannel());
  if (!ch) return;

  const now              = new Date();
  const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(),     1, 0, 0, 0, 0);
  const monthName        = firstOfLastMonth.toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  const raw = await prisma.pointTransaction.groupBy({
    by: ["userId"],
    where: {
      createdAt: { gte: firstOfLastMonth, lt: firstOfThisMonth },
      amount:    { gt: 0 },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
    take: 10,
  });

  const rawText = await getBotMessageText("leaderboard");
  const introText = fillPlaceholders(rawText, { "{month}": monthName });

  if (!raw.length) {
    await ch.send({
      embeds: [
        new EmbedBuilder()
          .setColor(0x6b7280)
          .setTitle(`🏆 Monats-Rangliste · ${monthName}`)
          .setDescription(`${introText}\n\n_Im vergangenen Monat wurden keine Punkte vergeben._`)
          .setFooter({ text: "OMA Companion · Leaderboard" })
          .setTimestamp(),
      ],
    });
    return;
  }

  const userIds = raw.map(r => r.userId);
  const users   = await prisma.user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, username: true, name: true, discordId: true },
  });
  const userMap = new Map(users.map(u => [u.id, u]));

  const medals = ["🥇", "🥈", "🥉"];
  const lines  = raw.map((row, i) => {
    const u     = userMap.get(row.userId);
    const name  = u?.username ?? u?.name ?? "Unbekannt";
    const medal = medals[i] ?? `**${i + 1}.**`;
    const pts   = (row._sum.amount ?? 0).toLocaleString("de-DE");
    return `${medal} ${u?.discordId ? `<@${u.discordId}>` : name} — **${pts} Pts**`;
  });

  const totalPts = raw.reduce((s, r) => s + (r._sum.amount ?? 0), 0);

  const embed = new EmbedBuilder()
    .setColor(0xf59e0b)
    .setTitle(`🏆 Monats-Rangliste · ${monthName}`)
    .setDescription(`${introText}\n\n${lines.join("\n")}`)
    .addFields({ name: "Community gesamt", value: `${totalPts.toLocaleString("de-DE")} Pts verdient`, inline: true })
    .setFooter({ text: "OMA Companion · Leaderboard" })
    .setTimestamp();

  await ch.send({ embeds: [embed] });
}
