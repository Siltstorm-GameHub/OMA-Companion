import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { composeHeroImageBuffer } from "@/lib/hero-builder/compose";

/**
 * Liefert das serverseitig zusammengesetzte Helden-Bild (Basis-Pose +
 * ausgerüstete Accessoires, geflacht) als echtes PNG -- das Gegenstück zur
 * Live-CSS-Vorschau, für alles, was eine tatsächliche Bilddatei braucht
 * (z.B. später Card.imageUrl). Query-Parameter: basePoseId (Pflicht), plus
 * ein Parameter je Slot-Kategorie, z.B. ?weapon=<accessoryId>.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });

  const basePoseId = req.nextUrl.searchParams.get("basePoseId");
  if (!basePoseId) return NextResponse.json({ error: "basePoseId ist Pflicht" }, { status: 400 });

  const equipment: Record<string, string> = {};
  for (const [key, value] of req.nextUrl.searchParams.entries()) {
    if (key === "basePoseId" || !value) continue;
    equipment[key] = value;
  }

  try {
    const buffer = await composeHeroImageBuffer(basePoseId, equipment);
    return new Response(new Uint8Array(buffer), {
      headers: { "Content-Type": "image/png", "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("[hero-builder/compose] fehlgeschlagen:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Zusammensetzen fehlgeschlagen" }, { status: 500 });
  }
}
