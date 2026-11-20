import { prisma } from "./prisma";
import { countPendingApplications } from "./gameservers";
import { APPROVAL_PENDING, pendingApprovalEventWhere } from "./community-events";
import type { AdminCounts } from "./admin-nav";
import { coinsAwarded, isLate, pulse, type PulseValue } from "./admin-overview";

/*
 * Admin: offene Aufgaben für die Zähler in der Seitenleiste (/api/admin/nav-counts) und die
 * Übersicht (/admin). Eine Quelle, damit Zähler und Liste nie auseinanderlaufen.
 */

// "closed" heißt "voll" — das Event steht noch an bzw. braucht nach dem Ende einen Abschluss
const NOT_ACTIVE = ["finished", "archived"];

/** Event-Freigaben: Einzel-Events (nicht in wartender Reihe) und wartende Reihen */
const pendingEventWhere = pendingApprovalEventWhere;
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
export type InboxItem = {
  key: string; tone: InboxTone; icon: string; title: string; hint: string; href: string; action: string;
  /** Seit wann es ansteht (Wartezeit) — null, wenn unbekannt oder nicht sinnvoll */
  since: Date | null;
  /** Wartet schon zu lange (z.B. Event seit 2+ Tagen nicht abgeschlossen) */
  late?: boolean;
};
export type RunningItem = { key: string; title: string; endsAt: Date; href: string };
export type UpcomingEvent = {
  id: string; title: string; startAt: Date; players: number; maxPlayers: number | null;
  /** Sichtbar und nicht in Freigabe, aber ohne Discord-Ankündigung */
  notAnnounced: boolean;
  awaitingApproval: boolean;
};
export type AdminPulse = { activeMembers: PulseValue; newMembers: PulseValue; participations: PulseValue; coinsAwarded: PulseValue };

const DAY_MS = 24 * 60 * 60 * 1000;
/** Pro Art höchstens so viele Einzel-Einträge, der Rest als Sammelzeile */
const MAX_PER_KIND = 5;
const who = (u: { name: string | null; username: string | null } | null) => u?.username ?? u?.name ?? "Unbekannt";

/**
 * Übersicht: "Dringend" (Turniere, Umfragephasen, vorbei und nicht abgeschlossen) und "Prüfen"
 * (Freigaben, Bewerbungen, Spiel-Vorschläge, Einsprüche) jeweils mit Wartezeit, die nächsten
 * 48 Stunden, der Wochen-Puls und was gerade läuft.
 */
export async function loadAdminInbox(now: Date = new Date()) {
  const in48h = new Date(now.getTime() + 2 * DAY_MS);
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
  const disputeQuery = { where: DISPUTED, orderBy: { createdAt: "asc" as const }, take: 1, select: { createdAt: true } };

  const [
    counts, tournaments, pollEvents, overdue, pendingEvents, pendingSeries, applications, games,
    d1, d2, d3, upcoming, monthly, yearly, dailyPolls,
    activeNow, activePrev, newNow, newPrev, partNow, partPrev, txNow, txPrev,
  ] = await Promise.all([
    loadAdminCounts(now),
    prisma.event.findMany({ where: tournamentWhere, orderBy: { startAt: "asc" }, select: { id: true, title: true, startAt: true, tournamentStatus: true } }),
    prisma.event.findMany({
      where: { status: "umfrage" }, orderBy: { startAt: "asc" },
      select: { id: true, title: true, polls: { orderBy: { endAt: "desc" }, select: { endAt: true }, take: 1 } },
    }),
    prisma.event.findMany({ where: overdueWhere(now), orderBy: { startAt: "asc" }, select: { id: true, title: true, startAt: true, endAt: true } }),
    prisma.event.findMany({
      where: pendingEventWhere, orderBy: { createdAt: "asc" }, take: MAX_PER_KIND,
      select: { id: true, title: true, createdAt: true, createdBy: { select: { name: true, username: true } } },
    }),
    prisma.eventSeries.findMany({
      where: pendingSeriesWhere, orderBy: { createdAt: "asc" }, take: MAX_PER_KIND,
      select: { id: true, name: true, createdAt: true, createdBy: { select: { name: true, username: true } } },
    }),
    prisma.serverApplication.findMany({
      where: { status: "pending" }, orderBy: { appliedAt: "asc" }, take: MAX_PER_KIND,
      select: { id: true, appliedAt: true, server: { select: { name: true } }, user: { select: { name: true, username: true } } },
    }),
    prisma.game.findMany({
      where: { status: "PENDING" }, orderBy: { createdAt: "asc" }, take: MAX_PER_KIND,
      select: { id: true, name: true, createdAt: true, addedBy: { select: { name: true, username: true } } },
    }),
    prisma.jobReportVote.findMany(disputeQuery),
    prisma.jobReportContributionVote.findMany(disputeQuery),
    prisma.coachRating.findMany(disputeQuery),
    prisma.event.findMany({
      where: { startAt: { gte: now, lt: in48h }, status: { notIn: NOT_ACTIVE } },
      orderBy: { startAt: "asc" }, take: 8,
      select: {
        id: true, title: true, startAt: true, maxPlayers: true, hidden: true, discordMessageId: true, approvalStatus: true,
        series: { select: { hidden: true, approvalStatus: true } },
        _count: { select: { registrations: { where: { role: "player" } } } },
      },
    }),
    prisma.monthlyClipContest.findMany({ where: { status: "voting" }, orderBy: { votingEndsAt: "asc" }, select: { id: true, month: true, year: true, votingEndsAt: true } }),
    prisma.yearlyClipContest.findMany({ where: { status: "voting" }, orderBy: { votingEndsAt: "asc" }, select: { id: true, year: true, votingEndsAt: true } }),
    prisma.dailyPoll.findMany({ where: { isActive: true, startDate: { lte: now }, endDate: { gt: now } }, orderBy: { endDate: "asc" }, select: { id: true, title: true, endDate: true } }),
    // Puls: diese Woche vs. Vorwoche
    prisma.user.count({ where: { lastActiveAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { lastActiveAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.eventRegistration.count({ where: { role: "player", joinedAt: { gte: weekAgo } } }),
    prisma.eventRegistration.count({ where: { role: "player", joinedAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.pointTransaction.findMany({ where: { createdAt: { gte: weekAgo }, amount: { gt: 0 } }, select: { amount: true, reason: true } }),
    prisma.pointTransaction.findMany({ where: { createdAt: { gte: twoWeeksAgo, lt: weekAgo }, amount: { gt: 0 } }, select: { amount: true, reason: true } }),
  ]);

  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

  // ── Dringend ──
  const urgent: InboxItem[] = [
    ...tournaments.map((e): InboxItem => ({
      key: `t-${e.id}`, tone: "amber", icon: "Trophy", title: e.title, href: `/events/verwalten/${e.id}/bracket`, since: e.startAt,
      hint: e.tournamentStatus === "active" ? "Turnier läuft, Ergebnisse eintragen" : "Turnier bereit zum Start", action: "Öffnen",
    })),
    ...pollEvents.map((e): InboxItem => {
      const pollEnd = e.polls[0]?.endAt ?? null;
      const open = !!pollEnd && pollEnd > now;
      return {
        key: `p-${e.id}`, tone: "teal", icon: "Vote", title: e.title, href: `/events/verwalten/${e.id}/complete`,
        since: open ? null : pollEnd, late: !open && !!pollEnd && isLate(pollEnd, now),
        hint: open ? "Umfragephase läuft, danach abschließen" : "Umfragephase vorbei, jetzt abschließen", action: "Abschließen",
      };
    }),
    ...overdue.map((e): InboxItem => {
      const since = e.endAt ?? e.startAt;
      const late = isLate(since, now);
      return {
        key: `o-${e.id}`, tone: late ? "red" : "blue", icon: "CalendarClock", title: e.title, href: `/events/verwalten/${e.id}/complete`,
        since, late, action: "Abschließen",
        hint: late ? "Vorbei, noch nicht abgeschlossen · Belohnungen stehen aus" : "Vorbei, noch nicht abgeschlossen",
      };
    }),
  ];
  // Überfälliges zuerst, dann am längsten Wartendes; ohne Wartezeit (läuft gerade) ans Ende
  urgent.sort((a, b) => Number(!!b.late) - Number(!!a.late) || (a.since?.getTime() ?? Infinity) - (b.since?.getTime() ?? Infinity));

  // ── Prüfen ──
  const review: InboxItem[] = [];
  const more = (shown: number, total: number, label: string, href: string, icon: string) => {
    if (total > shown) review.push({ key: `more-${label}`, tone: "teal", icon, title: `+${total - shown} weitere ${label}`, hint: "", href, action: "Alle", since: null });
  };
  for (const s of pendingSeries) review.push({
    key: `ps-${s.id}`, tone: "teal", icon: "UserCheck", href: `/events/verwalten/reihen/${s.id}`, since: s.createdAt, action: "Prüfen",
    title: `Freigabe: Eventreihe „${s.name}“`, hint: `von ${who(s.createdBy)} · erst danach Discord-Post und Push`,
  });
  for (const e of pendingEvents) review.push({
    key: `pe-${e.id}`, tone: "teal", icon: "UserCheck", href: `/events/verwalten/${e.id}`, since: e.createdAt, action: "Prüfen",
    title: `Freigabe: „${e.title}“`, hint: `von ${who(e.createdBy)} · erst danach Discord-Post und Push`,
  });
  more(pendingEvents.length + pendingSeries.length, counts.eventApprovals, "Freigaben", "/events/verwalten", "UserCheck");
  for (const a of applications) review.push({
    key: `sa-${a.id}`, tone: "teal", icon: "Server", href: "/admin/servers", since: a.appliedAt, action: "Prüfen",
    title: `Gameserver-Bewerbung: ${a.server.name}`, hint: `von ${who(a.user)}`,
  });
  more(applications.length, counts.serverApplications, "Bewerbungen", "/admin/servers", "Server");
  for (const g of games) review.push({
    key: `g-${g.id}`, tone: "teal", icon: "Gamepad2", href: "/admin/spiele", since: g.createdAt, action: "Prüfen",
    title: `Spiel vorgeschlagen: ${g.name}`, hint: g.addedBy ? `von ${who(g.addedBy)}` : "für die Spieleliste freischalten",
  });
  more(games.length, counts.gameSuggestions, "Vorschläge", "/admin/spiele", "Gamepad2");
  if (counts.jobDisputes > 0) {
    const oldest = [d1[0]?.createdAt, d2[0]?.createdAt, d3[0]?.createdAt]
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
    review.push({
      key: "disputes", tone: "red", icon: "Flag", href: "/admin/community-jobs", since: oldest, action: "Prüfen",
      title: plural(counts.jobDisputes, "Einspruch bei Community-Jobs", "Einsprüche bei Community-Jobs"), hint: "Bewertungen, gegen die Einspruch erhoben wurde",
    });
  }

  // ── Nächste 48 Stunden ──
  const upcomingEvents: UpcomingEvent[] = upcoming
    .filter((e) => !e.hidden && !e.series?.hidden)
    .map((e) => {
      const awaitingApproval = e.approvalStatus === APPROVAL_PENDING || e.series?.approvalStatus === APPROVAL_PENDING;
      return {
        id: e.id, title: e.title, startAt: e.startAt, players: e._count.registrations, maxPlayers: e.maxPlayers,
        awaitingApproval, notAnnounced: !awaitingApproval && !e.discordMessageId,
      };
    });

  const running: RunningItem[] = [
    ...monthly.map((c) => ({ key: `m-${c.id}`, title: `Clip des Monats · ${c.month}/${c.year}`, endsAt: c.votingEndsAt, href: "/admin/highlight-clips" })),
    ...yearly.map((c) => ({ key: `y-${c.id}`, title: `Clip des Jahres · ${c.year}`, endsAt: c.votingEndsAt, href: "/admin/highlight-clips" })),
    ...dailyPolls.map((p) => ({ key: `d-${p.id}`, title: `Umfrage: ${p.title}`, endsAt: p.endDate, href: "/admin/daily-message" })),
  ].sort((a, b) => a.endsAt.getTime() - b.endsAt.getTime());

  const pulseData: AdminPulse = {
    activeMembers: pulse(activeNow, activePrev),
    newMembers: pulse(newNow, newPrev),
    participations: pulse(partNow, partPrev),
    coinsAwarded: pulse(coinsAwarded(txNow), coinsAwarded(txPrev)),
  };

  return { urgent, review, upcoming: upcomingEvents, running, pulse: pulseData, counts };
}
