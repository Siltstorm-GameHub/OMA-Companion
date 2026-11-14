import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { sanitizeGameVoteConfig } from "@/lib/game-vote/rules";
import { createGameVote } from "@/lib/game-vote/service";
import { refreshEventAnnouncement } from "@/lib/discord-events";

/** PATCH — Spielwahl-Einstellungen der Reihe speichern (Admins/Mods). Body: GameVoteConfig (lib/game-vote/rules.ts) */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const cfg = sanitizeGameVoteConfig(await req.json().catch(() => ({})));
  const series = await prisma.eventSeries.findUnique({ where: { id }, select: { id: true } });
  if (!series) return NextResponse.json({ error: "Eventreihe nicht gefunden" }, { status: 404 });
  await prisma.eventSeries.update({ where: { id }, data: { gameVoteJson: JSON.stringify(cfg) } });
  return NextResponse.json({ ok: true, config: cfg });
}

/**
 * POST { eventId } — Spielwahl für einen schon angelegten, kommenden Termin der Reihe starten
 * (z.B. nach dem Einschalten). Ein bereits eingetragenes Spiel wird zum Platzhalter.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id } = await params;
  const body = await req.json().catch(() => ({})) as { eventId?: unknown };
  if (typeof body.eventId !== "string") return NextResponse.json({ error: "Termin fehlt" }, { status: 400 });
  const event = await prisma.event.findUnique({ where: { id: body.eventId }, select: { seriesId: true, _count: { select: { matches: true } } } });
  if (!event || event.seriesId !== id) return NextResponse.json({ error: "Termin gehört nicht zu dieser Reihe" }, { status: 400 });
  if (event._count.matches > 0) return NextResponse.json({ error: "Der Termin ist schon ausgelost" }, { status: 409 });
  const result = await createGameVote(body.eventId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  await prisma.event.update({ where: { id: body.eventId }, data: { game: null } });
  await refreshEventAnnouncement(body.eventId).catch(() => {});
  return NextResponse.json({ ok: true, shortened: result.shortened });
}
