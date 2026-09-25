import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { getPartyOf } from "@/lib/dnd/party";

export const dynamic = "force-dynamic";

const MAX_LEN = 200;
const MIN_GAP_MS = 1500;
const chan = (partyId: string) => `party:${partyId}`;

async function me() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  const card = await getMyDndCard(session.user.id);
  if (!card) return { error: NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 }) } as const;
  const party = await getPartyOf(card.id);
  if (!party) return { error: NextResponse.json({ error: "Du bist in keiner Gruppe." }, { status: 400 }) } as const;
  return { card, party } as const;
}

/** Gruppen-Chat (nur Mitglieder, egal wo sie sind): die letzten Nachrichten. */
export async function GET() {
  const m = await me();
  if ("error" in m) return m.error;
  const rows = await prisma.dndChatMessage.findMany({ where: { locationSlug: chan(m.party.id), hidden: false }, orderBy: { createdAt: "desc" }, take: 40 });
  return NextResponse.json({ messages: rows.reverse().map((r) => ({ id: r.id, cardId: r.cardId, name: r.name, text: r.text, at: r.createdAt.toISOString() })) });
}

export async function POST(req: NextRequest) {
  const m = await me();
  if ("error" in m) return m.error;
  const body = await req.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, MAX_LEN) : "";
  if (!text) return NextResponse.json({ error: "Leere Nachricht" }, { status: 400 });
  const mute = await prisma.dndChatMute.findUnique({ where: { cardId: m.card.id } });
  if (mute && mute.until > new Date()) return NextResponse.json({ error: "Du bist im Chat stummgeschaltet." }, { status: 403 });
  if (/https?:\/\/|www\.|discord\.gg|\.(com|de|net|org|gg)\b/i.test(text)) return NextResponse.json({ error: "Links und Einladungen sind im Chat nicht erlaubt." }, { status: 400 });
  const last = await prisma.dndChatMessage.findFirst({ where: { cardId: m.card.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
  if (last && Date.now() - last.createdAt.getTime() < MIN_GAP_MS) return NextResponse.json({ error: "Nicht so schnell." }, { status: 429 });
  await prisma.dndChatMessage.create({ data: { locationSlug: chan(m.party.id), cardId: m.card.id, name: m.card.name, text } });
  return NextResponse.json({ ok: true });
}
