import { requireSeriesManager, hasMinRole, getCaptainedSquadIds } from "@/lib/roles";
import { getCommunityLimits, seriesConfigLimits } from "@/lib/community-event-limits";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import SeriesDetailClient from "./SeriesDetailClient";
import ApprovalBanner from "../../ApprovalBanner";
import { APPROVAL_PENDING, APPROVAL_REJECTED } from "@/lib/community-events";
import { parseSeriesCompletion, parseStatConfig, seasonStandings } from "@/lib/series-seasons";
import GameVoteSettings from "./GameVoteSettings";
import { parseGameVoteConfig } from "@/lib/game-vote/rules";

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
            format: true, statConfigJson: true, goalStateJson: true,
            _count: { select: { registrations: true } },
          },
        },
      },
    }),
    // Die Mitgliederliste braucht nur der Reiter "Legacy" (Altstand), den nur Mods sehen
    isModerator
      ? prisma.user.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true, username: true, image: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
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

  // Spielwahl: kommende Termine ohne Abstimmung (noch nicht ausgelost) — nur für Mods
  const upcomingWithoutVote = isModerator
    ? await prisma.event.findMany({
        where: { seriesId: id, startAt: { gt: new Date() }, gameVote: null, matches: { none: {} } },
        orderBy: { startAt: "asc" },
        take: 5,
        select: { id: true, title: true, startAt: true, game: true },
      })
    : [];
  const squadName = series.squadId
    ? (await prisma.squad.findUnique({ where: { id: series.squadId }, select: { name: true } }))?.name ?? null
    : null;

  // Alle Stat-Felder der Saison-Gruppe — Auswahl für "Stat-Felder zusammenführen" (All-Time-Tabelle)
  const groupStatFields = [...new Set(groupSeasons.flatMap(g => {
    const cfg = parseStatConfig(g.seriesStatConfig);
    const snapshotFields = (parseSeriesCompletion(g.seriesCompletionData).finalStandings?.rows ?? []).flatMap(r => Object.keys(r.stats));
    return [...cfg.stats.map(st => st.field), ...(cfg.eventStatFields ?? []), ...snapshotFields];
  }))].filter(fld => fld && !fld.startsWith("_streak_")).sort((a, b) => a.localeCompare(b, "de"));

  // Mitglieder: Obergrenzen der Ziel-Belohnungen (je Termin einer Reihe) — Anzeige an den Feldern
  // (12) Top 3 der Reihentabelle für die Übersicht (gleiche Rechnung wie die öffentliche Reihen-Seite)
  const standingsSource = await prisma.eventSeries.findUnique({
    where: { id: series.id },
    select: {
      status: true, seriesStatConfig: true, legacyStandings: true, seriesCompletionData: true,
      events: {
        orderBy: { startAt: "asc" },
        select: {
          id: true, status: true, startAt: true, completionData: true, finalRankingJson: true, spectatorMode: true, goalStateJson: true,
          registrations: { select: { userId: true, role: true } },
          matches: { select: { entries: { select: { userId: true, statsJson: true } } } },
        },
      },
    },
  });
  const topRows = standingsSource ? seasonStandings(standingsSource).slice(0, 3) : [];
  const topUsers = topRows.length
    ? await prisma.user.findMany({ where: { id: { in: topRows.map(r => r.userId) } }, select: { id: true, name: true, username: true, image: true } })
    : [];
  const top3 = topRows.flatMap(r => {
    const u = topUsers.find(x => x.id === r.userId);
    return u ? [{ id: u.id, name: u.username ?? u.name ?? "?", image: u.image, points: r.totalPoints }] : [];
  });

  const allLimits = isModerator ? null : await getCommunityLimits();
  const memberLimits = allLimits?.seriesEvent ?? null;
  const rewardLimits = allLimits ? seriesConfigLimits(allLimits) : null;
  const goalLimits = memberLimits ? { coins: memberLimits.goalRewardCoins, seriesPoints: memberLimits.goalSeriesPoints } : null;

  return (
    <>
      {(series.approvalStatus === APPROVAL_PENDING || series.approvalStatus === APPROVAL_REJECTED) && (
        <ApprovalBanner kind="series" id={series.id} canApprove={isModerator}
          rejectedNote={series.approvalStatus === APPROVAL_REJECTED ? series.approvalNote ?? "" : null} />
      )}
      <SeriesDetailClient
        series={series} allUsers={allUsers} squads={squads} hasActiveSibling={hasActiveSibling} isModerator={isModerator}
        isAdmin={user.role === "admin"} canUndoCompletion={canUndoCompletion}
        seasonCount={groupSeasons.length} groupStatFields={groupStatFields}
        goalLimits={goalLimits} rewardLimits={rewardLimits} top3={top3}
      />
      {isModerator && series.status !== "archived" && (
        <GameVoteSettings
          seriesId={series.id}
          initial={parseGameVoteConfig(series.gameVoteJson)}
          fixedGame={series.fixedGame}
          upcoming={upcomingWithoutVote.map(e => ({ ...e, startAt: e.startAt.toISOString() }))}
          squadName={squadName}
        />
      )}
    </>
  );
}
