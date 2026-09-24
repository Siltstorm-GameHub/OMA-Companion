import { Megaphone } from "@/components/icons";
import { prisma } from "@/lib/prisma";
import { formatBerlinDate } from "@/lib/time";

/** Server-Komponenten: Werbe-Posts zu einem Event bzw. Marketing-Portfolio eines Users. */

const VISIBLE = { hiddenByAdminAt: null } as const;

interface PostRow {
  id: string; caption: string; imageUrl: string | null; createdAt: Date; adminConfirmedPosted: boolean;
  asset: { url: string } | null; _count: { votes: number };
  author?: { username: string | null; name: string | null };
  event?: { title: string } | null;
}

const SELECT = {
  id: true, caption: true, imageUrl: true, createdAt: true, adminConfirmedPosted: true,
  asset: { select: { url: true } }, _count: { select: { votes: true } },
} as const;

function PostList({ posts, showAuthor }: { posts: PostRow[]; showAuthor?: boolean }) {
  return (
    <ul className="space-y-2">
      {posts.map(p => {
        const image = p.imageUrl ?? p.asset?.url ?? null;
        return (
          <li key={p.id} className="flex items-start gap-3">
            {image && (
              // eslint-disable-next-line @next/next/no-img-element -- Blob-Bilder beliebiger Größe
              <img src={image} alt="" loading="lazy" className="w-14 h-14 rounded-lg object-cover shrink-0 bg-black/30" />
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm text-gray-200 whitespace-pre-line break-words line-clamp-3">{p.caption}</p>
              <p className="text-[11px] text-gray-500">
                {showAuthor && p.author ? `${p.author.username ?? p.author.name ?? "?"} · ` : ""}
                {p.event ? `${p.event.title} · ` : ""}{formatBerlinDate(p.createdAt)} · {p._count.votes} 👍
                {p.adminConfirmedPosted && <span className="ml-1.5 text-emerald-400">✓ extern gepostet</span>}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export async function EventMarketingSection({ eventId }: { eventId: string }) {
  const posts = await prisma.marketingPost.findMany({
    where: { eventId, ...VISIBLE }, orderBy: { createdAt: "desc" }, take: 6,
    select: { ...SELECT, author: { select: { username: true, name: true } } },
  });
  if (posts.length === 0) return null;
  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <Megaphone className="w-3.5 h-3.5 text-teal-400" /> Werbung zu diesem Event
      </h2>
      <PostList posts={posts} showAuthor />
    </div>
  );
}

export async function MarketingPortfolio({ userId }: { userId: string }) {
  const [posts, total] = await Promise.all([
    prisma.marketingPost.findMany({
      where: { authorId: userId, ...VISIBLE }, orderBy: { createdAt: "desc" }, take: 8,
      select: { ...SELECT, event: { select: { title: true } } },
    }),
    prisma.marketingPost.count({ where: { authorId: userId, ...VISIBLE } }),
  ]);
  if (posts.length === 0) return null;
  return (
    <div className="glass rounded-2xl p-4 mb-5 space-y-3">
      <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
        <Megaphone className="w-3.5 h-3.5 text-teal-400" /> Werbe-Posts ({total})
      </h2>
      <PostList posts={posts} />
    </div>
  );
}
