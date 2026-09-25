import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { cardAtLocation } from "@/lib/dnd/at-location";

export const dynamic = "force-dynamic";

const MAX_LEN = 200;
const MIN_GAP_MS = 1500;

/** Nachricht in die Location sprechen (Sprechblase + Verlauf). Höchstens eine alle 1,5 s, 200 Zeichen. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { slug } = await params;
  const at = await cardAtLocation(session.user.id, slug);
  if ("error" in at) return NextResponse.json({ error: at.error }, { status: at.status });

  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_LEN) : "";
  if (!text) return NextResponse.json({ error: "Leere Nachricht" }, { status: 400 });

  const last = await prisma.dndChatMessage.findFirst({ where: { cardId: at.card.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (last && Date.now() - last.createdAt.getTime() < MIN_GAP_MS) return NextResponse.json({ error: "Nicht so schnell." }, { status: 429 });

  await prisma.dndChatMessage.create({ data: { locationSlug: slug, cardId: at.card.id, name: at.card.name, text } });
  // Alten Verlauf gelegentlich wegräumen
  if (Math.random() < 0.05) await prisma.dndChatMessage.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600_000) } } });
  return NextResponse.json({ ok: true });
}
