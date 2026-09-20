import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { listMySeries, createSeries } from "@/lib/journalist-service";

export const dynamic = "force-dynamic";

/** Eigene Berichtsreihen. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  return NextResponse.json({ series: await listMySeries(user.id) });
}

/** POST { title } — neue Reihe anlegen. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const { title } = await req.json().catch(() => ({}));
  if (typeof title !== "string") return NextResponse.json({ error: "Titel erforderlich" }, { status: 400 });

  const result = await createSeries(user.id, title);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
