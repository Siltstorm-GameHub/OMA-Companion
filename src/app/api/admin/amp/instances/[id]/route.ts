import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { getInstanceDetails } from "@/lib/amp";

// Liefert die von AMP zuverlässig bekannten Felder für eine Instanz (Name, Spiel, Port),
// damit das Admin-Formular sie per "Von AMP übernehmen"-Button vorausfüllen kann.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;

  try {
    const details = await getInstanceDetails(id);
    if (!details) return NextResponse.json({ error: "Instanz nicht gefunden" }, { status: 404 });
    return NextResponse.json(details);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AMP-Abfrage fehlgeschlagen" },
      { status: 502 }
    );
  }
}
