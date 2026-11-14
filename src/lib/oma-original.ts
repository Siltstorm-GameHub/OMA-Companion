// OMA Original: eigene Events und Eventreihen der Old Masters Allies.
// Nur Originals tragen das Logo-Siegel auf dem Cover (CoverBrandBadge, lib/branded-cover.ts) —
// normale Community-Events behalten den Cover-Rahmen, aber ohne Logo.

type OriginalSource = {
  omaOriginal?: boolean | null;
  series?: { omaOriginal?: boolean | null } | null;
};

/** Ein Event ist Original, wenn es selbst so markiert ist oder zu einer Original-Reihe gehört. */
export function isOmaOriginal(event: OriginalSource | null | undefined): boolean {
  return !!(event?.omaOriginal || event?.series?.omaOriginal);
}
