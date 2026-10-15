import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { buildUserExport } from "@/lib/account-deletion";

/** Datenauskunft: lädt alle zum eigenen Konto gespeicherten Daten als JSON-Datei herunter. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const data = await buildUserExport(session.user.id);
  if (!data) return NextResponse.json({ error: "User nicht gefunden" }, { status: 404 });

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="oma-daten-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
