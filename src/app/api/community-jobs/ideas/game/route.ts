import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getSteamAppInfo } from "@/lib/steam-app";
import { parseSteamAppId } from "@/lib/idea-lifecycle";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/** GET ?url=… (Steam-Link oder App-ID) — Spiel-Infos: Name, Bild, Preis, aktuelle Spieler, Community-Events zum Spiel. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const params = new URL(req.url).searchParams;
  const appId = parseSteamAppId(params.get("url") ?? params.get("appId") ?? "");
  if (!appId) return NextResponse.json({ error: "Kein gültiger Steam-Link" }, { status: 400 });
  const info = await getSteamAppInfo(appId);
  if (!info) return NextResponse.json({ error: "Spiel nicht gefunden" }, { status: 404 });

  const since = new Date(Date.now() - 120 * 86_400_000);
  const communityEvents = await prisma.event.count({ where: { hidden: false, startAt: { gte: since }, game: { contains: info.name, mode: "insensitive" } } });
  return NextResponse.json({ ...info, communityEvents });
}
