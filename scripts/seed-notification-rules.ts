/**
 * Einmalig auszuführen nach dem Deploy des NotificationRule-Schemas:
 *   npx tsx scripts/seed-notification-rules.ts
 *
 * Upsert aller Notification-Regeln mit Defaults, die dem bisherigen
 * Verhalten entsprechen. Für die 9 Schlüssel, die es schon als BotConfig-
 * Eintrag gibt, wird ein individuell angepasster Text übernommen, falls
 * vorhanden — alles andere bekommt einen neuen sinnvollen Default.
 */
import { prisma } from "@/lib/prisma";

interface RuleSeed {
  key: string;
  label: string;
  description: string;
  category: string;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  discordDmEnabled: boolean;
  discordChanEnabled: boolean;
  titleTemplate: string;
  bodyTemplate: string;
  urlTemplate?: string;
  reminderHoursBefore?: number;
  isEventNotification?: boolean;
  eventAudience?: "all" | "participants";
  /** Schlüssel des alten BotConfig-Eintrags, dessen "{key}_text" übernommen werden soll */
  legacyBotConfigKey?: string;
}

const RULES: RuleSeed[] = [
  {
    key: "event_new",
    label: "Neues Event",
    description: "Wird gesendet, wenn ein neues Event erstellt wird.",
    category: "events",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🎮 Neues Event: {eventName}",
    bodyTemplate: "Ein neues Community-Event wurde angekündigt! Meldet euch jetzt an.\n📅 **{eventName}** startet am {date}.",
    urlTemplate: "/events",
    isEventNotification: true, eventAudience: "all",
    legacyBotConfigKey: "event_new",
  },
  {
    key: "event_reminder",
    label: "Event-Erinnerung",
    description: "Vor Event-Start für alle angemeldeten Nutzer und im Discord-Kanal.",
    category: "events",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "⏰ Bald: {eventName}",
    bodyTemplate: "⏰ Nur noch **weniger als {reminderHours} Stunden** bis **{eventName}** beginnt!\nStart: {date} · Jetzt noch anmelden!",
    urlTemplate: "/events",
    reminderHoursBefore: 24,
    isEventNotification: true, eventAudience: "participants",
    legacyBotConfigKey: "event_reminder",
  },
  {
    key: "event_started",
    label: "Event hat begonnen",
    description: "Wenn ein Discord Scheduled Event auf 'Aktiv' springt.",
    category: "events",
    pushEnabled: false, inAppEnabled: false, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🚀 Event läuft jetzt!",
    bodyTemplate: "🚀 **{eventName}** hat soeben begonnen! Viel Spaß und viel Erfolg! 🎮",
    isEventNotification: true, eventAudience: "participants",
    legacyBotConfigKey: "event_started",
  },
  {
    key: "event_ended",
    label: "Event beendet",
    description: "Wenn ein Discord Scheduled Event beendet wird.",
    category: "events",
    pushEnabled: false, inAppEnabled: false, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "✅ Event beendet: {eventName}",
    bodyTemplate: "✅ **{eventName}** ist beendet. Danke an alle {attendeeCount} Teilnehmer!",
    isEventNotification: true, eventAudience: "participants",
    legacyBotConfigKey: "event_ended",
  },
  {
    key: "tournament_started",
    label: "Neues Turnier gestartet",
    description: "Wenn ein Admin ein neues Turnier direkt erstellt (Schnellerstellung).",
    category: "tournaments",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "🏆 Neues Turnier gestartet",
    bodyTemplate: "{eventName}",
    urlTemplate: "/events",
    isEventNotification: true, eventAudience: "all",
  },
  {
    key: "tournament_result",
    label: "Turnierergebnis",
    description: "Wenn ein Turnier auf 'finished' gesetzt wird.",
    category: "tournaments",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🏆 Turnierergebnis: {eventName}",
    bodyTemplate: "🏆 Das Turnier **{eventName}** ist beendet!\nHerzlichen Glückwunsch an {winner} für den 1. Platz! 🎉",
    urlTemplate: "/events",
    isEventNotification: true, eventAudience: "participants",
    legacyBotConfigKey: "tournament_result",
  },
  {
    key: "quest_completed",
    label: "Quest erfüllt",
    description: "Wenn ein Nutzer eine monatliche Quest abschließt.",
    category: "quests",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true, discordChanEnabled: false,
    titleTemplate: "⭐ Quest erfüllt: {questTitle}",
    bodyTemplate: "Du erhältst {reward} Münzen!",
    urlTemplate: "/quests",
  },
  {
    key: "prediction_result",
    label: "Vorhersage-Ergebnis",
    description: "Wenn eine Event-Sieger-Vorhersage ausgewertet wurde (richtig oder falsch).",
    category: "tournaments",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "🎯 Dein Tipp war {result}",
    bodyTemplate: "Du erhältst {reward} Münzen für deine Event-Sieger-Vorhersage.",
    urlTemplate: "/",
  },
  {
    key: "duel_challenge",
    label: "Münzen-Duell-Herausforderung",
    description: "Wenn ein Nutzer zu einem Münzen-Duell herausgefordert wird.",
    category: "tournaments",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "⚔️ Duell-Herausforderung",
    bodyTemplate: "{challenger} fordert dich zu einem Münzen-Duell heraus — Einsatz: {wager} Münzen.",
    urlTemplate: "/minigames/duel",
  },
  {
    key: "duel_result",
    label: "Münzen-Duell-Ergebnis",
    description: "Wenn ein Münzen-Duell aufgelöst wurde.",
    category: "tournaments",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "⚔️ Duell-Ergebnis",
    bodyTemplate: "{result}",
    urlTemplate: "/minigames/duel",
  },
  {
    key: "badge_earned",
    label: "System-Abzeichen freigeschaltet",
    description: "Wenn ein Nutzer automatisch ein System-Abzeichen erreicht.",
    category: "badges",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "{badgeIcon} Neues Abzeichen freigeschaltet!",
    bodyTemplate: "„{badgeName}\" — {badgeDesc}",
    urlTemplate: "/profile",
  },
  {
    key: "badge_awarded",
    label: "Abzeichen von Admin vergeben",
    description: "Wenn ein Admin ein individuelles Abzeichen vergibt.",
    category: "badges",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true, discordChanEnabled: false,
    titleTemplate: "{badgeIcon} Neues Abzeichen erhalten!",
    bodyTemplate: "„{badgeName}\" — {badgeDesc}",
    urlTemplate: "/profile",
  },
  {
    key: "clip_started",
    label: "Clip des Monats – Abstimmung gestartet",
    description: "Wenn ein neuer Clip-Contest erstellt wird.",
    category: "clips",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🎬 Clip des Monats – {month} {year}",
    bodyTemplate: "Die Abstimmung läuft! {nominationCount} Clips stehen zur Wahl.",
    urlTemplate: "/clip-des-monats",
  },
  {
    key: "clip_finished",
    label: "Clip des Monats – Gewinner steht fest",
    description: "Wenn ein Clip-Contest abgeschlossen wird.",
    category: "clips",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🏆 Clip des Monats {month} {year} – {resultHeadline}",
    bodyTemplate: "{resultText}",
    urlTemplate: "/clip-des-monats",
  },
  {
    key: "clip_of_year_started",
    label: "Clip des Jahres – Abstimmung gestartet",
    description: "Wenn die jährliche Clip-des-Jahres-Wahl erstellt wird.",
    category: "clips",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🎬 Clip des Jahres {year}",
    bodyTemplate: "Die Abstimmung läuft! {nominationCount} Clips des Monats stehen zur Wahl.",
    urlTemplate: "/clip-des-jahres",
  },
  {
    key: "clip_of_year_finished",
    label: "Clip des Jahres – Gewinner steht fest",
    description: "Wenn die Clip-des-Jahres-Wahl abgeschlossen wird.",
    category: "clips",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🏆 Clip des Jahres {year} – {resultHeadline}",
    bodyTemplate: "{resultText}",
    urlTemplate: "/clip-des-jahres",
  },
  {
    key: "rank_up",
    label: "Rang-Aufstieg",
    description: "Wenn ein Nutzer durch Aktivität einen neuen Rang erreicht.",
    category: "rank",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "{rankEmoji} Rang-Aufstieg!",
    bodyTemplate: "🎊 {username} hat den Rang **{rank}** erreicht – weiter so!",
    urlTemplate: "/profile",
    legacyBotConfigKey: "rank_up",
  },
  {
    key: "leaderboard",
    label: "Monatliche Rangliste",
    description: "Am 1. des Monats mit den Top-10 des Vormonats.",
    category: "system",
    pushEnabled: false, inAppEnabled: false, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🏆 Monats-Rangliste · {month}",
    bodyTemplate: "🏆 Die aktivsten Mitglieder im **{month}**:\n\n{lines}",
    legacyBotConfigKey: "leaderboard",
  },
  {
    key: "birthday",
    label: "Geburtstag",
    description: "Täglich für Nutzer mit Geburtstag heute.",
    category: "system",
    pushEnabled: false, inAppEnabled: false, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🎂 Alles Gute zum Geburtstag!",
    bodyTemplate: "🎂 {username} hat heute Geburtstag – alles Gute! 🎉\nAls Geschenk gibt es für die nächsten **24 Stunden** doppelte Punkte!",
    legacyBotConfigKey: "birthday",
  },
  {
    key: "lul_suggest",
    label: "LUL Spieltag-Vorschlag",
    description: "Wenn ein Nutzer im Shop einen Spieltag-Vorschlag einlöst.",
    category: "system",
    pushEnabled: false, inAppEnabled: false, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🎮 Spieltag-Vorschlag von {username}",
    bodyTemplate: "🎮 **Spieltag-Vorschlag von {username}**\n**Spiel:** {game}{note}",
    legacyBotConfigKey: "lul_suggest",
  },
  {
    key: "server_approved",
    label: "Server-Bewerbung angenommen",
    description: "Wenn ein Moderator eine Gameserver-Bewerbung annimmt.",
    category: "system",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "Bewerbung angenommen",
    bodyTemplate: "Du hast Zugang zu „{serverName}\" erhalten.",
    urlTemplate: "/servers",
  },
  {
    key: "server_denied",
    label: "Server-Bewerbung abgelehnt",
    description: "Wenn ein Moderator eine Gameserver-Bewerbung ablehnt.",
    category: "system",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "Bewerbung abgelehnt",
    bodyTemplate: "Deine Bewerbung für „{serverName}\" wurde abgelehnt.",
    urlTemplate: "/servers",
  },
  {
    key: "server_revoked",
    label: "Server-Zugriff entzogen",
    description: "Wenn ein Moderator einem Nutzer den Server-Zugriff entzieht.",
    category: "system",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false, discordChanEnabled: false,
    titleTemplate: "Zugriff entzogen",
    bodyTemplate: "Dein Zugang zu „{serverName}\" wurde entzogen.",
    urlTemplate: "/servers",
  },
];

async function main() {
  const legacyConfig = Object.fromEntries(
    (await prisma.botConfig.findMany()).map((r) => [r.key, r.value]),
  );

  for (const rule of RULES) {
    const legacyText = rule.legacyBotConfigKey
      ? legacyConfig[`${rule.legacyBotConfigKey}_text`]
      : undefined;
    const legacyEnabled = rule.legacyBotConfigKey
      ? legacyConfig[`${rule.legacyBotConfigKey}_enabled`]
      : undefined;

    const bodyTemplate = legacyText ?? rule.bodyTemplate;
    const discordChanEnabled = legacyEnabled !== undefined
      ? legacyEnabled === "true"
      : rule.discordChanEnabled;

    await prisma.notificationRule.upsert({
      where: { key: rule.key },
      create: {
        key: rule.key,
        label: rule.label,
        description: rule.description,
        category: rule.category,
        pushEnabled: rule.pushEnabled,
        inAppEnabled: rule.inAppEnabled,
        discordDmEnabled: rule.discordDmEnabled,
        discordChanEnabled,
        titleTemplate: rule.titleTemplate,
        bodyTemplate,
        urlTemplate: rule.urlTemplate ?? null,
        reminderHoursBefore: rule.reminderHoursBefore ?? null,
        isEventNotification: rule.isEventNotification ?? false,
        eventAudience: rule.eventAudience ?? "all",
      },
      update: {}, // Bereits vorhandene Regeln nicht überschreiben (idempotent bei erneutem Lauf)
    });
    console.log(`✓ ${rule.key}${legacyText ? " (Text aus BotConfig übernommen)" : ""}`);
  }

  console.log(`\n${RULES.length} Notification-Regeln geseedet.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
