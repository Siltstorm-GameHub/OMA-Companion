import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { reportFeedInclude, toReportFeedEntry } from "@/lib/report-feed";
import { getSeriesParts } from "@/lib/journalist-service";
import { postDisplayTitle } from "@/lib/post-display";
import { plainExcerpt } from "@/lib/report-text";
import BotPreviewShell from "@/components/BotPreviewShell";
import ReportPageClient from "./ReportPageClient";

export const dynamic = "force-dynamic";

/**
 * Teilen-Vorschau (Discord, WhatsApp …): Titel, Textanfang und eine Karte mit dem ersten Bild
 * (/api/og/post/[id]). Entwürfe und ausgeblendete Beiträge verraten nichts. noindex wie bei Profilen.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const post = await prisma.jobReport
    .findUnique({
      where: { id },
      select: {
        title: true, bodyMarkdown: true, isDraft: true, hiddenByAdminAt: true,
        author: { select: { username: true, name: true } },
        _count: { select: { media: true } },
      },
    })
    .catch(() => null);
  if (!post || post.isDraft || post.hiddenByAdminAt) {
    return { title: "Beitrag – Old Masters Ally", robots: { index: false, follow: false } };
  }
  const name = post.author.username ?? post.author.name ?? "Mitglied";
  const title = `${postDisplayTitle({ ...post, mediaCount: post._count.media })} – ${name}`;
  const description = plainExcerpt(post.bodyMarkdown, 180) || `Ein Beitrag von ${name} im Community-Board.`;
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: { title, description, images: [`/api/og/post/${id}`] },
    twitter: { card: "summary_large_image", title, description, images: [`/api/og/post/${id}`] },
  };
}

/** Eigene Seite für einen Beitrag — mit teilbarem Link, vollem Text, Bildern, Ergänzungen und Reihen-Navigation. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  // Ohne Session kommt nur ein vom Layout durchgelassener Link-Vorschau-Bot hierher — der braucht nur die Meta-Tags.
  if (!user) return <BotPreviewShell />;

  const { id } = await params;
  const report = await prisma.jobReport.findUnique({ where: { id }, include: reportFeedInclude(user.id) });
  if (!report || report.hiddenByAdminAt) notFound();
  // Entwürfe sieht nur der Autor (bzw. ein Moderator).
  if (report.isDraft && report.authorId !== user.id && !hasMinRole(user.role, "moderator")) notFound();

  const parts = report.seriesId ? await getSeriesParts(report.seriesId) : [];
  const entry = { ...toReportFeedEntry(report), seriesParts: parts };

  // Datumsfelder für die Client-Komponente serialisieren.
  return <ReportPageClient entry={JSON.parse(JSON.stringify(entry))} isDraft={report.isDraft} />;
}
