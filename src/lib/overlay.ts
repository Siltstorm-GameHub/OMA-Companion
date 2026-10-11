import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/brand";
import { defaultEventLayout, serializeLayoutParam } from "@/components/overlay/layout";

const newToken = () => randomBytes(24).toString("base64url");

/** Liest den Overlay-Token eines Events, legt bei Bedarf einen neuen an
 *  (ein Token pro Event, gemeinsam für alle Overlay-Links dieses Events). */
export async function ensureOverlayToken(eventId: string): Promise<string> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayToken: true } });
  if (event?.overlayToken) return event.overlayToken;

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { overlayToken: newToken() },
    select: { overlayToken: true },
  });
  return updated.overlayToken!;
}

/** Generischer Event-Link mit Standard-Layout (alle fürs Format relevanten Elemente) — z.B. der
 *  vom Turnier-Widget gezogene Link für ein Stream-Setup ohne eigenen Streamer-Account. */
export function buildOverlayUrl(eventId: string, token: string, format: string | null = null, hasSeries: boolean = false): string {
  const layout = serializeLayoutParam(defaultEventLayout(format, hasSeries).elements);
  return `${appBaseUrl()}/overlay/${eventId}?token=${token}&layout=${encodeURIComponent(layout)}`;
}

/** Liest den persönlichen Overlay-Token eines Users, legt bei Bedarf einen neuen an. Grundlage
 *  für den festen Streamer-Link und ältere Profil-Links. Nur User mit gesetztem twitchLogin
 *  bekommen den Link angeboten (siehe api/profile/overlay). */
export async function ensureUserOverlayToken(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { overlayToken: true } });
  if (user?.overlayToken) return user.overlayToken;
  return regenerateUserOverlayToken(userId);
}

/** Neuer Token → alle bisherigen Links dieses Users (Streamer- und Profil-Link) werden ungültig,
 *  offene Streamer-Streams beenden sich binnen weniger Sekunden. */
export async function regenerateUserOverlayToken(userId: string): Promise<string> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { overlayToken: newToken() },
    select: { overlayToken: true },
  });
  return updated.overlayToken!;
}

/** Der feste Streamer-Link: EIN Link für OBS, zeigt automatisch das gerade gestreamte Event,
 *  sonst das Profil-Overlay (siehe app/(overlay)/overlay/streamer/[userId]). */
export function buildStreamerOverlayUrl(userId: string, token: string): string {
  return `${appBaseUrl()}/overlay/streamer/${userId}?token=${token}`;
}

export { STREAMER_OVERLAY_SETTINGS_PATH } from "@/components/overlay/types";
