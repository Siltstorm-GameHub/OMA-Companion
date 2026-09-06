import { NextResponse } from "next/server";
import { requireMancaveAccess } from "@/lib/mancave-guard";
import { loadMancaveData } from "@/lib/mancave-data-loader";

/**
 * Leichtgewichtiger Ausbau-Ausschnitt, den `ItemsPanel` (siehe
 * MancaveSharedUI.tsx) nach jedem Upgrade/Downgrade nachlädt, statt die ganze
 * Seite neu zu laden (`router.refresh()`/`window.location.reload()`) — das
 * hätte auf dem Monitor-Screen ohnehin nicht funktioniert, da dieses Panel in
 * einem isolierten `<Html>`-React-Baum ohne Router-Context läuft (siehe
 * `MonitorScreenContent`-Kommentar). Ruft bewusst die volle `loadMancaveData`
 * auf statt eine eigene, schlankere Query zu pflegen — die paar zusätzlichen
 * DB-Abfragen (Badges, Wanderpokale, …) fallen bei einem seltenen,
 * User-ausgelösten Klick nicht ins Gewicht, dafür bleibt die Preis-/
 * Stufen-Logik an genau einer Stelle.
 */
export async function GET() {
  const guard = await requireMancaveAccess();
  if ("response" in guard) return guard.response;

  const data = await loadMancaveData(guard.userId, guard.role === "admin");
  return NextResponse.json({
    items: data.items,
    surfaceTier: data.surfaceTier,
    totalPoints: data.totalPoints,
    devFreeMode: data.devFreeMode,
  });
}
