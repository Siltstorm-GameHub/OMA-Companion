import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { gameFieldsOf, listRecentGameEdits } from "@/lib/games/service";
import GameAdminManager, { type AdminGame } from "./GameAdminManager";
import GameEditsLog from "./GameEditsLog";
import GameSwipeAdmin, { type AdminDrop } from "./GameSwipeAdmin";
import { getWeeklyDrop, listTipsForAdmin } from "@/lib/games/drop";
import { getDiscoverItems } from "@/lib/games/discover";
import { discoverKey, type DiscoverSource } from "@/lib/games/deck-plan";

const SOURCE_LABEL: Record<DiscoverSource, string> = {
  free: "Gratis-Aktionen", subscription: "Neu im Game Pass", upcoming: "Erscheint bald", steam_new: "Steam · Neu & angesagt", steam_top: "Steam · Gerade angesagt",
};

export const dynamic = "force-dynamic";

export default async function AdminSpielePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireRole("moderator");
  const { edit } = await searchParams;

  const [games, edits, drop, tips, discover] = await Promise.all([
    prisma.game.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: { addedBy: { select: { name: true, username: true } } },
    }),
    listRecentGameEdits(60),
    getWeeklyDrop(),
    listTipsForAdmin(),
    getDiscoverItems(),
  ]);

  const byId = new Map(games.map(g => [g.id, g]));
  const adminDrop: AdminDrop | null = drop
    ? {
        week: drop.week,
        endsAt: drop.endsAt,
        items: drop.items.map(i => {
          if (i.kind === "game") {
            const g = byId.get(i.gameId);
            return { key: `g:${i.gameId}`, name: g?.name ?? "Entferntes Spiel", coverUrl: g?.coverUrl ?? null, label: "Aus der Spieleliste", tipBy: i.tip?.by ?? null, slug: g?.slug ?? null };
          }
          return { key: `d:${discoverKey(i.item)}`, name: i.item.name, coverUrl: i.item.coverUrl, label: SOURCE_LABEL[i.item.source], tipBy: null, slug: null };
        }),
      }
    : null;
  const feeds = (Object.keys(SOURCE_LABEL) as DiscoverSource[]).map(src => ({ label: SOURCE_LABEL[src], count: discover.filter(d => d.source === src).length }));

  const rows: AdminGame[] = games.map(g => ({
    id: g.id,
    slug: g.slug,
    name: g.name,
    status: g.status as AdminGame["status"],
    steamAppId: g.steamAppId,
    igdbId: g.igdbId,
    aliases: g.aliases,
    subscriptions: g.subscriptions,
    coverUrl: g.coverUrl,
    fields: gameFieldsOf(g),
    ratingCount: g.ratingCount,
    inCount: g.inCount,
    enriched: g.enrichedAt !== null,
    addedBy: g.addedBy ? g.addedBy.username ?? g.addedBy.name : null,
    createdAt: g.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Spieleliste</h1>
        <p className="text-sm text-gray-400 mt-1">
          Vorschläge ohne Steam-/IGDB-Treffer freischalten, Angaben korrigieren, Ergänzungen von Mitgliedern prüfen
          und Dubletten zusammenführen. Spiele mit Treffer erscheinen sofort.
        </p>
      </div>
      <GameSwipeAdmin drop={adminDrop} tips={tips} feeds={feeds} />
      <GameAdminManager games={rows} initialEditId={edit ?? null} />
      <GameEditsLog edits={edits} />
    </div>
  );
}
