/** Kategorien für Journalisten-Berichte (client-sicher, ohne Server-Abhängigkeiten). */
export const REPORT_CATEGORIES = [
  { key: "turnierbericht", label: "Turnierbericht" },
  { key: "interview", label: "Interview" },
  { key: "meinung", label: "Meinung" },
  { key: "guide", label: "Guide" },
  { key: "news", label: "News" },
] as const;

export type ReportCategoryKey = (typeof REPORT_CATEGORIES)[number]["key"];

export function isReportCategory(value: unknown): value is ReportCategoryKey {
  return typeof value === "string" && REPORT_CATEGORIES.some(c => c.key === value);
}

export function reportCategoryLabel(key: string | null | undefined): string | null {
  return REPORT_CATEGORIES.find(c => c.key === key)?.label ?? null;
}

export const REPORT_TITLE_MAX = 140;
export const REPORT_BODY_MAX = 20_000;
export const CONTRIBUTION_MAX = 5_000;
