import { formatBerlinDate, formatBerlinTime } from "./time";

/** Werbetext-Bausteine für Marketing-Posts (client-sicher, kein Prisma). */

export const MARKETING_TEMPLATES = [
  { id: "announce", label: "Ankündigung" },
  { id: "reminder", label: "Erinnerung" },
  { id: "lastspots", label: "Letzte Plätze" },
  { id: "today", label: "Heute geht\u2019s los" },
  { id: "training", label: "Trainings-Termin" },
] as const;

export type MarketingTemplateId = (typeof MARKETING_TEMPLATES)[number]["id"];

export function isMarketingTemplate(id: unknown): id is MarketingTemplateId {
  return typeof id === "string" && MARKETING_TEMPLATES.some(t => t.id === id);
}

export interface MarketingEventFacts {
  id: string; title: string; game: string | null; startAt: string; registered: number; url: string;
  /** true = Coach-Trainings-Termin statt Event (Anmeldezahl = Trainings-Anmeldungen). */
  training?: boolean;
}

const LINK_PREFIX = "\u{1F449} Jetzt anmelden: ";

export function eventLinkLine(facts: Pick<MarketingEventFacts, "url">): string {
  return `${LINK_PREFIX}${facts.url}`;
}

/** Hängt die Anmelde-Zeile an (einmalig) bzw. entfernt sie wieder. */
export function withEventLink(text: string, facts: Pick<MarketingEventFacts, "url">, on: boolean): string {
  const line = eventLinkLine(facts);
  const without = text.replace(line, "").replace(/\n{3,}/g, "\n\n").trimEnd();
  return on ? `${without}\n\n${line}` : without;
}

/** Baut einen Ausgangstext aus den Event-Fakten — der Manager formuliert danach nur noch um. */
export function buildMarketingText(templateId: MarketingTemplateId, f: MarketingEventFacts): string {
  const weekday = formatBerlinDate(f.startAt, { weekday: "long" });
  const date = formatBerlinDate(f.startAt, { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = formatBerlinTime(f.startAt, { hour: "2-digit", minute: "2-digit" });
  const game = f.game ? `\n\u{1F3AE} ${f.game}` : "";
  const when = `\u{1F5D3}\uFE0F ${weekday}, ${date} um ${time} Uhr`;
  const people = f.registered > 0 ? `${f.registered} ${f.registered === 1 ? "Anmeldung" : "Anmeldungen"} bisher.` : "Sei von Anfang an dabei!";

  switch (templateId) {
    case "training":
      return `\u{1F393} Training: ${f.title}\n${when}${game}\n\nOffen für alle Spieler \u2014 ideal für Einsteiger. ${f.registered > 0 ? `${f.registered} ${f.registered === 1 ? "Anmeldung" : "Anmeldungen"} bisher.` : "Sei dabei!"}\nAnmelden kannst du dich im Profil unter Community-Jobs.`;
    case "reminder":
      return `\u23F0 Nicht vergessen: ${f.title}!\n${when}${game}\n\nMelde dich an, solange noch Platz ist. ${people}`;
    case "lastspots":
      return `\u{1F525} Nur noch wenige Plätze: ${f.title}!\n${when}${game}\n\nJetzt schnell anmelden, bevor es voll wird. ${people}`;
    case "today":
      return `\u{1F680} Heute geht\u2019s los: ${f.title}!\n\u{1F553} Start um ${time} Uhr${game}\n\nKurzentschlossene sind willkommen \u2014 wir sehen uns gleich!`;
    default:
      return `\u{1F4E3} ${f.title}\n${when}${game}\n\nBist du dabei? ${people}`;
  }
}
