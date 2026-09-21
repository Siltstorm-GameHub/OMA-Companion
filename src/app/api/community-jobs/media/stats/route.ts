import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getFotografStats } from "@/lib/fotograf-service";

export const dynamic = "force-dynamic";

/** Auswertung der eigenen Bilder/Clips (Daumen, Nutzung durch andere Jobs). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json(await getFotografStats(user.id));
}
