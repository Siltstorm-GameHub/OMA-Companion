import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getBuilderAccess, takenHexes } from "@/lib/dnd/custom-worlds";

export const dynamic = "force-dynamic";

/** Belegte Felder der Weltkarte (für die Feld-Auswahl im Editor). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  if (!(await getBuilderAccess(session.user.id)).allowed) return NextResponse.json({ error: "Keine Berechtigung" }, { status: 403 });
  return NextResponse.json({ taken: await takenHexes() });
}
