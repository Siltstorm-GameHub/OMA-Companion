import Link from "next/link";
import { FileText, Plus } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { isVideoUrl } from "@/lib/upload-limits";
import { postDisplayTitle } from "@/lib/post-display";

/**
 * Turnierseite: alle Beiträge zu einem Event — Werbung vorher, Fotos/Clips und Berichte nachher, seit der
 * Zusammenlegung ein Typ. Mit Button "Beitrag dazu erstellen" (öffnet das Büro mit dem Event vorbelegt).
 */
export default async function EventPostsSection({ eventId, canCreate }: { eventId: string; canCreate: boolean }) {
  const posts = await prisma.jobReport.findMany({
    where: { eventId, isDraft: false, hiddenByAdminAt: null },
    orderBy: { publishedAt: "desc" },
    take: 12,
    select: {
      id: true, title: true, bodyMarkdown: true, gameCoverUrl: true,
      author: { select: { username: true, name: true } },
      coverAsset: { select: { url: true } },
      media: { where: { hiddenByAdminAt: null }, orderBy: { position: "asc" }, select: { url: true } },
      _count: { select: { votes: true } },
    },
  });
  if (posts.length === 0 && !canCreate) return null;
  const composeHref = `/profile?job=content_creator&compose=${encodeURIComponent(eventId)}`;

  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-teal-400" /> Beiträge zu diesem Event{posts.length > 0 ? ` (${posts.length})` : ""}
        </h2>
        {canCreate && (
          <Link href={composeHref} className="inline-flex items-center gap-1 text-xs text-teal-400 hover:text-teal-300 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Beitrag dazu erstellen
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="text-xs text-gray-500">Noch keine Beiträge — mach Werbung, teile Fotos und Clips oder schreib einen Bericht.</p>
      ) : (
        <ul className="space-y-2">
          {posts.map(p => {
            const images = p.media.filter(m => !isVideoUrl(m.url));
            const thumb = p.coverAsset?.url ?? p.gameCoverUrl ?? images[0]?.url ?? null;
            const clips = p.media.length - images.length;
            return (
              <li key={p.id}>
                <Link href={`/community-board/report/${p.id}`} className="flex items-center gap-3 hover:text-teal-400 transition-colors">
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element -- Blob-Bilder/Spiel-Cover beliebiger Größe
                    <img src={thumb} alt="" loading="lazy" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-black/30" />
                  ) : (
                    <span className="w-12 h-12 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-teal-400" />
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-gray-200 truncate">{postDisplayTitle({ ...p, mediaCount: p.media.length })}</span>
                    <span className="block text-[11px] text-gray-500 truncate">
                      {p.author.username ?? p.author.name ?? "?"}
                      {images.length > 0 ? ` · ${images.length} ${images.length === 1 ? "Bild" : "Bilder"}` : ""}
                      {clips > 0 ? ` · ${clips} ${clips === 1 ? "Clip" : "Clips"}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-gray-400 tabular-nums">{p._count.votes} 👍</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
