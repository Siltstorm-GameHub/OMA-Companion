import type { PointRule } from "./points";

// Client-sicher: nur Konstanten/Typen, keine Laufzeit-Importe von Server-Code (prisma,
// Discord-Bot etc.) — wird von der Client-Komponente ProfileCompletion.tsx importiert.
// Die eigentliche Vergabe-Logik liegt in profile-completion-award.ts (Server-only).

export interface ProfileCompletionItem {
  key: "bio" | "birthday" | "banner" | "twitch" | "favoriteGames";
  label: string;
  rule: PointRule;
  /** DOM-id der Sektion auf der Profilseite, zu der beim Klick gescrollt wird. */
  sectionId: string;
  /** Custom-Event, das die Zielsektion in den Bearbeitungsmodus schaltet. */
  openEvent: string;
}

export const PROFILE_COMPLETION_ITEMS: ProfileCompletionItem[] = [
  { key: "bio",           label: "Bio schreiben",              rule: "PROFILE_BIO",            sectionId: "profile-editor",        openEvent: "profile-open-editor" },
  { key: "birthday",      label: "Geburtstag hinterlegen",      rule: "PROFILE_BIRTHDAY",       sectionId: "profile-editor",        openEvent: "profile-open-editor" },
  { key: "banner",        label: "Profil-Banner hochladen",     rule: "PROFILE_BANNER",         sectionId: "profile-editor",        openEvent: "profile-open-editor" },
  { key: "twitch",        label: "Twitch-Kanal verknüpfen",     rule: "PROFILE_TWITCH",         sectionId: "profile-editor",        openEvent: "profile-open-editor" },
  { key: "favoriteGames", label: "Lieblingsspiele auswählen",   rule: "PROFILE_FAVORITE_GAMES", sectionId: "favorite-games-section", openEvent: "profile-open-favorite-games" },
];
