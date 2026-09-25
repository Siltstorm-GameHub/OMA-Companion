import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { prisma } from "@/lib/prisma";
import { actInCombat, beginCombat, closeCombat, getCombatView } from "@/lib/dnd/combat-server";
import { isCombatAction } from "@/lib/dnd/combat";

export const dynamic = "force-dynamic";

async function me() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  const card = await getMyDndCard(session.user.id);
  if (!card) return { error: NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 }) } as const;
  return { card } as const;
}

/** Kampfansicht: laufender Kampf, passende Begegnungen im aktuellen Gelände, Held-Werte. */
export async function GET() {
  const m = await me();
  if ("error" in m) return m.error;
  return NextResponse.json(await getCombatView(m.card));
}

/** { action: "start", monster } · { action: "act", act: attack|ability|defend|flee|end } · { action: "close" } */
export async function POST(req: NextRequest) {
  const m = await me();
  if ("error" in m) return m.error;
  const body = await req.json().catch(() => ({}));
  const source = typeof body?.slug === "string" && typeof body?.actor === "string" ? { slug: body.slug, actor: body.actor } : undefined;
  const r = body?.action === "start" && typeof body.monster === "string" ? await beginCombat(m.card, body.monster, source)
    : body?.action === "act" && isCombatAction(body.act) ? await actInCombat(m.card, body.act)
    : body?.action === "close" ? await closeCombat(m.card)
    : { error: "Ungültige Aktion" };
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  const fresh = await prisma.card.findUniqueOrThrow({ where: { id: m.card.id } });
  return NextResponse.json(await getCombatView(fresh));
}
