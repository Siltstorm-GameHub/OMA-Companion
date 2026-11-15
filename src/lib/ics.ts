// Kalender-Export (.ics, RFC 5545) für einzelne Events — "Zum Kalender hinzufügen".
// Zeiten in UTC (…Z), damit jeder Kalender sie korrekt in die eigene Zeitzone umrechnet.

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Sonderzeichen laut RFC 5545 escapen (Backslash, Semikolon, Komma, Zeilenumbruch). */
export function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Zeilen > 75 Oktette falten (Folgezeilen beginnen mit einem Leerzeichen). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let currentLen = 0;
  for (const ch of line) {
    const len = new TextEncoder().encode(ch).length;
    const limit = out.length === 0 ? 75 : 74;
    if (currentLen + len > limit) {
      out.push(current);
      current = "";
      currentLen = 0;
    }
    current += ch;
    currentLen += len;
  }
  out.push(current);
  return out.join("\r\n ");
}

export function buildEventIcs(ev: {
  id: string;
  title: string;
  description?: string | null;
  startAt: Date;
  endAt?: Date | null;
  url: string;
  now?: Date;
}): string {
  const end = ev.endAt && ev.endAt > ev.startAt ? ev.endAt : new Date(ev.startAt.getTime() + DEFAULT_DURATION_MS);
  const desc = [ev.description?.trim(), ev.url].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Old Masters Ally//Companion//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:event-${ev.id}@oma-companion`,
    `DTSTAMP:${icsDate(ev.now ?? new Date())}`,
    `DTSTART:${icsDate(ev.startAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
    `DESCRIPTION:${icsEscape(desc)}`,
    `URL:${ev.url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
