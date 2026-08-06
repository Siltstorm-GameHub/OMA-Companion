import { generateDefaultCoverBuffer } from "@/lib/default-cover";

/**
 * Liefert das Standard-Event-Cover als echtes JPEG unter einer öffentlichen
 * URL — für Discord-Nachrichten-Embeds (image.url), die anders als die
 * Scheduled-Events-API keine data:-URIs akzeptieren, nur echte HTTP-URLs.
 *
 * Bewusst kein dynamischer Inhalt: dieselbe Grafik wie im Scheduled-Event-
 * Fallback (generateDefaultCoverDataUri), nur als abrufbare Datei statt als
 * eingebettetes Base64. Lange Cache-Lebensdauer, weil sich die Grafik nur mit
 * einem neuen Deploy ändert.
 */
export async function GET() {
  const buffer = await generateDefaultCoverBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
