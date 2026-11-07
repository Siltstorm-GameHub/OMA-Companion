import { cache } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { reportCategoryLabel } from "@/lib/report-categories";
import { isVideoUrl } from "@/lib/upload-limits";
import { postDisplayTitle } from "@/lib/post-display";
import ProfileContributionsList, { type ProfileContribution } from "./ProfileContributionsList";

/**
 * Profil: veröffentlichte Community-Job-Beiträge eines Users (Beiträge mit Text/Bildern/Clips/Werbung,
 * Ideen, Anleitungen). Standardmäßig nur die 3 mit den meisten Daumen hoch, der Rest
 * per "Alle anzeigen". Bei Ideen zählen 4–5-Sterne-Bewertungen als Daumen hoch.
 */

/** Obergrenze für "Alle anzeigen" — schützt die Profilseite vor extrem langen Listen. */
const MAX_ITEMS = 200;

/**
 * Desktop- und Mobil-Ansicht des Profils rendern den Block beide (eine davon per CSS versteckt) —
 * `cache` sorgt dafür, dass die Abfragen pro Seitenaufruf nur einmal laufen.
 */
const loadContributions = cache(async (userId: string): Promise<ProfileContribution[]> => {
  const visible = { authorId: userId, hiddenByAdminAt: null };
  const [reports, ideas, guides] = await Promise.all([
    prisma.jobReport.findMany({
      where: { ...visible, isDraft: false }, take: MAX_ITEMS, orderBy: { votes: { _count: "desc" } },
      select: {
        id: true, title: true, bodyMarkdown: true, category: true, publishedAt: true, gameCoverUrl: true,
        event: { select: { title: true } }, coverAsset: { select: { url: true } },
        media: { where: { hiddenByAdminAt: null }, orderBy: { position: "asc" }, select: { url: true } },
        _count: { select: { votes: true } },
      },
    }),
    prisma.communityIdea.findMany({
      where: visible, take: MAX_ITEMS, orderBy: { createdAt: "desc" },
      select: { id: true, title: true, createdAt: true, votes: { select: { stars: true } } },
    }),
    prisma.coachGuide.findMany({
      where: visible, take: MAX_ITEMS, orderBy: { votes: { _count: "desc" } },
      select: { id: true, title: true, game: true, createdAt: true, _count: { select: { votes: true } } },
    }),
  ]);

  const items: ProfileContribution[] = [
    ...reports.map(r => ({
      id: `report:${r.id}`, kind: "report" as const,
      title: postDisplayTitle({ ...r, mediaCount: r.media.length }), href: `/community-board/report/${r.id}`,
      meta: r.event?.title ?? (r.category ? reportCategoryLabel(r.category) ?? r.category : null),
      image: r.coverAsset?.url ?? r.gameCoverUrl ?? r.media.find(m => !isVideoUrl(m.url))?.url ?? null,
      thumbs: r._count.votes, date: r.publishedAt.toISOString(),
    })),
    ...ideas.map(i => ({
      id: `idea:${i.id}`, kind: "idea" as const, title: i.title, href: `/community-board/idea/${i.id}`,
      meta: null, image: null,
      thumbs: i.votes.filter(v => v.stars >= 4).length, date: i.createdAt.toISOString(),
    })),
    ...guides.map(g => ({
      id: `guide:${g.id}`, kind: "guide" as const, title: g.title, href: "/community-board",
      meta: g.game, image: null,
      thumbs: g._count.votes, date: g.createdAt.toISOString(),
    })),
  ];
  // Meiste Daumen zuerst, bei Gleichstand der neuere Beitrag.
  return items.sort((a, b) => b.thumbs - a.thumbs || b.date.localeCompare(a.date));
});

export default async function ProfileTopContributions({ userId, isOwn = false }: { userId: string; isOwn?: boolean }) {
  const items = await loadContributions(userId);
  if (items.length === 0) {
    // Fremde Profile: leeren Abschnitt ausblenden. Eigenes Profil: Einladung statt Lücke.
    if (!isOwn) return null;
    return (
      <div className="glass rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-gray-400">Noch keine Beiträge — teile Fotos oder Clips, mach Werbung für ein Event, schreib einen Bericht oder reiche eine Idee ein.</p>
        <Link href="/profile?tab=community_jobs" className="text-xs text-teal-400 hover:text-teal-300 transition-colors">Zum Büro →</Link>
      </div>
    );
  }
  return <ProfileContributionsList items={items.slice(0, MAX_ITEMS)} total={Math.min(items.length, MAX_ITEMS)} />;
}
