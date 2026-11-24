import type { Metadata } from "next";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { listApprovedGames } from "@/lib/games/service";
import { buildSwipeDeck, markSwipeSeen } from "@/lib/games/deck";
import GameListClient from "./GameListClient";
import GamesSectionTabs from "@/components/games/GamesSectionTabs";
import GameSalesStrip from "@/components/games/GameSalesStrip";
import { GAME_SORTS, type GameSort } from "@/lib/games/filter";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "OMA GameSwipe | Games | OMA",
  description: "Was zocken wir heute? Spiele entdecken, bewerten und Mitspieler finden — OMA GameSwipe.",
};

export default async function SpielePage({ searchParams }: { searchParams: Promise<{ q?: string; neu?: string; sort?: string; ansicht?: string }> }) {
  const { q, neu, sort, ansicht } = await searchParams;
  const user = await getSessionUser();
  const isModerator = !!user && hasMinRole(user.role, "moderator");

  const [games, pendingCount, swipe] = await Promise.all([
    listApprovedGames(user?.id),
    isModerator ? prisma.game.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
    user ? buildSwipeDeck(user.id, 20) : Promise.resolve(null),
  ]);
  if (user && swipe) await markSwipeSeen(user.id);
  // GameSwipe ist die Startansicht — außer man kommt mit Suche, Sortierung, "Hinzufügen" oder ?ansicht=liste
  const listFirst = !!q || !!sort || neu === "1" || ansicht === "liste";

  return (
    <GameListClient
      games={games}
      initialQuery={(q ?? "").slice(0, 80)}
      initialSort={sort && sort in GAME_SORTS ? (sort as GameSort) : "popular"}
      openAdd={neu === "1"}
      pendingCount={pendingCount}
      isModerator={isModerator}
      tabs={<GamesSectionTabs active="gameswipe" />}
      sales={user ? <GameSalesStrip userId={user.id} /> : null}
      swipe={swipe}
      initialView={listFirst ? "list" : "swipe"}
    />
  );
}
