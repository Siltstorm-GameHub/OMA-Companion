import { NextRequest, NextResponse } from "next/server";
import { list, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveStoreId } from "@/lib/blob-store";
import {
  PROOF_ORPHAN_MAX_AGE_DAYS,
  PROOF_PREFIX,
  PROOF_RETENTION_DAYS_AFTER_PHASE,
  PROOF_RETENTION_DAYS_MAX,
  parseScreenshotUrls,
} from "@/lib/tournaments/matchSubmissions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY = 24 * 60 * 60 * 1000;

function isAuthorized(req: NextRequest): boolean {
  return req.headers.get("authorization") === `Bearer ${process.env.CRON_SECRET}`;
}

function phaseClosedAt(completionData: string | null): Date | null {
  if (!completionData) return null;
  try {
    const d = JSON.parse(completionData) as { gamePhaseComplete?: boolean; lockedAt?: string };
    if (d.gamePhaseComplete !== true) return null;
    const t = d.lockedAt ? new Date(d.lockedAt) : null;
    return t && !isNaN(t.getTime()) ? t : null;
  } catch {
    return null;
  }
}

/**
 * Löscht Nachweis-Screenshots von Match-Meldungen (Vercel Blob), damit das kostenlose
 * Speicherkontingent nicht vollläuft. Die Meldung selbst (Werte, Status) bleibt erhalten,
 * nur die Bilder verschwinden.
 *
 *  1. PROOF_RETENTION_DAYS_AFTER_PHASE Tage nach Abschluss der aktiven Eventphase
 *  2. spätestens PROOF_RETENTION_DAYS_MAX Tage nach der Meldung (Event nie abgeschlossen)
 *  3. verwaiste Uploads (hochgeladen, nie abgeschickt) nach PROOF_ORPHAN_MAX_AGE_DAYS Tagen
 *
 * Läuft täglich (siehe vercel.json).
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const storeId = resolveStoreId();
  const opts = storeId ? { storeId } : undefined;
  const now = Date.now();

  // 1 + 2: Meldungen mit noch vorhandenen Bildern
  const subs = await prisma.matchResultSubmission.findMany({
    where: { NOT: { screenshotUrls: "[]" } },
    select: { id: true, screenshotUrls: true, createdAt: true, updatedAt: true, match: { select: { event: { select: { completionData: true } } } } },
  });
  const expired = subs.filter((s) => {
    const closed = phaseClosedAt(s.match.event.completionData);
    if (closed && now - closed.getTime() > PROOF_RETENTION_DAYS_AFTER_PHASE * DAY) return true;
    return now - s.updatedAt.getTime() > PROOF_RETENTION_DAYS_MAX * DAY;
  });
  const urls = expired.flatMap((s) => parseScreenshotUrls(s.screenshotUrls));
  if (urls.length) await del(urls, opts);
  if (expired.length) {
    await prisma.matchResultSubmission.updateMany({ where: { id: { in: expired.map((s) => s.id) } }, data: { screenshotUrls: "[]" } });
  }

  // 3: verwaiste Uploads
  const orphanCutoff = new Date(now - PROOF_ORPHAN_MAX_AGE_DAYS * DAY);
  const candidates: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PROOF_PREFIX, cursor, limit: 1000, ...(storeId ? { storeId } : {}) });
    for (const b of page.blobs) if (b.uploadedAt < orphanCutoff) candidates.push(b.url);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  let orphans = 0;
  for (const url of candidates) {
    const used = await prisma.matchResultSubmission.count({ where: { screenshotUrls: { contains: url } } });
    if (used === 0) {
      await del(url, opts);
      orphans++;
    }
  }

  return NextResponse.json({ expiredSubmissions: expired.length, deletedScreenshots: urls.length, deletedOrphans: orphans });
}
