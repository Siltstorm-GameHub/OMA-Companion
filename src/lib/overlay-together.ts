import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/brand";
import { createCache } from "@/lib/overlay-state";
import { MAX_WATCH_CHANNELS, memberSelect, resolveEventWatch, toMembers, type WatchMember } from "@/lib/watch-together";
import { SESSION_MAX_AGE_MS } from "@/lib/watch-session-rules";
import type { OverlayTogether, StreamerOverlayPayload } from "@/components/overlay/types";

/**
 * "Zusammen ansehen" im OBS-Overlay: Mit wem streamt dieser Streamer gerade gemeinsam? Vorrang hat
 * eine bestätigte Einladungs-Session (Live-Steuerung), sonst die live streamenden Mitspieler bzw.
 * Streamer des Events im Turniermodus. Eigenes Modul statt in overlay-state, weil
 * watch-together seinerseits overlay-state nutzt (kein Import-Kreis).
 */

const TOGETHER_TTL_MS = 20_000;
const cache = createCache<OverlayTogether | null>();

/** Anzeige-Host ohne Protokoll und "www." — so kurz, dass Zuschauer ihn abtippen können. */
function displayHost(): string {
  try { return new URL(appBaseUrl()).host.replace(/^www\./, ""); } catch { return "oma-app.de"; }
}

const toChannel = (m: WatchMember) => ({ login: m.twitchLogin, name: m.name });

export function getOverlayTogether(userId: string, eventId: string | null): Promise<OverlayTogether | null> {
  return cache.get(`${userId}:${eventId ?? ""}`, TOGETHER_TTL_MS, () => loadTogether(userId, eventId));
}

async function loadTogether(userId: string, eventId: string | null): Promise<OverlayTogether | null> {
  const session = await prisma.watchSession.findFirst({
    where: {
      endedAt: null, createdAt: { gte: new Date(Date.now() - SESSION_MAX_AGE_MS) },
      members: { some: { userId, status: "accepted" } },
    },
    orderBy: { createdAt: "desc" },
    include: { members: { where: { status: "accepted" }, select: { userId: true } } },
  });

  if (session) {
    const users = await prisma.user.findMany({ where: { id: { in: session.members.map(m => m.userId) }, leftServerAt: null }, select: memberSelect });
    const members = await toMembers(users);
    const self = members.filter(m => m.userId === userId);
    const others = members.filter(m => m.userId !== userId);
    return {
      partners: others.filter(m => m.live).map(m => m.name),
      channels: [...self, ...others].map(toChannel),
      link: `${displayHost()}/z/${session.slug}`,
    };
  }

  if (!eventId) return null;
  const watch = await resolveEventWatch(eventId).catch(() => null);
  if (!watch) return null;
  const others = watch.members.filter(m => m.live && m.userId !== userId).slice(0, MAX_WATCH_CHANNELS - 1);
  if (!others.length) return null;
  const self = watch.members.filter(m => m.userId === userId);
  return {
    partners: others.map(m => m.name),
    channels: [...self, ...others].map(toChannel),
    // Die Event-Ansicht steht in der Übersicht ganz oben — der kurze Pfad reicht zum Abtippen.
    link: `${displayHost()}/zusammen`,
  };
}

/** Ergänzt die Streamer-Payload um "Zusammen ansehen" (nicht in der Layout-Vorschau). */
export async function withTogether(payload: StreamerOverlayPayload, userId: string, preview: boolean): Promise<StreamerOverlayPayload> {
  if (preview) return payload;
  const eventId = payload.mode === "event" ? payload.eventId : null;
  const together = await getOverlayTogether(userId, eventId).catch(() => null);
  return { ...payload, together };
}
