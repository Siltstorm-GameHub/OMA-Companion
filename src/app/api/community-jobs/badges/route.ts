import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/roles";
import { getJobBadges } from "@/lib/community-job-service";

export const dynamic = "force-dynamic";

/**
 * GET ?ids=a,b,c (max. 100) — Job-Badges für viele Nutzer auf einmal (siehe JobBadge-Komponente,
 * die Anfragen pro Seite bündelt). Antwort: { [userId]: JobBadgeData } — Nutzer ohne Badge fehlen.
 */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });

  const ids = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map(s => s.trim()).filter(Boolean).slice(0, 100);
  return NextResponse.json(await getJobBadges(ids), {
    headers: { "Cache-Control": "private, max-age=60" },
  });
}
