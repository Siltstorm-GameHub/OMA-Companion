import { isVideoUrl } from "@/lib/upload-limits";

/** Bilder-Raster (z.B. Album-Seite). Event-Galerien zeigt heute EventPostsSection (Beiträge mit Bildern). */

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
