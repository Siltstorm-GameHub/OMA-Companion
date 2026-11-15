import type { PointRule } from "./points";

// Client-sicher: nur Konstanten/Typen, keine Laufzeit-Importe von Server-Code (prisma,
// Discord-Bot etc.) — wird von der Client-Komponente ProfileCompletion.tsx importiert.
// Die eigentliche Vergabe-Logik liegt in profile-completion-award.ts (Server-only).

export interface ProfileCompletionItem {
  key: "bio" | "birthday" | "twitch" | "favoriteGames";
  label: string;
  rule: PointRule;
  /** DOM-id der Sektion auf der Profilseite, zu der beim Klick gescrollt wird. */
  sectionId: string;
  /** Custom-Event, das die Zielsektion in den Bearbeitungsmodus schaltet. */
  openEvent: string;
  /** Profil-Reiter, in dem die Sektion liegt (Editor: Einstellungen, "Zockt gerade": Übersicht) */
  tab: "overview" | "settings";
}

export const PROFILE_COMPLETION_ITEMS: ProfileCompletionItem[] = [
  { key: "bio",           label: "Bio schreiben",              rule: "PROFILE_BIO",            sectionId: "profile-editor",        openEvent: "profile-open-editor", tab: "settings" },
  { key: "birthday",      label: "Geburtstag hinterlegen",      rule: "PROFILE_BIRTHDAY",       sectionId: "profile-editor",        openEvent: "profile-open-editor", tab: "settings" },
  { key: "twitch",        label: "Twitch-Kanal verknüpfen",     rule: "PROFILE_TWITCH",         sectionId: "profile-editor",        openEvent: "profile-open-editor", tab: "settings" },
  { key: "favoriteGames", label: "„Zockt gerade“ eintragen",   rule: "PROFILE_FAVORITE_GAMES", sectionId: "favorite-games-section", openEvent: "profile-open-favorite-games", tab: "overview" },
];
