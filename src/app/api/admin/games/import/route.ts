import { NextResponse } from "next/server";
import { requireRole } from "@/lib/roles";
import { importCommunityGames } from "@/lib/games/service";

/** Spiele aus Events, Spieltagen, Gameservern, Lieblingsspielen und Ideen übernehmen. */
export async function POST() {
  await requireRole("moderator");
  return NextResponse.json(await importCommunityGames());
}
