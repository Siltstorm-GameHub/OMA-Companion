export type RecurrenceType = "weekly" | "biweekly" | "monthly";
export type MonthlyMode = "dayOfMonth" | "weekdayOfMonth";

const WEEKDAYS_DE = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
const ORDINALS_DE = ["", "1.", "2.", "3.", "4.", "5."];

/** Human-readable labels for the two monthly options, derived from a reference date. */
export function describeMonthlyModes(refDate: Date): {
  dayOfMonth: string;
  weekdayOfMonth: string;
} {
  const day = refDate.getDate();
  const weekday = WEEKDAYS_DE[refDate.getDay()];
  const n = Math.ceil(day / 7);
  return {
    dayOfMonth:    `Jeden ${day}. des Monats`,
    weekdayOfMonth: `Jeden ${ORDINALS_DE[n]} ${weekday} im Monat`,
  };
}

/** Calculate the next occurrence date given the last event date and recurrence settings. */
export function calcNextDate(
  lastDate: Date,
  recurrenceType: RecurrenceType,
  monthlyMode: MonthlyMode,
  referenceDate: Date,
): Date {
  const h = lastDate.getHours();
  const m = lastDate.getMinutes();

  if (recurrenceType === "weekly") {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 7);
    return d;
  }

  if (recurrenceType === "biweekly") {
    const d = new Date(lastDate);
    d.setDate(d.getDate() + 14);
    return d;
  }

  // monthly
  const nextMonth = lastDate.getMonth() + 1;
  const nextYear  = lastDate.getFullYear() + (nextMonth > 11 ? 1 : 0);
  const adjMonth  = nextMonth % 12;

  if (monthlyMode === "weekdayOfMonth") {
    const weekday = referenceDate.getDay();
    const n       = Math.ceil(referenceDate.getDate() / 7);
    return nthWeekdayOfMonth(nextYear, adjMonth, weekday, n, h, m);
  }

  // dayOfMonth
  const targetDay   = referenceDate.getDate();
  const daysInMonth = new Date(nextYear, adjMonth + 1, 0).getDate();
  return new Date(nextYear, adjMonth, Math.min(targetDay, daysInMonth), h, m);
}

function nthWeekdayOfMonth(
  year: number, month: number,
  weekday: number, n: number,
  hours: number, minutes: number,
): Date {
  const firstDayWeekday = new Date(year, month, 1).getDay();
  let day = 1 + ((weekday - firstDayWeekday + 7) % 7) + (n - 1) * 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  // If the Nth occurrence doesn't exist (e.g. 5th Sunday), fall back to 4th
  if (day > daysInMonth) day -= 7;
  return new Date(year, month, day, hours, minutes);
}
