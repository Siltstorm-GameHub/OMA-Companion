import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sanitizeTeConfig } from "@/lib/te-character";
import { newEventsFor } from "@/lib/dnd/world-events";
import { levelOf } from "@/lib/te-map/rpg";

export const dynamic = "force-dynamic";

/** Nach dieser Zeit ohne Meldung gilt ein Charakter als nicht mehr in der Welt. */
const ONLINE_MS = 12_000;
const MAX_OTHERS = 12;
const EMOTES = ["wave", "laugh", "cheer", "think", "heart", "sad"];
const EMOTE_MS = 4_000;

const parseSince = (v: unknown, fallbackMs: number): Date => {
  const d = typeof v === "string" ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) && d.getTime() > Date.now() - fallbackMs ? d : new Date(Date.now() - fallbackMs);
};

/**
 * Live-Anwesenheit: meldet Position + Blickrichtung des eigenen Charakters und liefert im selben Aufruf alle
 * anderen, die gerade (in den letzten ~12 s) in dieser Location aktiv waren. Body: { x, y, dir, emote?, chatSince?, eventsSince? } oder { leave: true }.
 * Die Antwort bringt außerdem neue Chat-Nachrichten und Spielleiter-Ereignisse (Zeitpunkte als ISO-Text) mit.
 * Nur wer an dieser Location angekommen ist, darf melden — die Position selbst ist Anzeige, keine Spiel-Logik.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { slug } = await params;

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  const card = user?.discordId
    ? await prisma.card.findUnique({
        where: { linkedDiscordId: user.discordId },
        select: { id: true, dndCreatedAt: true, travelToCol: true, currentLocation: { select: { slug: true } } },
      })
    : null;
  if (!card?.dndCreatedAt) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  if (body?.leave === true) {
    await prisma.dndPresence.deleteMany({ where: { cardId: card.id, locationSlug: slug } });
    return NextResponse.json({ ok: true });
  }
  if (card.travelToCol != null || card.currentLocation?.slug !== slug) return NextResponse.json({ error: "Du bist nicht an diesem Ort" }, { status: 403 });

  const x = Number(body?.x);
  const y = Number(body?.y);
  const dir = ["down", "left", "right", "up"].includes(body?.dir) ? (body.dir as string) : "down";
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x > 100 || y > 100) return NextResponse.json({ error: "Ungültige Position" }, { status: 400 });

  const scene = Number.isInteger(body?.scene) && body.scene >= -1 && body.scene < 50 ? (body.scene as number) : -1;
  const emote = typeof body?.emote === "string" && EMOTES.includes(body.emote) ? (body.emote as string) : null;
  await prisma.dndPresence.upsert({
    where: { cardId: card.id },
    create: { cardId: card.id, locationSlug: slug, x, y, dir, scene, ...(emote ? { emote, emoteAt: new Date() } : {}) },
    update: { locationSlug: slug, x, y, dir, scene, ...(emote ? { emote, emoteAt: new Date() } : {}) },
  });

  const since = new Date(Date.now() - ONLINE_MS);
  // Aufräumen: alte Zeilen dieser Location (billig, kein Cron nötig)
  if (Math.random() < 0.05) await prisma.dndPresence.deleteMany({ where: { locationSlug: slug, updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } } });

  const rows = await prisma.dndPresence.findMany({
    where: { locationSlug: slug, updatedAt: { gte: since }, cardId: { not: card.id } },
    orderBy: { updatedAt: "desc" },
    take: MAX_OTHERS,
  });
  const chatSince = parseSince(body?.chatSince, 5 * 60_000);
  const [chat, hiddenRows, events] = await Promise.all([
    prisma.dndChatMessage.findMany({ where: { locationSlug: slug, createdAt: { gt: chatSince }, hidden: false }, orderBy: { createdAt: "asc" }, take: 30 }),
    prisma.dndChatMessage.findMany({ where: { locationSlug: slug, hidden: true, hiddenAt: { gt: new Date(Date.now() - 10 * 60_000) } }, select: { id: true }, take: 50 }),
    newEventsFor(slug, parseSince(body?.eventsSince, 10 * 60_000)),
  ]);
  const reportCounts = chat.length ? await prisma.dndChatReport.groupBy({ by: ["messageId"], where: { messageId: { in: chat.map((m) => m.id) } }, _count: { _all: true } }) : [];
  const reports = new Map(reportCounts.map((r) => [r.messageId, r._count._all]));
  const chatOut = chat.map((m) => ({ id: m.id, cardId: m.cardId, name: m.name, text: m.text, createdAt: m.createdAt.toISOString(), reports: reports.get(m.id) ?? 0 }));
  const hiddenChat = hiddenRows.map((h) => h.id);
  if (!rows.length) return NextResponse.json({ others: [], chat: chatOut, hiddenChat, events });

  const cards = await prisma.card.findMany({
    where: { id: { in: rows.map((r) => r.cardId) } },
    select: { id: true, name: true, teCharacter: true, linkedDiscordId: true, dndXp: true },
  });
  const discordIds = cards.map((c) => c.linkedDiscordId).filter((v): v is string => !!v);
  const users = discordIds.length ? await prisma.user.findMany({ where: { discordId: { in: discordIds } }, select: { discordId: true, image: true } }) : [];
  const avatarByDiscord = new Map(users.map((u) => [u.discordId!, u.image]));
  const cardById = new Map(cards.map((c) => [c.id, c]));

  return NextResponse.json({
    others: rows.flatMap((r) => {
      const c = cardById.get(r.cardId);
      const character = sanitizeTeConfig(c?.teCharacter);
      const emoteLive = r.emote && r.emoteAt && Date.now() - r.emoteAt.getTime() < EMOTE_MS ? r.emote : null;
      return c && character ? [{ id: r.cardId, name: c.name, x: r.x, y: r.y, dir: r.dir, scene: r.scene, level: levelOf(c.dndXp), character, emote: emoteLive, avatarUrl: c.linkedDiscordId ? avatarByDiscord.get(c.linkedDiscordId) ?? null : null }] : [];
    }),
    chat: chatOut,
    hiddenChat,
    events,
  });
}
