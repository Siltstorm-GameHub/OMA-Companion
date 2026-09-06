/**
 * Community-Jobs: Katalog aktiver, community-bewerteter Jobs (Journalist,
 * Fotograf, Marketing Manager, Coach/Manager, Visionär) — unabhängig vom
 * Mancave-Idle-Jobsystem in jobs.ts. Reiner Code ohne Prisma, analog zu
 * JOBS in jobs.ts.
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
      "Schreibe Berichte zu Events oder aktuellen Themen. Je mehr Daumen-hoch deine " +
      "Berichte diese Woche bekommen, desto höher deine Gehaltsstufe. Auch Bewertungen " +
      "auf ältere Berichte zählen für die Woche, in der sie eingehen.",
  },
  {
    key: "fotograf",
    label: "Fotograf",
    emoji: "📸",
    description: "Lädt Highlight-Clips, Collagen, Screenshots und Grafiken hoch, die anderen Jobs zur Verfügung stehen.",
    maxSlots: 5,
    officeGuideMarkdown:
      "Lade Clips, Collagen, Screenshots oder Grafiken hoch. Journalisten und Marketing " +
      "Manager können deine Bilder in ihre Beiträge einbinden — du bekommst dafür " +
      "unabhängig eigene Bewertungen.",
  },
  {
    key: "marketing_manager",
    label: "Marketing Manager",
    emoji: "📣",
    description: "Erstellt Werbe-Posts für kommende Events.",
    maxSlots: 5,
    officeGuideMarkdown:
      "Erstelle Werbe-Posts für ein bevorstehendes Event, gern mit einem Bild aus der " +
      "Mediathek. Bewertet wird über Daumen-hoch der Community.",
  },
  {
    key: "coach",
    label: "Coach/Manager",
    emoji: "🎓",
    description: "Hilft neuen oder unerfahrenen Spielern, unabhängig von Squad-Teamleadern.",
    maxSlots: 10,
    officeGuideMarkdown:
      "Biete niedrigschwellige Hilfe an oder erstelle Trainings-Termine für neue " +
      "Spieler. Andere können dich jederzeit auf deinem Profil bewerten, oder " +
      "Trainings-Teilnehmer nach dem Termin.",
  },
  {
    key: "visionaer",
    label: "Visionär",
    emoji: "💡",
    description: "Reicht Ideen und Vorschläge ein, über die die Community abstimmt und die sie bewertet.",
    maxSlots: 3,
    officeGuideMarkdown:
      "Reiche eine neue Idee ein. Die Community stimmt ab und bewertet sie mit " +
      "1-5 Sternen. Auch nach Ablauf der Abstimmungsfrist bleibt deine Idee bewertbar.",
  },
];

export function getCommunityJob(jobKey: string): CommunityJobDef | undefined {
  return COMMUNITY_JOBS.find(j => j.key === jobKey);
}
