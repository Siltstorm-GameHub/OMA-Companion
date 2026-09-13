/**
 * Store-ID für Vercel Blob auflösen.
 *
 * Der SDK liest ausschliesslich `BLOB_STORE_ID`. Vercel stellt den
 * Store-Variablen beim Verbinden aber ein frei wählbares Präfix voran — heißt
 * das Präfix z.B. "BLOB_READ_WRITE_TOKEN", landet die ID in
 * `BLOB_READ_WRITE_TOKEN_STORE_ID` und der SDK findet sie nicht. Darum suchen
 * wir selbst und übergeben sie explizit an put()/list()/del().
 *
 * Geteilt zwischen /api/upload (Bild-Upload) und dem Clip-Cleanup-Cronjob —
 * beide sprechen denselben Blob-Store an.
 */
export function resolveStoreId(): string | undefined {
  const direct = process.env.BLOB_STORE_ID?.trim();
  if (direct) return direct;

  // Beliebiges Präfix: die erste Variable nehmen, die auf _STORE_ID endet und
  // zum Blob-Store gehört.
  for (const [key, value] of Object.entries(process.env)) {
    if (key.endsWith("_STORE_ID") && key.includes("BLOB") && value?.trim()) {
      return value.trim();
    }
  }
  return undefined;
}
