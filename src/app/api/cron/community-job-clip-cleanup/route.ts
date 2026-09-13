import { NextRequest, NextResponse } from "next/server";
import { list, del } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { resolveStoreId } from "@/lib/blob-store";
import { CLIP_UPLOAD_PREFIX, CLIP_ORPHAN_MAX_AGE_DAYS } from "@/lib/upload-limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${process.env.CRON_SECRET}`;
}

/**
 * Räumt verwaiste Fotograf-Clip-Uploads auf: Videos, die per Direct-to-Blob-
 * Upload (siehe /api/community-jobs/media/clip-upload) im Blob-Store landen,
 * aber nie einen JobMediaAsset-Datensatz bekommen haben (Tab zu, Fehler nach
 * dem Upload o.ä.) — nur solche ohne DB-Referenz werden gelöscht, ein
 * tatsächlich genutztes Asset bleibt unangetastet, egal wie alt.
 *
 * Läuft täglich (siehe vercel.json). CLIP_ORPHAN_MAX_AGE_DAYS ist bewusst
 * großzügig (3 Monate) — das Feature wird aktuell kaum genutzt.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const storeId = resolveStoreId();
  const cutoff = new Date(Date.now() - CLIP_ORPHAN_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);

  const staleBlobs: { url: string; uploadedAt: Date }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: CLIP_UPLOAD_PREFIX, cursor, limit: 1000, ...(storeId ? { storeId } : {}) });
    for (const blob of page.blobs) {
      if (blob.uploadedAt < cutoff) staleBlobs.push({ url: blob.url, uploadedAt: blob.uploadedAt });
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (staleBlobs.length === 0) {
    return NextResponse.json({ scanned: 0, deleted: 0, cutoff });
  }

  const referenced = await prisma.jobMediaAsset.findMany({
    where: { url: { in: staleBlobs.map((b) => b.url) } },
    select: { url: true },
  });
  const referencedUrls = new Set(referenced.map((a) => a.url));
  const orphaned = staleBlobs.filter((b) => !referencedUrls.has(b.url));

  if (orphaned.length > 0) {
    await del(orphaned.map((b) => b.url), storeId ? { storeId } : undefined);
  }

  return NextResponse.json({ scanned: staleBlobs.length, deleted: orphaned.length, cutoff });
}
