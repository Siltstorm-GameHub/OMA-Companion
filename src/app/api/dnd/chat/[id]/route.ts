import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasMinRole } from "@/lib/roles";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { notifyAdmins } from "@/lib/dnd/custom-worlds";

export const dynamic = "force-dynamic";

const MUTE_OPTIONS = [60, 1440, 10080]; // 1 Std., 24 Std., 7 Tage

/**
 * Chat-Moderation einer Nachricht.
 *  - { action: "report" }: jeder Spieler kann melden (je Nachricht einmal); Admins bekommen eine Nachricht.
 *  - { action: "delete" }: Moderatoren/Admins blenden die Nachricht für alle aus.
 *  - { action: "mute", minutes }: Moderatoren/Admins schalten den Verfasser stumm (1 Std./24 Std./7 Tage) und blenden die Nachricht aus.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const { id } = await params;
  const msg = await prisma.dndChatMessage.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: "Nachricht nicht gefunden" }, { status: 404 });
  const body = await req.json().catch(() => ({}));

  if (body?.action === "report") {
    const card = await getMyDndCard(session.user.id);
    if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
    if (msg.cardId === card.id) return NextResponse.json({ error: "Eigene Nachrichten kannst du nicht melden." }, { status: 400 });
    const existing = await prisma.dndChatReport.findUnique({ where: { messageId_reporterCardId: { messageId: id, reporterCardId: card.id } } });
    if (existing) return NextResponse.json({ error: "Du hast diese Nachricht schon gemeldet." }, { status: 400 });
    await prisma.dndChatReport.create({ data: { messageId: id, reporterCardId: card.id } });
    const count = await prisma.dndChatReport.count({ where: { messageId: id } });
    // Bei der ersten und bei jeder dritten Meldung die Admins informieren (nicht bei jeder einzelnen)
    if (count === 1 || count % 3 === 0) {
      await notifyAdmins(session.user.id, "Chat-Meldung in OMA Quest", `„${msg.text.slice(0, 120)}“ von ${msg.name} wurde ${count}× gemeldet.`, "/oma-quest");
    }
    return NextResponse.json({ ok: true, reports: count });
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true, username: true, name: true } });
  if (!me || !hasMinRole(me.role, "moderator")) return NextResponse.json({ error: "Nur Moderatoren dürfen das." }, { status: 403 });

  if (body?.action === "delete" || body?.action === "mute") {
    await prisma.dndChatMessage.update({ where: { id }, data: { hidden: true, hiddenAt: new Date() } });
    if (body.action === "mute") {
      const minutes = MUTE_OPTIONS.includes(body?.minutes) ? (body.minutes as number) : 60;
      await prisma.dndChatMute.upsert({
        where: { cardId: msg.cardId },
        create: { cardId: msg.cardId, until: new Date(Date.now() + minutes * 60_000), reason: msg.text.slice(0, 200), byName: me.username ?? me.name ?? "Moderator" },
        update: { until: new Date(Date.now() + minutes * 60_000), reason: msg.text.slice(0, 200), byName: me.username ?? me.name ?? "Moderator" },
      });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
}
