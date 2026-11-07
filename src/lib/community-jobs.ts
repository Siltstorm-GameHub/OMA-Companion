/**
 * Community-Jobs: Katalog aktiver, community-bewerteter Jobs (Content Creator,
 * Coach/Manager, Visionär). Journalist, Fotograf und Marketing Manager sind im
 * Content Creator zusammengelegt (siehe CONTENT_AREAS). Reiner Code ohne Prisma.
 *
 * Offenes Modell: Jeder User darf alle Jobs ausüben — ohne Bewerbung, Slots
 * oder Vertrag. Qualität steuern Community-Bewertungen, das Tageslimit für
 * gezählte Beiträge und die Moderation.
 */

export interface CommunityJobDef {
  key: string;
  label: string;
  emoji: string;
  description: string; // Deutsch, ein bis zwei Sätze
  officeGuideMarkdown: string; // Anleitungstext fürs Büro
}

export const COMMUNITY_JOBS: CommunityJobDef[] = [
  {
    key: "content_creator",
    label: "Content Creator",
    emoji: "🎬",
    description: "Teilt Beiträge: Werbung für Events, Fotos und Clips oder Berichte — alles in einem, wie es passt.",
    officeGuideMarkdown:
      "Als Content Creator machst du die Community sichtbar — mit **Beiträgen**. Ein Beitrag kann Werbung für ein Event sein, " +
      "ein paar Fotos und Clips oder ein ganzer Bericht. Wie du die Werkzeuge kombinierst, ist dir überlassen. Je mehr Daumen " +
      "deine Beiträge und Ergänzungen diese Woche bekommen, desto höher deine Gehaltsstufe — auch Daumen auf ältere Beiträge zählen.\n\n" +
      "**Ein Beitrag, alle Werkzeuge**\n" +
      "- **Text** mit Formatierung, Vorschau, Emojis (auch Discord-Emojis) und @-Erwähnungen. Titel ist optional.\n" +
      "- **Bilder & Clips:** mehrere Bilder auf einmal (automatisch verkleinert, optional mit Wasserzeichen), Video-Clips, im **Studio** gestaltete Grafiken oder die **Monats-Collage**. Alles landet zusätzlich in der Mediathek und kann einem Album zugeordnet werden.\n" +
      "- **Titelbild:** aus der Mediathek (auch Bilder anderer) oder das **Cover eines Spiels**.\n" +
      "- **Werbung:** Wähle ein Event — Vorlagen (Ankündigung, Erinnerung, Letzte Plätze, Heute) füllen Datum, Spiel und Anmeldungen ein, ein Häkchen hängt den **Anmelde-Link** an, „Text kopieren“ bringt ihn nach Instagram oder Discord.\n" +
      "- **Bausteine:** Ergebnistabelle, Teilnehmerliste, Top 10, Wochen- und Monatsrückblick und Interviews füllen sich aus Community-Daten. Bei vergangenen Events füllt „Aus Event vorbefüllen“ einen Bericht vor.\n" +
      "- Entwürfe speicherst du privat. Jeder Beitrag hat eine **eigene Seite mit Link**, Änderungen erscheinen als „Korrigiert am“.\n\n" +
      "**Im Büro**\n" +
      "- **Empfehlungen:** kommende Events ohne Werbung, Erinnerungen kurz vor dem Start, wenige Anmeldungen, vergangene Events ohne Beitrag, alte Entwürfe, offene Bildwünsche und die Monats-Collage. Dazu Spiele-Angebote von Steam und Xbox: „Beitrag dazu“ startet einen Beitrag ohne Event.\n" +
      "- **Bildwünsche** anderer erfüllst du mit „Bild hochladen“ — der Beitrag mit deinem Bild erfüllt den Wunsch. Brauchst du selbst ein Bild, frag im Editor bei den anderen an.\n" +
      "- **Werbe-Anfragen von Coaches:** „Post schreiben“ startet einen Werbe-Beitrag für den Trainings-Termin.\n" +
      "- **Kampagnen** planen Ankündigung, Erinnerung und „Heute“ zu einem Event. **Interviews** und **Reihen** findest du ebenfalls hier.\n" +
      "- Auf der Turnierseite stehen alle Beiträge zum Event, mit „Beitrag dazu erstellen“.\n\n" +
      "**Zusammenarbeit**\n" +
      "- Nutzt jemand dein Bild als Titelbild oder in einer Anleitung, erfüllt dein Beitrag eine Werbe-Anfrage oder entsteht daraus eine Idee, gibt es einen kleinen Bonus.",
  },
  {
    key: "coach",
    label: "Coach/Manager",
    emoji: "🎓",
    description: "Hilft neuen oder unerfahrenen Spielern, unabhängig von Squad-Teamleadern.",
    officeGuideMarkdown:
      "Du hilfst neuen oder unerfahrenen Spielern, unabhängig von Squad-Teamleadern. " +
      "Andere bewerten dich auf deinem Profil oder nach einem Training (4–5 Sterne bringen einen Punkt, 3 sind neutral, 1–2 ziehen einen ab). Auch Daumen auf deine Anleitungen zählen.\n\n" +
      "**Hilfe anbieten**\n" +
      "- **Termine:** Trainings mit Datum, Plätzen, Event-Bezug und Meeting-Link, auf Wunsch wöchentlich wiederholt. Es gibt eine Warteliste, Erinnerungen und Duplizieren mit einer Woche Abstand.\n" +
      "- **Anwesenheit** trägst du nach dem Termin ein. Teilnehmer, die du weiter begleiten möchtest, nimmst du als **Mentees** auf.\n" +
      "- **Verfügbarkeit:** „Ich helfe gerade“ zeigt, dass du für Ad-hoc-Hilfe erreichbar bist.\n" +
      "- **Spezialgebiete:** bis zu 6 Tags (Spiele, Sprachen), damit man dich findet.\n" +
      "- **Werbung anfragen:** Bei einem eigenen Termin bittest du die Marketing Manager, ihn zu bewerben. Sobald der Post steht, wirst du benachrichtigt (und bekommst einen kleinen Bonus).\n\n" +
      "**Hilfe finden und geben**\n" +
      "- **Hilfe anfragen:** Spieler können dich jederzeit um Hilfe bitten, auch wenn du gerade nicht verfügbar bist. Offene Anfragen siehst du im Büro.\n" +
      "- **Neue Spieler:** Die Liste „ohne Training“ zeigt dir, wen du ansprechen kannst.\n" +
      "- **Anleitungen:** Schreibe Anleitungen zu Spielen, sie erscheinen im Community-Board und werden bewertet. Du kannst Bilder aus der Mediathek einfügen oder bei den Fotografen einen Screenshot anfragen. Wählst du ein Spiel, erscheint dessen Cover bei deiner Anleitung.\n\n" +
      "**Im Büro**\n" +
      "- **Empfehlungen** zeigen offene Hilfe-Anfragen, fehlende Termine, neue Spieler ohne Training und Events ohne Vorbereitungs-Training.\n" +
      "- **Auswertung:** Ø Bewertung pro Woche und letzte Termine.",
  },
  {
    key: "visionaer",
    label: "Visionär",
    emoji: "💡",
    description: "Reicht Ideen und Vorschläge ein, über die die Community abstimmt und die sie bewertet.",
    officeGuideMarkdown:
      "Du reichst Ideen ein. Die Community bewertet sie mit 1 bis 5 Sternen und einer Begründung, " +
      "und daraus ergibt sich deine Wochenstufe: 4–5 Sterne bringen einen Punkt, 3 Sterne sind neutral, 1–2 Sterne ziehen einen ab. Auch nach Ablauf der Abstimmungsfrist bleibt eine Idee bewertbar.\n\n" +
      "**Idee einreichen**\n" +
      "- **Vorlage:** Problem → Vorschlag → Nutzen, oder Freitext mit Formatierung, Emojis und @-Erwähnungen. Wähle eine **Kategorie** und optional eine **Abstimmungsfrist**.\n" +
      "- **Schon vorhanden?** Beim Tippen des Titels zeigt dir das Formular ähnliche Ideen.\n" +
      "- **Bilder, Mockups oder ein Spiel-Cover** (bis zu 3) und ein **Steam-Spiel** mit Preis und Spielerzahl machen deine Idee anschaulicher.\n" +
      "- **Idee dazu:** Auf der Turnierseite und unter Berichten startest du eine Idee direkt zu einem Event oder Bericht.\n\n" +
      "**Was danach passiert**\n" +
      "- Deine Idee hat eine **eigene Seite mit Link**, das Ergebnis zeigt Durchschnitt und Verteilung, die Begründungen siehst nur du.\n" +
      "- Andere können bei einer Idee mit „Ich wäre dabei“ oder „Ich helfe mit“ mitmachen.\n" +
      "- Nach Feedback kannst du die Idee **überarbeiten** (Version 2). Alle bisherigen Bewerter werden informiert und dürfen neu bewerten.\n" +
      "- Das Team setzt den **Status**: In Prüfung, Wird umgesetzt, Umgesetzt oder Abgelehnt. Umgesetztes erscheint auf der **Roadmap**.\n" +
      "- Läuft die Frist ab, bekommst du eine Zusammenfassung. Top-Ideen der Woche und des Monats werden im Discord gepostet.\n\n" +
      "**Im Büro**\n" +
      "- **Empfehlungen:** neue Idee einreichen, Ideen ohne Bewertung, sehr gut bewertete Ideen ohne Status, Anlässe nach beendeten Events und Ideen anderer, die auf deine Bewertung warten. Dazu Spiele-Vorschläge von Steam und Xbox (Sales bzw. Angebote, Neuerscheinungen, Game Pass) als Vorlage für „Gemeinsam spielen?“.\n" +
      "- **Auswertung:** Sterne pro Woche, Verteilung, beste Idee und Anteil umgesetzter Ideen.\n\n" +
      "**Zusammenarbeit**\n" +
      "- Für Bilder oder Mockups kannst du die Fotografen um ein Bild bitten.\n" +
      "- Wird eine Idee „Wird umgesetzt“ oder „Umgesetzt“, gibt es einen Bonus. Auch aus einem Bericht heraus entstandene Ideen bringen dem Journalisten etwas.",
  },
];

/**
 * Bereiche des Content Creators. Die Schlüssel sind die früheren Job-Schlüssel (Journalist,
 * Fotograf, Marketing Manager) — intern steuern sie weiter Werkzeuge, Formulare und Empfehlungen
 * je Inhaltstyp; Gehalt, Score, Tageslimit und Einstellungen laufen über `content_creator`.
 */
export const CONTENT_CREATOR_KEY = "content_creator";
export const CONTENT_AREAS = [
  { key: "journalist", label: "Berichte" },
  { key: "fotograf", label: "Medien" },
  { key: "marketing_manager", label: "Werbung" },
] as const;
export type ContentAreaKey = (typeof CONTENT_AREAS)[number]["key"];

export function isContentArea(key: string | null | undefined): key is ContentAreaKey {
  return !!key && CONTENT_AREAS.some(a => a.key === key);
}

/** Frühere Jobs (bis zur Zusammenlegung zum Content Creator) — nur noch für Historie, Labels und Emojis je Bereich. */
const LEGACY_COMMUNITY_JOBS: CommunityJobDef[] = [
  { key: "journalist", label: "Journalist", emoji: "📰", description: "", officeGuideMarkdown: "" },
  { key: "fotograf", label: "Fotograf", emoji: "📸", description: "", officeGuideMarkdown: "" },
  { key: "marketing_manager", label: "Marketing Manager", emoji: "📣", description: "", officeGuideMarkdown: "" },
];

/** Aktueller Job — oder ein früherer (Journalist/Fotograf/Marketing Manager) für alte Gehaltszeilen, Labels und Emojis. */
export function getCommunityJob(jobKey: string): CommunityJobDef | undefined {
  return COMMUNITY_JOBS.find(j => j.key === jobKey) ?? LEGACY_COMMUNITY_JOBS.find(j => j.key === jobKey);
}
