import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { syncGameServersWithAmp } from "@/lib/gameservers";

// Gleicht die Server-Liste mit AMP ab: deaktiviert Server, deren AMP-Instanz verschwunden
// ist, und liefert neue AMP-Instanzen ohne verknüpften Server als Vorschläge zurück.
export async function POST() {
  await requireRole("moderator");

  try {
    const result = await syncGameServersWithAmp();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AMP-Abgleich fehlgeschlagen" },
      { status: 502 }
    );
  }
}
