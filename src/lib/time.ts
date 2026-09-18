/**
 * Zentrale Utilities für Datums-/Uhrzeit-Darstellung und -Berechnung.
 *
 * Die App hat kein Timezone-Feld im Datenmodell — `DateTime`-Spalten speichern
 * absolute UTC-Zeitstempel. Da die Community ausschließlich für Europe/Berlin
 * gedacht ist, MUSS jede für Menschen sichtbare Zeit (und jede "welcher Tag
 * ist gerade"-Logik) explizit über diese Utilities laufen — unabhängig davon,
 * in welcher Zeitzone Browser oder Server tatsächlich laufen.
 */

export const BERLIN_TZ = "Europe/Berlin";
const DEFAULT_LOCALE = "de-DE";

export function formatBerlinDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleDateString(locale, { ...options, timeZone: BERLIN_TZ });
}

export function formatBerlinTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString(locale, { ...options, timeZone: BERLIN_TZ });
}

export function formatBerlinDateTime(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locale: string = DEFAULT_LOCALE,
): string {
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleString(locale, { ...options, timeZone: BERLIN_TZ });
}

/** Die einzelnen Wanduhrzeit-Komponenten eines Zeitpunkts in Europe/Berlin. */
export interface BerlinDateParts {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const partsFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: BERLIN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Liefert die Wanduhrzeit-Komponenten (Jahr, Monat, Tag, Stunde, Minute, Sekunde) eines Zeitpunkts in Berlin. */
export function getBerlinDateParts(date: Date | string | number = new Date()): BerlinDateParts {
  const d = date instanceof Date ? date : new Date(date);
  const parts = partsFormatter.formatToParts(d);
  const get = (type: string) => {
    const p = parts.find((x) => x.type === type);
    return p ? parseInt(p.value, 10) : 0;
  };
  // Manche ICU-Implementierungen liefern bei hour12:false Mitternacht als "24" statt "00".
  let hour = get("hour");
  if (hour === 24) hour = 0;
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour,
    minute: get("minute"),
    second: get("second"),
  };
}

/** Konvertiert ein Date (UTC-Instant) in einen datetime-local-Input-String (YYYY-MM-DDTHH:mm), der die Wanduhrzeit in Berlin darstellt. */
export function toDatetimeLocalBerlin(date: Date | string | number): string {
  const { year, month, day, hour, minute } = getBerlinDateParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

/**
 * Nimmt einen datetime-local-String (YYYY-MM-DDTHH:mm[:ss]), der als Berlin-
 * Wanduhrzeit interpretiert werden soll, und gibt den korrekten UTC-Zeitpunkt
 * als Date zurück. Behandelt DST korrekt, indem der tatsächliche UTC-Offset
 * von Europe/Berlin für den Zieltag ermittelt und die Konvertierung iterativ
 * verifiziert wird (statt eines festen +01:00/+02:00-Offsets).
 */
export function fromDatetimeLocalBerlin(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) {
    throw new Error(`Invalid datetime-local value: ${value}`);
  }
  const [, y, mo, da, h, mi, se] = match;
  const wallClockAsUTC = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(da),
    Number(h),
    Number(mi),
    se ? Number(se) : 0,
  );

  // Erste Näherung: nimm an, der Offset entspricht dem, den Berlin für diesen
  // Zeitpunkt hätte, wenn wallClockAsUTC bereits der richtige UTC-Instant wäre.
  let guess = new Date(wallClockAsUTC);
  for (let i = 0; i < 2; i++) {
    const parts = getBerlinDateParts(guess);
    const guessedWallAsUTC = Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    );
    const diff = wallClockAsUTC - guessedWallAsUTC;
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }
  return guess;
}

/** Beginn des Berlin-Kalendertags (00:00 Berlin-Wanduhrzeit) als UTC-Date. */
export function startOfBerlinDay(date: Date | string | number = new Date()): Date {
  const { year, month, day } = getBerlinDateParts(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return fromDatetimeLocalBerlin(`${year}-${pad(month)}-${pad(day)}T00:00`);
}

/** Prüft, ob zwei Zeitpunkte auf denselben Berlin-Kalendertag fallen. */
export function isSameBerlinDay(a: Date | string | number, b: Date | string | number): boolean {
  const pa = getBerlinDateParts(a);
  const pb = getBerlinDateParts(b);
  return pa.year === pb.year && pa.month === pb.month && pa.day === pb.day;
}
