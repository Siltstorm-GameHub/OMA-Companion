import { NextRequest, NextResponse } from "next/server";
import { commitAllDueArrivals } from "@/lib/dnd/travel";
import { runAutoMigrationIfDeadlinePassed } from "@/lib/dnd/migration";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * Täglicher Cleanup (plan Abschnitt 3.3, nicht korrektheitsrelevant — Ankünfte
 * committen ohnehin lazy bei nächstem authentifiziertem Zugriff) + Migrations-
 * Sweep für Bestandsmitglieder nach Ablauf der Frist (plan Abschnitt 6.1).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const committed = await commitAllDueArrivals();
  const migration = await runAutoMigrationIfDeadlinePassed();

  return NextResponse.json({ ok: true, arrivalsCommitted: committed, migrated: migration.migrated });
}
