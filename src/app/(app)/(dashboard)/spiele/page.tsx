import type { Metadata } from "next";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { listApprovedGames } from "@/lib/games/service";
import GameListClient from "./GameListClient";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Spieleliste | OMA",
  description: "Was zocken wir heute? Spiele für eure Runde finden — bewertet von der Community.",
};

export default async function SpielePage({ searchParams }: { searchParams: Promise<{ q?: string; neu?: string }> }) {
  const { q, neu } = await searchParams;
  const user = await getSessionUser();
  const isModerator = !!user && hasMinRole(user.role, "moderator");

  const [games, pendingCount] = await Promise.all([
    listApprovedGames(user?.id),
    isModerator ? prisma.game.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
  ]);

  return (
    <GameListClient
      games={games}
      initialQuery={(q ?? "").slice(0, 80)}
      openAdd={neu === "1"}
      pendingCount={pendingCount}
      isModerator={isModerator}
    />
  );
}
