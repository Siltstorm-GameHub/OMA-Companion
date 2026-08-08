import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFavoriteGames } from "@/lib/favorite-games";
import { resolveShowcaseEntries } from "@/lib/overlay-badges";
import { computeEventPoints, type StatConfig } from "@/lib/series-event-points";

export const dynamic = "force-dynamic";

// Serverless Functions laufen nicht beliebig lange — die Funktion beendet den Stream
// nach MAX_STREAM_MS von selbst, sauber statt per Timeout gekappt. Der Browser-`EventSource`
// reconnected danach automatisch, das ist Standardverhalten und für OBS unmerklich.
const MAX_STREAM_MS  = 4 * 60 * 1000;
const POLL_MS        = 1000;
const HEARTBEAT_MS   = 15000;

async function loadOverlayState(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      id: true, title: true, status: true, format: true, tournamentStatus: true, game: true, statFields: true,
      completionData: true,
      series: { select: { seriesStatConfig: true } },
      matches: {
        orderBy: [{ round: "asc" }, { position: "asc" }],
        select: {
          id: true, round: true, position: true, title: true,
          player1Id: true, player2Id: true, winnerId: true, score1: true, score2: true, playedAt: true,
          entries: { select: { id: true, userId: true, teamId: true, placement: true, score: true, statsJson: true } },
        },
      },
      participants: {
        select: { userId: true, user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
      },
      registrations: {
        where: { role: { not: "spectator" } },
        select: { userId: true, user: { select: { id: true, name: true, username: true, image: true, rankPoints: true } } },
      },
    },
  });
  if (!event) return null;

  // Nicht jedes Event legt TournamentParticipant-Zeilen an — Matches können auch auf User
  // verweisen, die nur über EventRegistration angemeldet sind (siehe tournament/[id]/page.tsx,
  // mergedParticipants). Ohne diesen Merge blieben deren Namen im Overlay ein "?".
  const seen = new Set(event.participants.map(p => p.userId));
  const mergedParticipants = [
    ...event.participants,
    ...event.registrations.filter(r => !seen.has(r.userId)),
  ];

  // Ligapunkte, die dieses Event je Spieler zur Eventreihe beisteuert — identische Berechnung
  // wie in der Gesamttabelle der Eventreihe (siehe tournament/[id]/page.tsx). Leer, solange das
  // Event keiner Reihe angehört oder die Spielphase noch nicht abgeschlossen ist (dann liefert
  // computeEventPoints selbst leere Maps zurück).
  let ligaPunkteByUser: Record<string, number> = {};
  if (event.series?.seriesStatConfig) {
    let cfg: StatConfig;
    try { cfg = JSON.parse(event.series.seriesStatConfig); } catch { cfg = { participationPoints: 0, stats: [] }; }
    const allRegistrations = await prisma.eventRegistration.findMany({ where: { eventId }, select: { userId: true } });
    ligaPunkteByUser = computeEventPoints(
      {
        completionData: event.completionData,
        registrations: allRegistrations,
        matches: event.matches.map(m => ({ entries: m.entries.map(e => ({ userId: e.userId, statsJson: e.statsJson })) })),
      },
      cfg,
    ).pointsByUser;
  }

  return {
    id: event.id, title: event.title, status: event.status, format: event.format,
    tournamentStatus: event.tournamentStatus, game: event.game, statFields: event.statFields,
    matches: event.matches, participants: mergedParticipants, ligaPunkteByUser,
  };
}

async function loadStreamer(streamerId: string) {
  const user = await prisma.user.findUnique({
    where: { id: streamerId },
    select: { id: true, name: true, username: true, image: true, rankPoints: true, twitchLogin: true, favoriteGamesJson: true, showcaseBadgesJson: true },
  });
  if (!user) return null;
  return {
    id: user.id, name: user.name, username: user.username, image: user.image, rankPoints: user.rankPoints, twitchLogin: user.twitchLogin,
    favoriteGames: parseFavoriteGames(user.favoriteGamesJson),
    badges: await resolveShowcaseEntries(user.id, user.showcaseBadgesJson),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  const streamerId = req.nextUrl.searchParams.get("streamer");
  if (!token) return new Response("Missing token", { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayToken: true } });
  if (!event?.overlayToken || event.overlayToken !== token) {
    return new Response("Invalid token", { status: 403 });
  }

  // Streamer-Profildaten ändern sich praktisch nie während eine Stream läuft (Lieblingsspiele/
  // Abzeichen-Showcase werden im Profil gepflegt, nicht live) — einmal pro Verbindung laden statt
  // bei jedem Poll-Tick erneut abzufragen.
  const streamer = streamerId ? await loadStreamer(streamerId).catch(() => null) : null;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const heartbeat = () => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: ping\n\n`));
      };

      let lastPayload = "";
      const poll = async () => {
        if (closed) return;
        try {
          const state = await loadOverlayState(eventId);
          if (!state) return;
          const payload = { ...state, streamer };
          const payloadStr = JSON.stringify(payload);
          if (payloadStr !== lastPayload) {
            lastPayload = payloadStr;
            send("update", payload);
          }
        } catch {
          // transienter DB-Fehler — beim nächsten Tick erneut versuchen
        }
      };

      await poll();
      const pollTimer = setInterval(poll, POLL_MS);
      const heartbeatTimer = setInterval(heartbeat, HEARTBEAT_MS);
      const closeTimer = setTimeout(() => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        controller.close();
      }, MAX_STREAM_MS);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(pollTimer);
        clearInterval(heartbeatTimer);
        clearTimeout(closeTimer);
        try { controller.close(); } catch { /* schon geschlossen */ }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
