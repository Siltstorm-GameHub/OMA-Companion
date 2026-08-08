import { prisma } from "@/lib/prisma";
import { getBadgeDef } from "@/lib/badges";
import { badgeArt } from "@/lib/badge-art";
import { CATEGORY_CONFIG, GENRE_CONFIG, getScopeTitle } from "@/lib/wanderpocal";

const MAX_SHOWCASE_BADGES = 3;

export type OverlayShowcaseEntry = { icon: string; name: string; image: string | null };

/** Löst die vom User selbst gewählten Showcase-Abzeichen (max. 3) auf und hängt aktuell
 *  gehaltene Wanderpokale an — beides zusammen ist "das Abzeichen-Showcase" im Overlay.
 *  Custom-Abzeichen (`custom:<id>`) haben aktuell keine eigene Bild-Registry (siehe
 *  lib/badge-art.ts) — sie bekommen einen generischen Platzhalter statt eines zusätzlichen
 *  DB-Joins, das ist die Ausnahme, nicht die Regel (System-Abzeichen decken den Großteil ab). */
export async function resolveShowcaseEntries(userId: string, showcaseBadgesJson: string | null): Promise<OverlayShowcaseEntry[]> {
  let keys: string[] = [];
  try { keys = showcaseBadgesJson ? JSON.parse(showcaseBadgesJson) : []; } catch { /* ignore */ }

  const badges: OverlayShowcaseEntry[] = keys.slice(0, MAX_SHOWCASE_BADGES).map(key => {
    if (key.startsWith("custom:")) return { icon: "🏅", name: "Sonderabzeichen", image: badgeArt(key) };
    const def = getBadgeDef(key);
    return { icon: def?.icon ?? "🏅", name: def?.name ?? key, image: badgeArt(key) };
  });

  const trophies = await prisma.wanderpocalHolder.findMany({ where: { userId } }).catch(() => []);
  const trophyEntries: OverlayShowcaseEntry[] = trophies.map(t => {
    if (t.scopeType === "category") {
      const cfg = CATEGORY_CONFIG[t.scopeValue];
      return { icon: cfg?.emoji ?? "🏆", name: getScopeTitle(t.scopeType, t.scopeValue), image: null };
    }
    const cfg = GENRE_CONFIG[t.scopeValue];
    return { icon: "🏆", name: getScopeTitle(t.scopeType, t.scopeValue), image: cfg?.icon ?? null };
  });

  return [...badges, ...trophyEntries];
}
