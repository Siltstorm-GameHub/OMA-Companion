// ============================================
// POST /api/blocks/match-result — Versus-Ergebnis vom Multiplayer-Server
// ============================================
// Nur der Multiplayer-Server (src/blocks-server) ruft das auf: der Body ist mit BLOCKS_MP_SECRET
// signiert (Header x-blocks-signature = HMAC-SHA256 über den Roh-Body). Doppelte Meldungen derselben
// Runde werden über den Unique-Index (roomCode, round, startedAt) ignoriert. Turnier-Runden tragen
// zusätzlich Event/Phase/Gruppe und können die nächste Turnierphase auslösen (lib/blocks/tournament.ts).

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hmac, safeEqual, SIGNATURE_HEADER } from "@/lib/blocks/mp-token";
import { seasonKey } from "@/lib/month-season";
import { advanceTournament } from "@/lib/blocks/tournament";

export const runtime = "nodejs";

const schema = z.object({
  roomCode: z.string().min(1).max(16),
  round: z.number().int().min(1),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  placements: z.array(z.object({ userId: z.string().min(1), place: z.number().int().min(1) })).min(2).max(16),
  tournament: z.object({ ev: z.string().min(1), st: z.enum(["group", "final"]), g: z.number().int().min(0) }).optional(),
});

export async function POST(req: Request) {
  const secret = process.env.BLOCKS_MP_SECRET;
  if (!secret) return Response.json({ error: "Nicht eingerichtet." }, { status: 503 });

  const raw = await req.text();
  const sig = req.headers.get(SIGNATURE_HEADER) ?? "";
  if (!safeEqual(sig, hmac(secret, raw))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let data: z.infer<typeof schema>;
  try {
    data = schema.parse(JSON.parse(raw));
  } catch {
    return Response.json({ error: "Ungültige Daten." }, { status: 400 });
  }

  // Nur bekannte Nutzer übernehmen (Tokens stammen von uns, aber Konten können inzwischen gelöscht sein).
  const known = new Set(
    (await prisma.user.findMany({ where: { id: { in: data.placements.map((p) => p.userId) } }, select: { id: true } })).map((u) => u.id),
  );
  const placements = data.placements.filter((p) => known.has(p.userId));
  if (placements.length < 2) return Response.json({ ok: true, skipped: true });

  const endedAt = new Date(data.endedAt);
  try {
    await prisma.blocksMatch.create({
      data: {
        roomCode: data.roomCode,
        round: data.round,
        season: seasonKey(endedAt),
        startedAt: new Date(data.startedAt),
        endedAt,
        winnerId: placements.find((p) => p.place === 1)?.userId ?? null,
        ...(data.tournament && { eventId: data.tournament.ev, stage: data.tournament.st, groupNo: data.tournament.g }),
        players: { create: placements.map((p) => ({ userId: p.userId, place: p.place })) },
      },
    });
  } catch {
    return Response.json({ ok: true, duplicate: true });
  }
  if (data.tournament) await advanceTournament(data.tournament.ev);
  return Response.json({ ok: true });
}
