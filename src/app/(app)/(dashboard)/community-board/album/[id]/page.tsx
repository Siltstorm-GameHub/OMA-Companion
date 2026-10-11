import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/roles";
import { formatBerlinDate } from "@/lib/time";
import { AssetGrid } from "@/components/FotografGalleries";

export const dynamic = "force-dynamic";

/** Fotografen-Album: alle Bilder/Clips einer Serie, als Ganzes verlinkbar. */
export default async function AlbumPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) notFound();

  const { id } = await params;
  const album = await prisma.jobMediaAlbum.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, name: true } },
      event: { select: { id: true, title: true } },
      assets: {
        where: { hiddenByAdminAt: null }, orderBy: { createdAt: "asc" },
        select: { id: true, url: true, caption: true, _count: { select: { votes: true } } },
      },
    },
  });
  if (!album) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-4 px-4 py-6">
      <div>
        <h1 className="text-lg font-bold text-white">📁 {album.title}</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          von {album.author.username ?? album.author.name ?? "?"} · {formatBerlinDate(album.createdAt)} · {album.assets.length} {album.assets.length === 1 ? "Datei" : "Dateien"}
          {album.event && <> · <Link href={`/tournament/${album.event.id}`} className="hover:text-teal-400 transition-colors">{album.event.title}</Link></>}
        </p>
      </div>
      {album.assets.length === 0
        ? <p className="text-sm text-gray-500">Dieses Album ist noch leer.</p>
        : <div className="glass rounded-2xl p-4"><AssetGrid assets={album.assets} /></div>}
    </div>
  );
}
