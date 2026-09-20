import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { buildRecap } from "@/lib/journalist-service";

export const dynamic = "force-dynamic";

/** GET ?period=week|month — Vorlage für einen Wochen-/Monatsrückblick aus den Daten der Community. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const period = new URL(req.url).searchParams.get("period");
  if (period !== "week" && period !== "month") return NextResponse.json({ error: "period muss week oder month sein" }, { status: 400 });
  return NextResponse.json(await buildRecap(period));
}
