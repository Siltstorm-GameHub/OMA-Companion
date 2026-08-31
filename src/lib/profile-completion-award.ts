import { awardPoints, everAwarded, type PointRule } from "./points";

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
 *
 * Server-only: importiert prisma/Discord-Code über points.ts. Nie aus einer Client-
 * Komponente importieren — dafür ist profile-completion.ts (nur Konstanten) da.
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
