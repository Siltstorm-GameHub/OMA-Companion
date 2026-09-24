import Link from "next/link";
import { Images } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { isVideoUrl } from "@/lib/upload-limits";

/** Server-Komponenten: Fotografen-Galerie zu einem Event bzw. Bilder-Portfolio eines Users. */

const VISIBLE = { hiddenByAdminAt: null } as const;

interface GridAsset { id: string; url: string; caption: string | null; _count: { votes: number } }

export function AssetGrid({ assets }: { assets: GridAsset[] }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
      {assets.map(a => (
        <a key={a.id} href={a.url} target="_blank" rel="noreferrer" title={a.caption ?? undefined}
          className="group relative block aspect-square rounded-lg overflow-hidden bg-black/30">
          {isVideoUrl(a.url)
            ? <video src={a.url} muted preload="metadata" className="w-full h-full object-cover" />
            // eslint-disable-next-line @next/next/no-img-element -- Blob-Bilder beliebiger Größe
            : <img src={a.url} alt={a.caption ?? ""} loading="lazy" className="w-full h-full object-cover" />}
          {a._count.votes > 0 && (
            <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-gray-100">{a._count.votes} 👍</span>
          )}
        </a>
      ))}
    </div>
  );
}

function AlbumChips({ albums }: { albums: { id: string; title: string; _count: { assets: number } }[] }) {
  if (albums.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {albums.map(al => (
        <Link key={al.id} href={`/community-board/album/${al.id}`}
          className="text-[11px] text-teal-300 bg-teal-500/10 border border-teal-500/20 rounded-full px-2.5 py-0.5 hover:bg-teal-500/20 transition-colors">
          📁 {al.title} ({al._count.assets})
        </Link>
      ))}
    </div>
  );
}

export async function EventGallerySection({ eventId }: { eventId: string }) {
  const [assets, albums] = await Promise.all([
    prisma.jobMediaAsset.findMany({
      where: { eventId, ...VISIBLE }, orderBy: { createdAt: "desc" }, take: 12,
      select: { id: true, url: true, caption: true, _count: { select: { votes: true } } },
    }),
    prisma.jobMediaAlbum.findMany({
      where: { OR: [{ eventId }, { assets: { some: { eventId, ...VISIBLE } } }], assets: { some: VISIBLE } },
      select: { id: true, title: true, _count: { select: { assets: true } } }, take: 8,
    }),
  ]);
  if (assets.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <Images className="w-3.5 h-3.5 text-teal-400" /> Fotos &amp; Clips zu diesem Event
      </h2>
      <AlbumChips albums={albums} />
      <AssetGrid assets={assets} />
    </div>
  );
}

export async function FotografPortfolio({ userId }: { userId: string }) {
  const [assets, total, albums] = await Promise.all([
    prisma.jobMediaAsset.findMany({
      where: { authorId: userId, ...VISIBLE }, orderBy: { createdAt: "desc" }, take: 12,
      select: { id: true, url: true, caption: true, _count: { select: { votes: true } } },
    }),
    prisma.jobMediaAsset.count({ where: { authorId: userId, ...VISIBLE } }),
    prisma.jobMediaAlbum.findMany({
      where: { authorId: userId, assets: { some: VISIBLE } }, orderBy: { createdAt: "desc" }, take: 8,
      select: { id: true, title: true, _count: { select: { assets: true } } },
    }),
  ]);
  if (assets.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <Images className="w-3.5 h-3.5 text-teal-400" /> Fotos &amp; Clips ({total})
      </h2>
      <AlbumChips albums={albums} />
      <AssetGrid assets={assets} />
    </div>
  );
}
