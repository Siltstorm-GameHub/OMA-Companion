/**
 * Namens-Normalisierung der Spieleliste — client-sicher.
 *
 * `gameNameKey` erkennt Dubletten ("Counter-Strike 2" = "counter strike 2" = "Counter‑Strike™ 2"),
 * lässt Jahreszahlen/Nummern aber stehen, damit "FIFA 23" und "FIFA 24" verschiedene Spiele bleiben.
 * `gameSlug` baut daraus die URL (/spiele/counter-strike-2).
 */

const UMLAUTS: Record<string, string> = { ä: "ae", ö: "oe", ü: "ue", ß: "ss" };

function baseNormalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[äöüß]/g, ch => UMLAUTS[ch])
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // Akzente (é → e)
    .replace(/[™®©]/g, "")
    .replace(/&/g, " and ");
}

export function gameNameKey(name: string): string {
  return baseNormalize(name).replace(/[^a-z0-9]+/g, "");
}

/** Pfade unter /spiele, die keine Spiel-Slugs sein dürfen */
export const RESERVED_GAME_SLUGS = new Set(["finde", "neu", "gruppe"]);

export function gameSlug(name: string): string {
  const slug = baseNormalize(name)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
  return slug || "spiel";
}

/** Erster freier Slug: name, name-2, name-3 … (taken = bereits vergebene Slugs) */
export function uniqueGameSlug(name: string, isTaken: (slug: string) => boolean): string {
  const base = gameSlug(name);
  let candidate = base;
  for (let i = 2; RESERVED_GAME_SLUGS.has(candidate) || isTaken(candidate); i++) {
    candidate = `${base}-${i}`;
  }
  return candidate;
}
