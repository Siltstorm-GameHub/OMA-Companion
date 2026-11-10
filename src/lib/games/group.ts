/**
 * Gruppen-Finder ("Was zocken wir?") — Auswertung, client-sicher.
 *
 * Ein Spiel "hat" ein Mitglied, wenn es "Hab ich" markiert oder das Spiel im Profil unter
 * "Zockt gerade" stehen hat. Kostenlose Spiele hat automatisch jeder.
 */

import { fitsPlayerCount, popularityScore, type GameListItem } from "./filter";
import { weightedRating } from "./rating";

export interface GroupGameInfo { owners: string[]; wanters: string[] }

export interface GroupMatch {
  game: GameListItem;
  /** Mitglieder der Gruppe, denen das Spiel noch fehlt */
  missing: string[];
  /** Mitglieder der Gruppe mit "Würde ich zocken" */
  wanters: string[];
  free: boolean;
}

export interface GroupResult {
  /** Alle haben's (oder kostenlos) */
  ready: GroupMatch[];
  /** Fehlt nur wenigen — evtl. kauft's noch jemand */
  almost: GroupMatch[];
}

const LIMIT = 30;

export function rankForGroup(
  games: GameListItem[], info: Record<string, GroupGameInfo>, memberIds: string[],
): GroupResult {
  const n = memberIds.length;
  if (n === 0) return { ready: [], almost: [] };
  const members = new Set(memberIds);
  const allowedMissing = Math.max(1, Math.floor(n / 3));

  const matches: GroupMatch[] = games
    .filter(g => fitsPlayerCount(g, n))
    .map(g => {
      const i = info[g.id] ?? { owners: [], wanters: [] };
      const free = g.isFree === true;
      const owners = new Set(i.owners.filter(id => members.has(id)));
      return {
        game: g,
        free,
        missing: free ? [] : memberIds.filter(id => !owners.has(id)),
        wanters: i.wanters.filter(id => members.has(id)),
      };
    });

  const score = (m: GroupMatch) =>
    m.wanters.length * 10 + weightedRating(m.game.ratingSum, m.game.ratingCount) + popularityScore(m.game) / 100;
  const byScore = (a: GroupMatch, b: GroupMatch) => score(b) - score(a) || a.game.name.localeCompare(b.game.name, "de");

  // Ein Spiel taugt erst als Vorschlag, wenn es irgendwer aus der Gruppe hat, will oder es gratis ist
  const relevant = matches.filter(m => m.free || m.missing.length < n || m.wanters.length > 0);

  const ready = relevant.filter(m => m.missing.length === 0).sort(byScore).slice(0, LIMIT);
  const almost = n < 2 ? [] : relevant
    .filter(m => m.missing.length > 0 && m.missing.length <= allowedMissing && m.missing.length < n)
    .sort((a, b) => a.missing.length - b.missing.length || byScore(a, b))
    .slice(0, LIMIT);

  return { ready, almost };
}
