// Standard-Regeln der persönlichen Event-Meldungen (Check-in, Auslosung, Nachrücken, Ergebnis-Prüfung …).
//
// Vorher wurden diese Meldungen direkt verschickt — an den Regeln im Admin-Bereich vorbei: nicht
// abschaltbar, Texte fest, keine Discord-DM. Jetzt ist jede eine Regel wie "Dein Match ist bereit".
// Der Seed (scripts/seed-notification-rules.ts) legt sie beim Deploy an; bis dahin — und falls eine
// Zeile fehlt — nimmt notify-dispatch.ts diese Standardwerte. Im Admin GELÖSCHTE Regeln bleiben aus.

export interface RuleSeed {
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

const personal = (r: Omit<RuleSeed, "category" | "discordChanEnabled"> & { discordChanEnabled?: boolean }): RuleSeed =>
  ({ category: "events", discordChanEnabled: false, urlTemplate: "/events", ...r });

export const EVENT_PERSONAL_RULES: RuleSeed[] = [
  personal({
    key: "checkin_open",
    label: "Check-in ist offen",
    description: "Wenn der Check-in öffnet (30 Minuten vor dem Start), an alle angemeldeten Spieler, die noch nicht bereit sind. Nur bei Events mit Check-in.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true,
    titleTemplate: "✅ Check-in offen: {eventName}",
    bodyTemplate: "{eventName} startet gleich. Drück „Bin bereit“, sonst wirst du nicht ausgelost.",
  }),
  personal({
    key: "checkin_not_drawn",
    label: "Nicht ausgelost (nicht bereit)",
    description: "Nach der Auslosung an angemeldete Spieler, die beim Check-in nicht bereit waren und deshalb nicht im Turnier sind.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "Nicht ausgelost: {eventName}",
    bodyTemplate: "Du warst bei der Auslosung nicht bereit und bist diesmal nicht im Turnier. Beim nächsten Mal rechtzeitig „Bin bereit“ drücken.",
  }),
  personal({
    key: "draw_result",
    label: "Turnier: Du bist ausgelost",
    description: "Nach der Auslosung an jeden ausgelosten Spieler — mit erstem Gegner, Gruppe bzw. Freilos ({line}). {drawLabel} ist „Ausgelost“ bzw. „Neu ausgelost“.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true,
    titleTemplate: "🎲 {drawLabel}: {eventName}",
    bodyTemplate: "{line}",
  }),
  personal({
    key: "draw_posted",
    label: "Turnier: Auslosung im Discord-Kanal",
    description: "Kurzer Post im Discord-Kanal des Events bzw. der Reihe, sobald ausgelost ist (nur wenn das Event einen eigenen Kanal hat).",
    pushEnabled: false, inAppEnabled: false, discordDmEnabled: false, discordChanEnabled: true,
    titleTemplate: "🎲 {drawLabel}: {eventName}",
    bodyTemplate: "{what}: {players} Spieler sind dabei. Jeder hat eine Meldung mit seinem ersten Gegner bekommen.",
  }),
  personal({
    key: "player_replaced_in",
    label: "Turnier: Für einen Spieler nachgerückt",
    description: "Wenn ein Verwalter einen ausgefallenen Spieler ersetzt — an den Nachrücker, mit seinem Einstieg ({line}).",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true,
    titleTemplate: "Du bist nachgerückt: {eventName}",
    bodyTemplate: "{line}",
  }),
  personal({
    key: "player_replaced_out",
    label: "Turnier: Platz an Nachrücker vergeben",
    description: "Wenn ein Verwalter einen Spieler ersetzt — an den ersetzten Spieler.",
    pushEnabled: false, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "Du wurdest ersetzt: {eventName}",
    bodyTemplate: "Der Veranstalter hat deinen Platz im Turnier an {replacement} gegeben.",
  }),
  personal({
    key: "results_review",
    label: "Verwalter: Ergebnisse prüfen",
    description: "An die Verwalter eines Events, wenn Spieler Ergebnisse melden. Gesammelt: solange die Meldung ungelesen ist, wird nur die Anzahl aktualisiert.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "Ergebnisse prüfen: {eventName}",
    bodyTemplate: "{pendingText}",
  }),
  personal({
    key: "results_conflict",
    label: "Verwalter: Widerspruch bei Ergebnissen",
    description: "An die Verwalter, sobald zwei Spieler unterschiedliche Ergebnisse für dasselbe Match melden.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true,
    titleTemplate: "⚠️ Widerspruch bei {eventName}",
    bodyTemplate: "Zwei Spieler haben unterschiedliche Ergebnisse gemeldet. Bitte anhand der Screenshots prüfen.",
  }),
  personal({
    key: "waitlist_promoted",
    label: "Warteliste: Nachgerückt",
    description: "Wenn ein Platz frei wird und der Erste der Warteliste automatisch angemeldet ist.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true,
    titleTemplate: "🎉 Du bist nachgerückt: {eventName}",
    bodyTemplate: "Ein Platz ist frei geworden. Du bist jetzt angemeldet.",
  }),
  personal({
    key: "registered_by_manager",
    label: "Vom Veranstalter eingetragen",
    description: "Wenn ein Verwalter ein Mitglied als Spieler oder Zuschauer einträgt.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "Du wurdest eingetragen: {eventName}",
    bodyTemplate: "Du bist {roleText} dabei.",
  }),
  personal({
    key: "event_cancelled",
    label: "Event abgesagt",
    description: "Wenn ein Event vor dem Start gelöscht wird — an alle Angemeldeten (außer dem, der absagt).",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "❌ Abgesagt: {eventName}",
    bodyTemplate: "{eventName} am {date} findet nicht statt.",
  }),
  personal({
    key: "game_vote_reminder",
    label: "Spielwahl: endet bald",
    description: "Wenige Stunden vor dem Ende der Spielwahl an Stammspieler (bzw. das Squad), die noch nicht abgestimmt haben.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "🗳️ Noch {hours} Std.: Welches Spiel bei {eventName}?",
    bodyTemplate: "Du hast noch nicht abgestimmt. Zur Wahl: {games}.",
  }),
  personal({
    key: "game_vote_candidate_removed",
    label: "Spielwahl: Kandidat entfernt",
    description: "Wenn ein Verwalter einen Kandidaten entfernt — an alle, die dafür gestimmt hatten (ihre Stimme dafür fällt weg).",
    pushEnabled: false, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "Spielwahl {eventName}: {game} entfernt",
    bodyTemplate: "{game} steht nicht mehr zur Wahl, deine Stimme dafür ist weggefallen. Schau dir die übrigen Spiele an.",
  }),
  personal({
    key: "game_vote_attention",
    label: "Verwalter: Spielwahl prüfen",
    description: "An die Verwalter, wenn die Spielwahl kein Spiel ergeben hat oder niemand abgestimmt hat ({reason}).",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true,
    titleTemplate: "⚠️ Spielwahl {eventName}: bitte prüfen",
    bodyTemplate: "{reason}",
  }),
  personal({
    key: "poll_winner",
    label: "Umfrage: Du hast gewonnen",
    description: "Nach der Auswertung einer Umfrage nach dem Event (z.B. MVP) an den bzw. die Gewinner.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: true,
    titleTemplate: "🏆 {label} bei {eventName}: Das bist du!",
    bodyTemplate: "Die Community hat abgestimmt. {reward}",
  }),
  personal({
    key: "poll_result",
    label: "Umfrage: Ergebnis",
    description: "Nach der Auswertung einer Umfrage nach dem Event an alle, die abgestimmt haben.",
    pushEnabled: false, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "Ergebnis {label} bei {eventName}",
    bodyTemplate: "{winners}",
  }),
  personal({
    key: "prediction_settled",
    label: "Tipp: ausgewertet",
    description: "Wenn der Sieger-Tipp eines Events ausgewertet ist: richtig (mit Auszahlung), falsch oder Einsatz zurück (kein Sieger, ungültiger Tipp, Event abgesagt).",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "🎯 Tipp bei {eventName}: {headline}",
    bodyTemplate: "{detail}",
  }),
  personal({
    key: "prediction_player_left",
    label: "Tipp: getippter Spieler spielt nicht mehr mit",
    description: "Wenn sich vor dem Start der Spieler abmeldet, auf den man getippt hat.",
    pushEnabled: true, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "🎯 Dein Tipp bei {eventName}: {player} spielt nicht mehr mit",
    bodyTemplate: "Ändere deinen Tipp bis zum Start. Sonst bekommst du deinen Einsatz beim Abschluss zurück.",
  }),
  personal({
    key: "unregister_short_notice",
    label: "Verwalter: Kurzfristige Abmeldung",
    description: "An die Verwalter, wenn sich ein Spieler weniger als 24 Stunden vor dem Start (oder nach dem Einchecken) abmeldet.",
    pushEnabled: false, inAppEnabled: true, discordDmEnabled: false,
    titleTemplate: "Kurzfristige Abmeldung: {eventName}",
    bodyTemplate: "{player} hat sich abgemeldet.",
  }),
];

/** Standardwert einer Regel (nur für die persönlichen Event-Meldungen oben). */
export function defaultRule(key: string): RuleSeed | null {
  return EVENT_PERSONAL_RULES.find(r => r.key === key) ?? null;
}
