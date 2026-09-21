import { prisma } from "@/lib/prisma";
import { buildHoldersMap, getUserTrophies, getScopeTitle, CATEGORY_CONFIG, GENRE_CONFIG } from "@/lib/wanderpocal";

/** Wanderpokal-Scope, den `userId` gerade hält (siehe wanderpocal.ts). */
export interface OwnedWanderpokal {
  scopeType:  string;
  scopeValue: string;
  title:      string;
  winCount:   number;
  heldSince:  string;
}

/**
 * ALLE 12 Wanderpokal-Scopes (6 Kategorie + 6 Genre), unabhängig vom eigenen
 * Besitz — für die "wer hält gerade die anderen Wanderpokale"-Anzeige.
 * `holder*`/`winCount` sind null, wenn der Scope noch nie vergeben wurde.
 * `myWinCount` kommt aus `WanderpocalStat` (kumulierte Siege pro Scope,
 * unabhängig davon wer GERADE hält) — für den Vergleich "eigene Siege vs.
 * aktueller Halter", auch wenn man selbst nie Halter war.
 */
export interface WanderpokalHolderStatus {
  scopeType:        string;
  scopeValue:       string;
  title:            string;
  ownedByMe:        boolean;
  holderUserId:     string | null;
  holderName:       string | null;
  holderAvatarUrl:  string | null;
  holderRankPoints: number | null;
  winCount:         number | null;
  myWinCount:       number;
}

/**
 * Wanderpokal-Daten für den 3D-Pokal-Viewer + die "wer hält den Rest"-Anzeige
 * auf der Profilseite.
 */
export async function loadWanderpokalStatus(userId: string): Promise<{
  wanderpokale: OwnedWanderpokal[];
  wanderpokalStatus: WanderpokalHolderStatus[];
}> {
  // Alle 12 Scopes zusammen sind eine Handvoll Zeilen — genauso teuer, ALLE
  // Halter auf einmal zu laden (statt nur die des Users), damit die Anzeige
  // zeigen kann, wer die Wanderpokale hält, die man selbst nicht besitzt.
  // Inkl. Avatar/Rang für die Profilbild-Anzeige.
  const [wanderpokalHolders, myWanderpokalStats] = await Promise.all([
    prisma.wanderpocalHolder.findMany({
      include: { user: { select: { id: true, username: true, name: true, image: true, rankPoints: true } } },
    }),
    // Eigene kumulierte Siege pro Scope (WanderpocalStat, unabhängig vom
    // AKTUELLEN Halter) — für den "Du: X Siege"-Vergleich, auch bei Scopes,
    // die man selbst nie gehalten hat.
    prisma.wanderpocalStat.findMany({ where: { userId } }),
  ]);

  const holdersMap = buildHoldersMap(wanderpokalHolders);
  const wanderpokale: OwnedWanderpokal[] = getUserTrophies(holdersMap, userId).map(h => ({
    scopeType:  h.scopeType,
    scopeValue: h.scopeValue,
    title:      getScopeTitle(h.scopeType, h.scopeValue),
    winCount:   h.winCount,
    heldSince:  h.heldSince.toISOString(),
  }));

  const allScopes: [string, string][] = [
    ...Object.keys(CATEGORY_CONFIG).map((v): [string, string] => ["category", v]),
    ...Object.keys(GENRE_CONFIG).map((v): [string, string] => ["genre", v]),
  ];
  const myStatsMap = new Map(myWanderpokalStats.map(s => [`${s.scopeType}:${s.scopeValue}`, s.winCount]));
  const wanderpokalStatus: WanderpokalHolderStatus[] = allScopes.map(([scopeType, scopeValue]) => {
    const holder = wanderpokalHolders.find(h => h.scopeType === scopeType && h.scopeValue === scopeValue);
    return {
      scopeType, scopeValue,
      title:            getScopeTitle(scopeType, scopeValue),
      ownedByMe:        holder?.userId === userId,
      holderUserId:     holder?.userId ?? null,
      holderName:       holder ? (holder.user.username ?? holder.user.name ?? "Unbekannt") : null,
      holderAvatarUrl:  holder?.user.image ?? null,
      holderRankPoints: holder?.user.rankPoints ?? null,
      winCount:         holder?.winCount ?? null,
      myWinCount:       myStatsMap.get(`${scopeType}:${scopeValue}`) ?? 0,
    };
  });

  return { wanderpokale, wanderpokalStatus };
}
