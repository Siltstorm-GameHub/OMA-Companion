import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { companionView, equipCompanion } from "@/lib/dnd/companion-server";

export const dynamic = "force-dynamic";

async function me() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return getMyDndCard(session.user.id);
}

/** Gezähmte Begleiter und der ausgerüstete. */
export async function GET() {
  const card = await me();
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  return NextResponse.json(companionView(card));
}

/** { equip: "<Monster-Id>" | null } rüstet einen Begleiter aus (oder keinen). */
export async function POST(req: NextRequest) {
  const card = await me();
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  const body = await req.json().catch(() => ({}));
  if (!("equip" in body) || !(body.equip === null || typeof body.equip === "string")) return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const r = await equipCompanion(card, body.equip);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  const fresh = await prisma.card.findUniqueOrThrow({ where: { id: card.id } });
  return NextResponse.json(companionView(fresh));
}
