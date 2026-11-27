import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Öffentlicher Download-Link eines OMA-Hub-Downloads: zählt den Download und leitet
 * auf die Blob-Datei weiter. `?download=1` lässt Vercel Blob die Datei als Anhang
 * (Content-Disposition: attachment) ausliefern, statt sie im Browser zu öffnen.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await prisma.hubDownload
    .update({
      where: { id, published: true },
      data: { downloadCount: { increment: 1 } },
      select: { fileUrl: true },
    })
    .catch(() => null);
  if (!item) return NextResponse.json({ error: "Download nicht gefunden" }, { status: 404 });

  const target = new URL(item.fileUrl);
  target.searchParams.set("download", "1");
  return NextResponse.redirect(target, 302);
}
