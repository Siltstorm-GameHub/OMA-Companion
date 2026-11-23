/**
 * Kleiner In-Memory-Cache pro Server-Instanz (Vercel Fluid Compute verwendet Instanzen für viele
 * Requests wieder). Gedacht für GLOBALE, nicht nutzerbezogene Werte, die auf viel besuchten Seiten
 * bei jedem Render erneut aus der DB kämen — jede Prisma-Abfrage kostet "Active CPU".
 *
 * Anders als unstable_cache: kein Data-Cache-Lesezugriff pro Request und keine JSON-Serialisierung
 * (Date bleibt Date). Dafür pro Instanz getrennt — nach Ablauf von `ttlMs` sieht jede Instanz den
 * neuen Stand. Nur für Werte verwenden, bei denen diese Verzögerung egal ist.
 *
 * Gleichzeitige Aufrufe teilen sich eine laufende Abfrage; Fehler werden nicht gecacht.
 */
const store = new Map<string, { expires: number; value: Promise<unknown> }>();

export function cachedInMemory<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as Promise<T>;

  const value = load();
  store.set(key, { expires: now + ttlMs, value });
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}
