import { prisma } from "./prisma";
import { countPendingApplications } from "./gameservers";
import { APPROVAL_PENDING } from "./community-events";
import type { AdminCounts } from "./admin-nav";

/*
 * Admin: offene Aufgaben für die Zähler in der Seitenleiste (/api/admin/nav-counts) und die
 * Übersicht (/admin). Eine Quelle, damit Zähler und Liste nie auseinanderlaufen.
 */

const NOT_ACTIVE = ["finished", "closed", "archived"];

/** Event-Freigaben: Einzel-Events (nicht in wartender Reihe) und wartende Reihen */
const pendingEventWhere = {
  approvalStatus: APPROVAL_PENDING,
  status: { notIn: ["finished", "closed"] },
  OR: [{ seriesId: null }, { series: { approvalStatus: null } }, { series: { approvalStatus: { not: APPROVAL_PENDING } } }],
};
const pendingSeriesWhere = { approvalStatus: APPROVAL_PENDING, status: "active" };

const DISPUTED = { disputed: true, disputeResolution: "PENDING" } as const;

function overdueWhere(now: Date) {
  return {
    tournamentStatus: null,
    status: { notIn: [...NOT_ACTIVE, "umfrage"] },
    // Events mit Zeitraum gelten erst nach ihrem Ende als "vorbei"
    OR: [{ endAt: null, startAt: { lt: now } }, { endAt: { lt: now } }],
  };
}
const tournamentWhere = { tournamentStatus: { in: ["pending", "active"] }, status: { notIn: [...NOT_ACTIVE, "umfrage"] } };

export async function loadAdminCounts(now: Date = new Date()): Promise<AdminCounts> {
  const [tournaments, polls, overdue, pendingEvents, pendingSeries, servers, games, d1, d2, d3] = await Promise.all([
    prisma.event.count({ where: tournamentWhere }),
    prisma.event.count({ where: { status: "umfrage" } }),
    prisma.event.count({ where: overdueWhere(now) }),
    prisma.event.count({ where: pendingEventWhere }),
    prisma.eventSeries.count({ where: pendingSeriesWhere }),
    countPendingApplications(),
    prisma.game.count({ where: { status: "PENDING" } }),
    prisma.jobReportVote.count({ where: DISPUTED }),
    prisma.jobReportContributionVote.count({ where: DISPUTED }),
    prisma.coachRating.count({ where: DISPUTED }),
  ]);
  return {
    eventActions: tournaments + polls + overdue,
    eventApprovals: pendingEvents + pendingSeries,
    serverApplications: servers,
    gameSuggestions: games,
    jobDisputes: d1 + d2 + d3,
  };
}

export type InboxTone = "amber" | "teal" | "blue" | "red" | "violet";
export type InboxItem = { key: string; tone: InboxTone; icon: string; title: string; hint: string; href: string; action: string };
export type RunningItem = { key: string; title: string; endsAt: Date; href: string };

/** Übersicht: alles, was eine Entscheidung braucht (zu erledigen), und was gerade läuft. */
export async function loadAdminInbox(now: Date = new Date()): Promise<{ todo: InboxItem[]; running: RunningItem[]; counts: AdminCounts }> {
  const [counts, tournaments, pollEvents, overdue, monthly, yearly, dailyPolls] = await Promise.all([
    loadAdminCounts(now),
    prisma.event.findMany({ where: tournamentWhere, orderBy: { startAt: "asc" }, select: { id: true, title: true, tournamentStatus: true } }),
    prisma.event.findMany({
      where: { status: "umfrage" }, orderBy: { startAt: "asc" },
      select: { id: true, title: true, polls: { where: { endAt: { gt: now } }, orderBy: { endAt: "desc" }, select: { endAt: true }, take: 1 } },
    }),
    prisma.event.findMany({ where: overdueWhere(now), orderBy: { startAt: "asc" }, select: { id: true, title: true } }),
    prisma.monthlyClipContest.findMany({ where: { status: "voting" }, orderBy: { votingEndsAt: "asc" }, select: { id: true, month: true, year: true, votingEndsAt: true } }),
    prisma.yearlyClipContest.findMany({ where: { status: "voting" }, orderBy: { votingEndsAt: "asc" }, select: { id: true, year: true, votingEndsAt: true } }),
    prisma.dailyPoll.findMany({ where: { isActive: true, startDate: { lte: now }, endDate: { gt: now } }, orderBy: { endDate: "asc" }, select: { id: true, title: true, endDate: true } }),
  ]);

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const todo: InboxItem[] = [
    ...tournaments.map((e): InboxItem => ({
      key: `t-${e.id}`, tone: "amber", icon: "Trophy", title: e.title, href: `/events/verwalten/${e.id}/bracket`,
      hint: e.tournamentStatus === "active" ? "Turnier läuft, Ergebnisse eintragen" : "Turnier bereit zum Start", action: "Öffnen",
    })),
    ...pollEvents.map((e): InboxItem => ({
      key: `p-${e.id}`, tone: "teal", icon: "Vote", title: e.title, href: `/events/verwalten/${e.id}/complete`,
      hint: e.polls[0] ? "Umfragephase läuft, danach abschließen" : "Umfragephase vorbei, jetzt abschließen", action: "Abschließen",
    })),
    ...overdue.map((e): InboxItem => ({
      key: `o-${e.id}`, tone: "blue", icon: "CalendarClock", title: e.title, href: `/events/verwalten/${e.id}/complete`,
      hint: "Vorbei, noch nicht abgeschlossen", action: "Abschließen",
    })),
  ];
  if (counts.eventApprovals > 0) todo.push({ key: "approvals", tone: "teal", icon: "UserCheck", href: "/events/verwalten",
    title: `${plural(counts.eventApprovals, "Community-Event wartet", "Community-Events warten")} auf Freigabe`, hint: "Erst nach Freigabe gehen Discord-Post und Push raus", action: "Prüfen" });
  if (counts.serverApplications > 0) todo.push({ key: "servers", tone: "teal", icon: "Server", href: "/admin/servers",
    title: plural(counts.serverApplications, "Gameserver-Bewerbung", "Gameserver-Bewerbungen"), hint: "Wartet auf Zusage oder Absage", action: "Prüfen" });
  if (counts.gameSuggestions > 0) todo.push({ key: "games", tone: "teal", icon: "Gamepad2", href: "/admin/spiele",
    title: `${plural(counts.gameSuggestions, "Spiel", "Spiele")} vorgeschlagen`, hint: "Für die Spieleliste freischalten", action: "Prüfen" });
  if (counts.jobDisputes > 0) todo.push({ key: "disputes", tone: "red", icon: "Flag", href: "/admin/community-jobs",
    title: plural(counts.jobDisputes, "Einspruch bei Community-Jobs", "Einsprüche bei Community-Jobs"), hint: "Bewertungen, gegen die Einspruch erhoben wurde", action: "Prüfen" });

  const running: RunningItem[] = [
    ...monthly.map((c) => ({ key: `m-${c.id}`, title: `Clip des Monats · ${c.month}/${c.year}`, endsAt: c.votingEndsAt, href: "/admin/highlight-clips" })),
    ...yearly.map((c) => ({ key: `y-${c.id}`, title: `Clip des Jahres · ${c.year}`, endsAt: c.votingEndsAt, href: "/admin/highlight-clips" })),
    ...dailyPolls.map((p) => ({ key: `d-${p.id}`, title: `Umfrage: ${p.title}`, endsAt: p.endDate, href: "/admin/daily-message" })),
  ].sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());

  return { todo, running, counts };
}
