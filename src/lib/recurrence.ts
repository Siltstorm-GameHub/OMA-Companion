import { getBerlinDateParts, fromDatetimeLocalBerlin } from "./time";

export type RecurrenceType = "weekly" | "biweekly" | "monthly";
export type MonthlyMode = "dayOfMonth" | "weekdayOfMonth";

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const ORDINALS_DE = ["", "1.", "2.", "3.", "4.", "5."];

/** Wochentag (0=Sonntag) eines Kalendertags — unabhängig von Uhrzeit/Zeitzone, da nur y/m/d einfließen. */
function weekdayOf(year: number, month1: number, day: number): number {
  return new Date(Date.UTC(year, month1 - 1, day)).getUTCDay();
}

/** Human-readable labels for the two monthly options, derived from a reference date (Berlin-Kalendertag). */
export function describeMonthlyModes(refDate: Date): {
  dayOfMonth: string;
  weekdayOfMonth: string;
} {
  const { year, month, day } = getBerlinDateParts(refDate);
  const weekday = WEEKDAYS_DE[weekdayOf(year, month, day)];
  const n = Math.ceil(day / 7);
  return {
    dayOfMonth:    `Jeden ${day}. des Monats`,
    weekdayOfMonth: `Jeden ${ORDINALS_DE[n]} ${weekday} im Monat`,
  };
}

/** Calculate the next occurrence date given the last event date and recurrence settings (alles in Berlin-Wanduhrzeit). */
export function calcNextDate(
  lastDate: Date,
  recurrenceType: RecurrenceType,
  monthlyMode: MonthlyMode,
  referenceDate: Date,
): Date {
  const last = getBerlinDateParts(lastDate);
  const h = last.hour;
  const m = last.minute;

  if (recurrenceType === "weekly" || recurrenceType === "biweekly") {
    const days = recurrenceType === "weekly" ? 7 : 14;
    // Über UTC-Kalendertage vorrücken (Kalendertag-Arithmetik ist zeitzonenunabhängig),
    // dann als Berlin-Wanduhrzeit (gleiche Stunde/Minute) neu interpretieren.
    const advanced = new Date(Date.UTC(last.year, last.month - 1, last.day));
    advanced.setUTCDate(advanced.getUTCDate() + days);
    return buildBerlinDate(advanced.getUTCFullYear(), advanced.getUTCMonth() + 1, advanced.getUTCDate(), h, m);
  }

  // monthly
  const nextMonth = last.month + 1;
  const nextYear  = last.year + (nextMonth > 12 ? 1 : 0);
  const adjMonth  = ((nextMonth - 1) % 12) + 1;

  const ref = getBerlinDateParts(referenceDate);

  if (monthlyMode === "weekdayOfMonth") {
    const weekday = weekdayOf(ref.year, ref.month, ref.day);
    const n       = Math.ceil(ref.day / 7);
    return nthWeekdayOfMonth(nextYear, adjMonth, weekday, n, h, m);
  }

  // dayOfMonth
  const targetDay   = ref.day;
  const daysInMonth = daysInMonthOf(nextYear, adjMonth);
  return buildBerlinDate(nextYear, adjMonth, Math.min(targetDay, daysInMonth), h, m);
}

function daysInMonthOf(year: number, month1: number): number {
  // Tag 0 des Folgemonats (UTC) = letzter Tag des Zielmonats; zeitzonenunabhängig.
  const nextMonth = month1 === 12 ? 1 : month1 + 1;
  const nextYear  = month1 === 12 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth - 1, 0)).getUTCDate();
}

function buildBerlinDate(year: number, month1: number, day: number, hours: number, minutes: number): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  return fromDatetimeLocalBerlin(`${year}-${pad(month1)}-${pad(day)}T${pad(hours)}:${pad(minutes)}`);
}

function nthWeekdayOfMonth(
  year: number, month1: number,
  weekday: number, n: number,
  hours: number, minutes: number,
): Date {
  const firstDayWeekday = weekdayOf(year, month1, 1);
  let day = 1 + ((weekday - firstDayWeekday + 7) % 7) + (n - 1) * 7;
  const daysInMonth = daysInMonthOf(year, month1);
  // If the Nth occurrence doesn't exist (e.g. 5th Sunday), fall back to 4th
  if (day > daysInMonth) day -= 7;
  return buildBerlinDate(year, month1, day, hours, minutes);
}
