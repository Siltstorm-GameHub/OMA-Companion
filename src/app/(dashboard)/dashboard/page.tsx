import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRank, getNextLevelPoints, getLevel } from "@/lib/points";
import { Trophy, CalendarDays, Star, Users, ChevronRight, Zap, ShieldAlert } from "lucide-react"; // ShieldAlert hinzugefügt
import Link from "next/link";

const MEDAL = ["🥇", "🥈", "🥉"];

const STATUS_CONFIG: Record<string, { label: string; cls: string; dot: string }> = {
  open:   { label: "Offen",  cls: "text-blue-400 bg-blue-500/10",   dot: "bg-blue-400" },
  active: { label: "Läuft",  cls: "text-emerald-400 bg-emerald-500/10", dot: "bg-emerald-400 animate-pulse" },
  closed: { label: "Zu",     cls: "text-amber-400 bg-amber-500/10",  dot: "bg-amber-400" },
};

export default async function DashboardPage() {
  const session = await auth();
  const userId = session?.user?.id;
  // HIER DIE ROLLE AUSLESEN:
  const userRole = (session?.user as { role?: string })?.role;

  const [memberCount, activeEvents, upcomingEvents, topUsers, me] = await Promise.all([
    prisma.user.count(),
    prisma.event.count({ where: { status: { in: ["open", "active"] } } }),
    prisma.event.findMany({
      where: { status: { in: ["open", "active"] }, startAt: { gte: new Date() } },
      orderBy: { startAt: "asc" },
      take: 4,
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.user.findMany({
      orderBy: { points: "desc" },
      take: 5,
      select: { id: true, username: true, name: true, image: true, points: true, level: true },
    }),
    userId
      ? prisma.user.findUnique({
          where: { id: userId },
          select: { points: true, level: true, name: true },
        })
      : null,
  ]);

  const myPoints = me?.points ?? 0;
  const myLevel = getLevel(myPoints);
  const rank = getRank(myPoints);
  const nextPts = getNextLevelPoints(myPoints);
  const prevPts = getNextLevelPoints(myPoints - 1);
  const xpProgress = nextPts > prevPts
    ? Math.min(100, Math.round(((myPoints - prevPts) / (nextPts - prevPts)) * 100))
    : 100;

  const stats = [
    {
      label: "Mitglieder",
      value: memberCount,
      icon: Users,
      sub: "im Server",
      accent: "from-rose-500/20 to-transparent",
      iconCls: "text-rose-400 bg-rose-500/10",
      valCls: "text-rose-100",
    },
    {
      label: "Aktive Events",
      value: activeEvents,
      icon: CalendarDays,
      sub: "gerade offen",
      accent: "from-emerald-500/20 to-transparent",
      iconCls: "text-emerald-400 bg-emerald-500/10",
      valCls: "text-emerald-100",
    },
    {
      label: "Meine Punkte",
      value: myPoints,
      icon: Star,
      sub: rank.label,
      accent: "from-amber-500/20 to-transparent",
      iconCls: "text-amber-400 bg-amber-500/10",
      valCls: "text-amber-100",
    },
    {
      label: "Mein Level",
      value: myLevel,
      icon: Zap,
      sub: `→ ${nextPts.toLocaleString("de-DE")} Pts`,
      accent: "from-rose-500/20 to-transparent",
      iconCls: "text-rose-400 bg-rose-500/10",
      valCls: "text-rose-100",
    },
  ];

  const firstName = me?.name?.split(" ")[0] ?? session?.user?.name?.split(" ")[0] ?? "dort";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-end justify-between">
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Willkommen zurück</p>
            <h1 className="text-2xl font-bold text-white tracking-tight">Hey, {firstName} 👋</h1>
          </div>
          
          {/* HIER DEN ADMIN BUTTON ANZEIGEN, WENN DIE ROLLE PASST */}
          {userRole === "admin" && (
            <Link 
              href="/admin" 
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 transition-all shadow-lg shadow-rose-950/20 h-fit"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Admin Dashboard
            </Link>
          )}
        </div>

        {me && (
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-500 mb-1">Level {myLevel} · {rank.label}</p>
            <div className="w-32 h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-500 transition-all"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">{xpProgress}% zum nächsten Level</p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(({ label, value, icon: Icon, sub, accent, iconCls, valCls }) => (
          <div key={