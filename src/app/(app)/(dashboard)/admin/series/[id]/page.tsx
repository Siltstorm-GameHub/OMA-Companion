import { requireSeriesManager, hasMinRole, getCaptainedSquadIds } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeriesDetailClient from "./SeriesDetailClient";
import ApprovalBanner from "../../events/ApprovalBanner";
import { APPROVAL_PENDING } from "@/lib/community-events";
import { parseSeriesCompletion, parseStatConfig } from "@/lib/series-seasons";

export default async function AdminSeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSeriesManager(id);
  const isModerator = hasMinRole(user.role, "moderator");
  const captainedSquadIds = isModerator ? null : await getCaptainedSquadIds(user.id);

  const [series, allUsers, squads] = await Promise.all([
    prisma.eventSeries.findUnique({
      where: { id },
      include: {
        events: {
          orderBy: { startAt: "desc" },
          select: {
            id: true, title: true, startAt: true, endAt: true, status: true, maxPlayers: true, hidden: true, tournamentStatus: true, type: true,
            _count: { select: { registrations: true } },
          },
        },
      },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, username: true, image: true },
      orderBy: { name: "asc" },
    }),
    prisma.squad.findMany({
      where: { hidden: false, ...(captainedSquadIds && { id: { in: captainedSquadIds } }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!series) notFound();

  const groupSeasons = series.groupId
    ? await prisma.eventSeries.findMany({
        where: { groupId: series.groupId },
        select: { id: true, status: true, seasonNumber: true, seriesStatConfig: true, seriesCompletionData: true },
      })
    : [];
  const hasActiveSibling = series.status === "archived" && series.groupId
    ? groupSeasons.some(g => g.status === "active")
    : true;
  // Abschluss rückgängig machen: nur ohne spätere Saison (siehe DELETE /api/admin/series/[id]/complete)
  const canUndoCompletion = series.status === "archived" && !groupSeasons.some(g =>
    g.id !== series.id && (g.status === "active" || (g.seasonNumber ?? 1) > (series.seasonNumber ?? 1)));

  // Alle Stat-Felder der Saison-Gruppe — Auswahl für "Stat-Felder zusammenführen" (All-Time-Tabelle)
  const groupStatFields = [...new Set(groupSeasons.flatMap(g => {
    const cfg = parseStatConfig(g.seriesStatConfig);
    const snapshotFields = (parseSeriesCompletion(g.seriesCompletionData).finalStandings?.rows ?? []).flatMap(r => Object.keys(r.stats));
    return [...cfg.stats.map(st => st.field), ...(cfg.eventStatFields ?? []), ...snapshotFields];
  }))].filter(fld => fld && !fld.startsWith("_streak_")).sort((a, b) => a.localeCompare(b, "de"));

  return (
    <>
      {series.approvalStatus === APPROVAL_PENDING && (
        <ApprovalBanner kind="series" id={series.id} canApprove={isModerator} />
      )}
      <SeriesDetailClient
        series={series} allUsers={allUsers} squads={squads} hasActiveSibling={hasActiveSibling} isModerator={isModerator}
        isAdmin={user.role === "admin"} canUndoCompletion={canUndoCompletion}
        seasonCount={groupSeasons.length} groupStatFields={groupStatFields}
      />
    </>
  );
}
