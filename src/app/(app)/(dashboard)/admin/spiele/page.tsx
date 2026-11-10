import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { gameFieldsOf, listRecentGameEdits } from "@/lib/games/service";
import GameAdminManager, { type AdminGame } from "./GameAdminManager";
import GameEditsLog from "./GameEditsLog";

export const dynamic = "force-dynamic";

export default async function AdminSpielePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireRole("moderator");
  const { edit } = await searchParams;

  const [games, edits] = await Promise.all([
    prisma.game.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: { addedBy: { select: { name: true, username: true } } },
    }),
    listRecentGameEdits(60),
  ]);

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
    wantCount: g.wantCount,
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
      <GameAdminManager games={rows} initialEditId={edit ?? null} />
      <GameEditsLog edits={edits} />
    </div>
  );
}
