import { NextRequest, NextResponse } from "next/server";
import { getUserLooks } from "@/lib/cosmetics/service";

export const dynamic = "force-dynamic";

/**
 * GET ?ids=a,b,c (max. 100) — sichtbare Kosmetik (Rahmen, Aura, Namensfarbe, Titel) vieler User auf
 * einmal. Die Anfragen aller Avatare einer Seite bündelt useUserLook. Antwort: { [userId]: UserLook }.
 *
 * Bewusst ohne Login: die OBS-Overlays laufen ohne Session und sollen gekaufte Rahmen trotzdem
 * zeigen. Geliefert werden nur Artikel-IDs der ausgerüsteten Kosmetik — nichts Persönliches.
 */
export async function GET(req: NextRequest) {
  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 100);
  return NextResponse.json(await getUserLooks(ids), {
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
