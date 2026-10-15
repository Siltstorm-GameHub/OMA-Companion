/** Reiter der Overlay-Einstellungen — eigenes Modul, weil auch die Server-Seite sie braucht (?tab=…). */
export type SettingsTab = "look" | "clips" | "layout" | "advanced";
export const SETTINGS_TABS: SettingsTab[] = ["look", "clips", "layout", "advanced"];
