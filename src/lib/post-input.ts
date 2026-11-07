import type { PostMediaInput } from "./journalist-service";
import { parsePollInput } from "./post-poll";

/** Liest die Beitrags-Zusätze (Medien, Werbung, Anfragen) aus einem Request-Body — für POST und PATCH. */
export function parsePostExtras(body: Record<string, unknown>) {
  const str = (v: unknown) => (typeof v === "string" && v ? v : null);
  const opt = (key: string) => (body[key] === undefined ? undefined : str(body[key]));
  const media: PostMediaInput[] | undefined = Array.isArray(body.media)
    ? body.media
        .filter((m): m is Record<string, unknown> => !!m && typeof m === "object")
        .map(m => ({
          id: typeof m.id === "string" ? m.id : undefined,
          url: typeof m.url === "string" ? m.url : "",
          caption: typeof m.caption === "string" ? m.caption : null,
          type: typeof m.type === "string" ? m.type : null,
          clipStart: typeof m.clipStart === "number" ? m.clipStart : null,
          clipEnd: typeof m.clipEnd === "number" ? m.clipEnd : null,
          posterUrl: typeof m.posterUrl === "string" && m.posterUrl ? m.posterUrl : null,
        }))
    : undefined;
  return {
    media,
    albumId: opt("albumId"),
    template: opt("template"),
    campaignId: opt("campaignId"),
    trainingSessionId: opt("trainingSessionId"),
    photoRequestId: opt("photoRequestId"),
    // ISO-Zeitpunkt = einplanen, null = Planung aufheben, fehlt = unverändert
    scheduledAt: body.scheduledAt === undefined ? undefined
      : typeof body.scheduledAt === "string" && body.scheduledAt ? new Date(body.scheduledAt) : null,
    // Umfrage: Objekt = anlegen/ersetzen, null = entfernen, fehlt = unverändert
    poll: parsePollInput(body.poll),
  };
}
