/**
 * Community-Jobs: Katalog aktiver, community-bewerteter Jobs (Journalist,
 * Fotograf, Marketing Manager, Coach/Manager, Visionär). Reiner Code ohne
 * Prisma.
 *
 * Bewusst OHNE Rang-Voraussetzung: Admin-Freigabe der Bewerbung ist der
 * einzige Qualitätsfilter, siehe Plan "Community-Jobs mit Büro/Werkstatt
 * und Wochengehalt".
 */

export interface CommunityJobDef {
  key: string;
  label: string;
  emoji: string;
  description: string; // Deutsch, ein bis zwei Sätze
  maxSlots: number; // Startwert, admin-überschreibbar (siehe community-job-config.ts)
  officeGuideMarkdown: string; // Anleitungstext fürs Büro
}

export const COMMUNITY_JOBS: CommunityJobDef[] = [
  {
    key: "journalist",
    label: "Journalist",
    emoji: "📰",
    description: "Schreibt Berichte zu Events und aktuellen Themen der Community.",
    maxSlots: 3,
    officeGuideMarkdown:
      "Du schreibst Berichte zu Events und aktuellen Themen. Je mehr Daumen deine Berichte, " +
      "Ergänzungen und Kommentare diese Woche bekommen, desto höher deine Gehaltsstufe. " +
      "Auch Daumen auf ältere Berichte zählen für die Woche, in der sie eingehen.\n\n" +
      "**Schreiben**\n" +
      "- **Erstellen** öffnet den Editor mit Vorschau. Entwürfe speicherst du privat und veröffentlichst sie später.\n" +
      "- **Bausteine:** Ergebnistabelle, Teilnehmerliste, Top 10, Wochen- und Monatsrückblick und Interview-Vorlage füllen sich aus Community-Daten.\n" +
      "- **Formatierung, Emojis (auch Discord-Emojis) und @-Erwähnungen** helfen dir beim Ausformulieren. Erwähnte Spieler werden benachrichtigt.\n" +
      "- **Kategorie, Berichtsreihe und Titelbild** gibst du im Editor an. Ein Bild kannst du bei den Fotografen anfragen.\n" +
      "- Jeder Bericht hat eine **eigene Seite mit Link**. Änderungen an veröffentlichten Berichten erscheinen als „Korrigiert am“ mit Verlauf.\n" +
      "- Zu Fotos und Werbe-Posts im Community-Board schreibst du direkt mit „Bericht dazu schreiben“.\n\n" +
      "**Im Büro**\n" +
      "- **Empfehlungen** zeigen dir Events ohne Bericht (große zuerst), Events von heute, alte Entwürfe, Berichte ohne Titelbild, neue Ergänzungen und mehr. Dazu Spiele-Vorschläge von Steam und Xbox (Sales bzw. Angebote, Neuerscheinungen, Game Pass): „Beitrag dazu“ legt einen Bericht ohne Event an.\n" +
      "- **Auswertung** zeigt Daumen pro Woche, Top-Bericht und Kategorien. Du bekommst Benachrichtigungen bei Ergänzungen, Kommentaren und Daumen-Meilensteinen.\n" +
      "- **Interviews:** Frage Spieler an, ihre Antworten fließen als Vorlage in deinen Bericht.\n" +
      "- **Zusammenarbeit:** Bildwünsche kannst du an die Fotografen richten. Entsteht aus deinem Bericht eine Idee eines Visionärs, gibt es einen kleinen Bonus.",
  },
  {
    key: "fotograf",
    label: "Fotograf",
    emoji: "📸",
    description: "Lädt Highlight-Clips, Collagen, Screenshots und Grafiken hoch, die anderen Jobs zur Verfügung stehen.",
    maxSlots: 5,
    officeGuideMarkdown:
      "Du lädst Bilder, Clips, Collagen, Banner und Grafiken in die gemeinsame Mediathek hoch. " +
      "Journalisten und Marketing Manager binden sie in ihre Beiträge ein. Du wirst für deine Beiträge " +
      "selbst über Daumen bewertet.\n\n" +
      "**Hochladen**\n" +
      "- **Bild gestalten:** Vorlagen, OMA-Logo, wählbares Format (16:9, Banner, Quadrat, Hochkant) und auf Wunsch ein Wasserzeichen mit deinem Namen.\n" +
      "- **Mehrere Bilder:** Bis zu 20 Fotos eines Events auf einmal mit Unterschriften, automatisch verkleinert. Es gibt nur eine Discord-Ankündigung.\n" +
      "- **Video-Clip:** echte Videodatei mit Größenlimit und Fortschrittsanzeige.\n" +
      "- **Monats-Collage:** baut sich aus den beliebtesten Bildern der letzten 30 Tage.\n" +
      "- **Alben** fassen Bilder einer Serie zusammen und lassen sich als Ganzes verlinken.\n\n" +
      "**Im Büro**\n" +
      "- **Bildwünsche** von Journalisten, Marketing Managern, Coaches und Visionären: Ein Klick auf „Bild hochladen“ erfüllt den Wunsch.\n" +
      "- **Empfehlungen:** Events ohne oder mit wenigen Bildern, Events von heute, lange offene Bildwünsche, Bilder ohne Unterschrift und die Monats-Collage.\n" +
      "- **Auswertung:** Daumen, Nutzungen durch andere Jobs und beliebteste Bilder. Du wirst benachrichtigt, wenn dein Bild verwendet wird oder Daumen-Meilensteine erreicht.\n" +
      "- **Mediathek durchsuchen:** nach Unterschrift, Event, Fotograf und Typ. Deine Bilder erscheinen im Profil und auf der Turnierseite.\n" +
      "- **Zusammenarbeit:** Nutzen andere dein Bild als Titelbild, im Werbe-Post oder in einer Anleitung, gibt es einen kleinen Bonus.",
  },
  {
    key: "marketing_manager",
    label: "Marketing Manager",
    emoji: "📣",
    description: "Erstellt Werbe-Posts für kommende Events.",
    maxSlots: 5,
    officeGuideMarkdown:
      "Du erstellst Werbe-Posts für bevorstehende Events. Bewertet wird über Daumen der Community, " +
      "deine Wochenstufe ergibt sich aus den Daumen auf deine Posts und Kommentare.\n\n" +
      "**Posts schreiben**\n" +
      "- **Text aus Vorlage:** Ankündigung, Erinnerung, „Letzte Plätze“ und „Heute geht’s los“ setzen Titel, Datum, Uhrzeit, Spiel und Anmeldezahl automatisch ein.\n" +
      "- **Anmelde-Link:** Ein Häkchen hängt „Jetzt anmelden“ mit Link zur Event-Seite an. Die **Vorschau** zeigt den fertigen Post.\n" +
      "- **Bild:** aus der Mediathek (oben stehen Bilder passend zu Event oder Spiel), im Studio gestaltet oder selbst hochgeladen.\n" +
      "- **Kopieren:** Text inklusive Link mit einem Klick für Instagram oder Discord. Ein Admin bestätigt später, dass der Post extern veröffentlicht wurde.\n\n" +
      "**Kampagnen und Vorlagen**\n" +
      "- **Kampagne:** plant zu einem Event Ankündigung, Erinnerung (3 Tage vorher) und „Heute“. Erledigte Schritte bekommen einen Haken.\n" +
      "- **Als Vorlage:** Ein guter Post lässt sich für ein anderes Event übernehmen, prüfe danach Datum und Uhrzeit.\n\n" +
      "**Im Büro**\n" +
      "- **Empfehlungen:** Events ohne Werbung, Erinnerung kurz vor dem Start, wenige Anmeldungen, Posts ohne Bild und wiederkehrende Events. Dazu Spiele-Vorschläge von Steam und Xbox (Sales bzw. Angebote, Neuerscheinungen, Game Pass): „Beitrag dazu“ legt einen Post ohne Event an. Ein Werbe-Post braucht überhaupt kein Event, du kannst ihn auch allgemein veröffentlichen.\n" +
      "- **Auswertung:** Daumen pro Woche, bester Post, Anteil mit Bild und extern bestätigt. Du wirst bei Daumen-Meilensteinen und bei der externen Bestätigung benachrichtigt.\n" +
      "- Deine Posts stehen im Profil und auf der Turnierseite des Events.\n\n" +
      "**Zusammenarbeit**\n" +
      "- **Werbe-Anfragen von Coaches:** Ein Coach bittet dich, einen Trainings-Termin zu bewerben. „Post schreiben“ öffnet den Baustein „Trainings-Termin“.\n" +
      "- **Bild fehlt?** Frage es bei den Fotografen an.\n" +
      "- Wird dein Post von einem Journalisten in einem Bericht aufgegriffen oder erfüllt er eine Werbe-Anfrage, gibt es einen kleinen Bonus.",
  },
  {
    key: "coach",
    label: "Coach/Manager",
    emoji: "🎓",
    description: "Hilft neuen oder unerfahrenen Spielern, unabhängig von Squad-Teamleadern.",
    maxSlots: 10,
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
      "- **Anleitungen:** Schreibe Anleitungen zu Spielen, sie erscheinen im Community-Board und werden bewertet. Du kannst Bilder aus der Mediathek einfügen oder bei den Fotografen einen Screenshot anfragen.\n\n" +
      "**Im Büro**\n" +
      "- **Empfehlungen** zeigen offene Hilfe-Anfragen, fehlende Termine, neue Spieler ohne Training und Events ohne Vorbereitungs-Training.\n" +
      "- **Auswertung:** Ø Bewertung pro Woche und letzte Termine.",
  },
  {
    key: "visionaer",
    label: "Visionär",
    emoji: "💡",
    description: "Reicht Ideen und Vorschläge ein, über die die Community abstimmt und die sie bewertet.",
    maxSlots: 3,
    officeGuideMarkdown:
      "Du reichst Ideen ein. Die Community bewertet sie mit 1 bis 5 Sternen und einer Begründung, " +
      "und daraus ergibt sich deine Wochenstufe: 4–5 Sterne bringen einen Punkt, 3 Sterne sind neutral, 1–2 Sterne ziehen einen ab. Auch nach Ablauf der Abstimmungsfrist bleibt eine Idee bewertbar.\n\n" +
      "**Idee einreichen**\n" +
      "- **Vorlage:** Problem → Vorschlag → Nutzen, oder Freitext mit Formatierung, Emojis und @-Erwähnungen. Wähle eine **Kategorie** und optional eine **Abstimmungsfrist**.\n" +
      "- **Schon vorhanden?** Beim Tippen des Titels zeigt dir das Formular ähnliche Ideen.\n" +
      "- **Bilder und Mockups** (bis zu 3) und ein **Steam-Spiel** mit Preis und Spielerzahl machen deine Idee anschaulicher.\n" +
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

export function getCommunityJob(jobKey: string): CommunityJobDef | undefined {
  return COMMUNITY_JOBS.find(j => j.key === jobKey);
}
