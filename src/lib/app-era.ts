import { prisma } from "./prisma";

// Beginn der aktuellen "Ära" der App — gesetzt vom selektiven Reset (lib/reset-selective.ts).
// Auswertungen über ein Zeitfenster (z.B. das Ansehen der Community-Jobs) zählen nichts davor,
// damit Daten, die beim Reset bewusst erhalten blieben (Kommentar-Stimmen im Ideen-Board),
// zurückgesetzte Werte nicht wiederherstellen.
export const APP_ERA_START_KEY = "app_era_start";

export async function getAppEraStart(): Promise<Date | null> {
  const row = await prisma.botConfig.findUnique({ where: { key: APP_ERA_START_KEY } }).catch(() => null);
  if (!row?.value) return null;
  const d = new Date(row.value);
  return Number.isNaN(d.getTime()) ? null : d;
}
