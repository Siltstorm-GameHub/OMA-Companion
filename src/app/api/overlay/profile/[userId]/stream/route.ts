import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFavoriteGames } from "@/lib/favorite-games";
import { getGameCoverUrl } from "@/lib/game-cover";
import { getJobBadges } from "@/lib/community-job-service";

export const dynamic = "force-dynamic";

// Serverless Functions laufen nicht beliebig lange — die Funktion beendet den Stream nach
// MAX_STREAM_MS von selbst, sauber statt per Timeout gekappt. Der Browser-`EventSource`
// reconnected danach automatisch (Standardverhalten), für OBS unmerklich.
const MAX_STREAM_MS = 4 * 60 * 1000;
const POLL_MS       = 2000; // Profildaten ändern sich seltener als Turnier-Matches, 2s reicht
const HEARTBEAT_MS  = 15000;

async function loadProfileOverlayState(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, username: true, image: true, rankPoints: true, twitchLogin: true,
      favoriteGamesJson: true,
    },
  });
  if (!user) return null;

  const upcomingEvents = await prisma.event.findMany({
    where: { startAt: { gt: new Date() }, status: { notIn: ["finished", "closed"] }, hidden: false },
    orderBy: { startAt: "asc" },
    take: 3,
    select: { id: true, title: true, startAt: true, game: true, coverImageUrl: true },
  });

  const badge = (await getJobBadges([user.id]))[user.id] ?? null;

  return {
    id: user.id, name: user.name, username: user.username, image: user.image, twitchLogin: user.twitchLogin,
    rankPoints: user.rankPoints,
    badge,
    rankLabel: `${user.rankPoints.toLocaleString("de-DE")} Punkte`,
    favoriteGames: parseFavoriteGames(user.favoriteGamesJson),
    upcomingEvents: upcomingEvents.map(e => ({
      id: e.id, title: e.title, startAt: e.startAt, game: e.game,
      coverUrl: e.coverImageUrl ?? getGameCoverUrl(e.game),
    })),
  };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const token = req.nextUrl.searchParams.get("token");
  if (!token) return new Response("Missing token", { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { overlayToken: true } });
  if (!user?.overlayToken || user.overlayToken !== token) {
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
          const state = await loadProfileOverlayState(userId);
          if (!state) return;
          const payloadStr = JSON.stringify(state);
          if (payloadStr !== lastPayload) {
            lastPayload = payloadStr;
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
