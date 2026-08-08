import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

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
      id: true, title: true, status: true, format: true, tournamentStatus: true, game: true,
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

  return {
    id: event.id, title: event.title, status: event.status, format: event.format,
    tournamentStatus: event.tournamentStatus, game: event.game,
    matches: event.matches, participants: mergedParticipants,
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: eventId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayToken: true } });
  if (!event?.overlayToken || event.overlayToken !== token) {
    return new Response("Invalid token", { status: 403 });
  }

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
          const payload = JSON.stringify(state);
          if (payload !== lastPayload) {
            lastPayload = payload;
            send("update", state);
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
