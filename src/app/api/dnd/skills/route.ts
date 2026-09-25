import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { getDndClass } from "@/lib/dnd/classes";
import { getSkillView, unlockSkill } from "@/lib/dnd/skills-server";

export const dynamic = "force-dynamic";

async function me() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  const card = await getMyDndCard(session.user.id);
  if (!card) return { error: NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 }) } as const;
  return { card } as const;
}

const view = (card: Parameters<typeof getSkillView>[0]) => getSkillView(card, getDndClass(card.dndClass ?? "krieger")?.name ?? "Krieger");

/** Fähigkeitsbaum der Klasse mit gelernten Talenten und Talentpunkten. */
export async function GET() {
  const m = await me();
  if ("error" in m) return m.error;
  return NextResponse.json(view(m.card));
}

/** { id } schaltet ein Talent frei. */
export async function POST(req: NextRequest) {
  const m = await me();
  if ("error" in m) return m.error;
  const body = await req.json().catch(() => ({}));
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  const r = await unlockSkill(m.card, body.id);
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(view(await prisma.card.findUniqueOrThrow({ where: { id: m.card.id } })));
}
