import { awardPoints, everAwarded, type PointRule } from "./points";

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

/**
 * Vergibt den einmaligen Profil-Vervollständigen-Bonus für `rule`, falls noch nicht
 * geschehen. Wird direkt nach dem Speichern eines Profilfelds aufgerufen, sobald das
 * Feld nicht mehr leer ist. `everAwarded` prüft gegen die PointTransaction-Historie,
 * ein späteres Leeren + erneutes Befüllen des Felds zahlt also nicht doppelt aus.
 * Fehler beim Vergeben dürfen das eigentliche Speichern nicht blockieren.
 *
 * Gibt zurück, ob gerade tatsächlich vergeben wurde (false = war schon vorher vergeben,
 * oder ein Fehler ist aufgetreten) — genutzt vom Backfill-Skript, um zu wissen, welche
 * Items für die Zusammenfassungs-Benachrichtigung neu dazugekommen sind.
 */
export async function awardProfileCompletionIfNeeded(userId: string, rule: PointRule): Promise<boolean> {
  try {
    if (await everAwarded(userId, rule)) return false;
    await awardPoints(userId, rule);
    return true;
  } catch {
    // Bonus ist ein Nice-to-have — ein Fehler hier darf den Profil-Save nicht kippen.
    return false;
  }
}
