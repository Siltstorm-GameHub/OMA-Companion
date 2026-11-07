import type { PostMediaInput } from "./journalist-service";

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
        }))
    : undefined;
  return {
    media,
    albumId: opt("albumId"),
    template: opt("template"),
    campaignId: opt("campaignId"),
    trainingSessionId: opt("trainingSessionId"),
    photoRequestId: opt("photoRequestId"),
  };
}
