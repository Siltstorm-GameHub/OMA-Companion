// OMA Original: eigene Events und Eventreihen der Old Masters Allies.
// Nur Originals tragen das Logo-Siegel auf dem Cover (CoverBrandBadge, lib/branded-cover.ts) —
// normale Community-Events behalten den Cover-Rahmen, aber ohne Logo.
//
// Original ist, was ein Mod so markiert hat, oder was OMA Blocks spielt (eigenes Spiel der
// Community): solche Events und Reihen gelten immer als Original, auch ohne gesetztes Feld.
import { BLOCKS_GAME } from "@/lib/blocks/event-config";

type SeriesSource = {
  omaOriginal?: boolean | null;
  /** Festes Spiel der Reihe — OMA Blocks macht die Reihe automatisch zum Original */
  fixedGame?: string | null;
};

type OriginalSource = {
  omaOriginal?: boolean | null;
  game?: string | null;
  series?: SeriesSource | null;
};

/** Spielt das Event bzw. die Reihe OMA Blocks? Dann ist es immer ein Original. */
export function isBlocksGame(game: string | null | undefined): boolean {
  return game === BLOCKS_GAME;
}

/** Eine Reihe ist Original, wenn sie so markiert ist oder fest OMA Blocks spielt. */
export function isOmaOriginalSeries(series: SeriesSource | null | undefined): boolean {
  return !!(series?.omaOriginal || isBlocksGame(series?.fixedGame));
}

/** Ein Event ist Original, wenn es selbst so markiert ist, OMA Blocks spielt oder zu einer Original-Reihe gehört. */
export function isOmaOriginal(event: OriginalSource | null | undefined): boolean {
  return !!(event?.omaOriginal || isBlocksGame(event?.game) || isOmaOriginalSeries(event?.series));
}
