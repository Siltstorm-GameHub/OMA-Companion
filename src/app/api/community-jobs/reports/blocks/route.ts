import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET ?type=leaderboard — fertiger Markdown-Baustein für Berichte: Top 10 nach Rangpunkten als Tabelle.
 * (Ergebnis-Tabellen und Teilnehmerlisten eines Events baut der Editor selbst aus den Event-Fakten.)
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  if (new URL(req.url).searchParams.get("type") !== "leaderboard") {
    return NextResponse.json({ error: "Unbekannter Baustein" }, { status: 400 });
  }

  const top = await prisma.user.findMany({
    where: { rankPoints: { gt: 0 } }, orderBy: { rankPoints: "desc" }, take: 10,
    select: { username: true, name: true, rankPoints: true },
  });
  const rows = top.map((u, i) => `| ${i + 1} | ${(u.username ?? u.name ?? "?").replace(/\|/g, "/")} | ${u.rankPoints.toLocaleString("de-DE")} |`);
  const markdown = ["| Platz | Spieler | Punkte |", "| --- | --- | --- |", ...rows].join("\n");
  return NextResponse.json({ markdown });
}
