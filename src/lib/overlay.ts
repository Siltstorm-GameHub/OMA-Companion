import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { appBaseUrl } from "@/lib/brand";

/** Liest den Overlay-Token eines Events, legt bei Bedarf einen neuen an
 *  (ein Token pro Event, gemeinsam für alle angemeldeten Streamer). */
export async function ensureOverlayToken(eventId: string): Promise<string> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { overlayToken: true } });
  if (event?.overlayToken) return event.overlayToken;

  const token = randomBytes(24).toString("base64url");
  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { overlayToken: token },
    select: { overlayToken: true },
  });
  return updated.overlayToken!;
}

export function buildOverlayUrl(eventId: string, token: string): string {
  return `${appBaseUrl()}/overlay/${eventId}?token=${token}`;
}

/** Konfigurationsseite, auf der der Streamer die angezeigten Panels auswählt und
 *  sich den fertigen OBS-Link zusammenstellt — statt direkt den rohen Overlay-Link. */
export function buildOverlaySettingsUrl(eventId: string, token: string): string {
  return `${appBaseUrl()}/overlay/${eventId}/settings?token=${token}`;
}
