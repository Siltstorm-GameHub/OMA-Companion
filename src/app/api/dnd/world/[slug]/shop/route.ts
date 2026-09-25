import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { cardAtLocation } from "@/lib/dnd/at-location";
import { getInventory, tradeItem } from "@/lib/dnd/rpg-server";

export const dynamic = "force-dynamic";

/** Händler: { actor, item, action: "buy" | "sell" }. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { slug } = await params;
  const at = await cardAtLocation(session.user.id, slug);
  if ("error" in at) return NextResponse.json({ error: at.error }, { status: at.status });

  const body = await req.json().catch(() => ({}));
  if ((body?.action !== "buy" && body?.action !== "sell") || typeof body?.actor !== "string" || typeof body?.item !== "string") return NextResponse.json({ error: "Ungültige Eingabe" }, { status: 400 });
  const r = await tradeItem(at.card, slug, body.actor, body.item, body.action);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ...r, inventory: await getInventory(at.card.id) });
}
