import { notFound } from "next/navigation";
import { getSessionUser, hasMinRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { reportFeedInclude, toReportFeedEntry } from "@/lib/report-feed";
import { getSeriesParts } from "@/lib/journalist-service";
import ReportPageClient from "./ReportPageClient";

export const dynamic = "force-dynamic";

/** Eigene Seite für einen Bericht — mit teilbarem Link, vollem Text, Ergänzungen und Reihen-Navigation. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) notFound();

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
