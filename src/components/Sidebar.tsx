"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User,
  LogOut, ShieldCheck, ChevronLeft, ChevronRight, Scroll, Star, Activity, ShoppingBag, Target, Gavel,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Feed",            href: "/feed",        icon: Activity },
  { label: "Events",          href: "/events",      icon: CalendarDays },
  { label: "Quests",          href: "/quests",      icon: Scroll },
  { label: "Shop",            href: "/shop",        icon: ShoppingBag },
  { label: "Auktionen",       href: "/auctions",    icon: Gavel },
  { label: "Level-Up-League", href: "/lul",         icon: Star },
  { label: "Rangliste",       href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",     href: "/profile",     icon: User },
];

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin:     { label: "Admin",    cls: "text-purple-300 bg-purple-500/10 border border-purple-500/20 ring-1 ring-purple-500/10" },
  moderator: { label: "Mod",      cls: "text-blue-300 bg-blue-500/10 border border-blue-500/20" },
  user:      { label: "Mitglied", cls: "text-gray-500 bg-white/[0.04] border border-white/5" },
};

interface GoalData {
  item:   { id: string; name: string; icon: string; price: number };
  points: number;
  pct:    number;
  left:   number;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [goal, setGoal] = useState<GoalData | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  // Sparziel laden
  useEffect(() => {
    fetch("/api/shop/goal")
      .then(r => r.json())
      .then(data => setGoal(data))
      .catch(() => {});
  }, [pathname]); // bei Navigation neu laden

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem("sidebar-collapsed", String(!v));
      return !v;
    });
  }

  const role    = session?.user?.role   ?? "user";
  const points  = session?.user?.points ?? 0;
  const isStaff = role === "admin" || role === "moderator";
  const { label: roleLabel, cls: roleCls } = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;

  return (
    <aside
      style={{ background: "rgba(6,9,20,0.92)", borderRight: "1px solid rgba(255,255,255,0.07)" }}
      className={`flex flex-col shrink-0 backdrop-blur-2xl transition-all duration-200 ${
        collapsed ? "w-14" : "w-48"
      }`}
    >
      {/* ── Logo ────────────────────────────────────────────────── */}
      <div className={`flex items-center h-16 border-b border-white/[0.05] relative ${
        collapsed ? "justify-center px-0" : "px-4"
      }`}>
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/40 to-transparent" />
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-[0_0_20px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/30">
            <Image src="/OMALogoNew.png" alt="OMA" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-black text-white tracking-widest uppercase">OMA</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] glow-active" />
                <span className="text-[10px] text-emerald-500/80 font-semibold tracking-widest uppercase">Online</span>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={toggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#141420] border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 hover:bg-[#1a1a28] z-10 shadow-lg"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto ${collapsed ? "px-1.5" : "px-2"}`}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link key={href} href={href} title={collapsed ? label : undefined}
              className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                active
                  ? "bg-gradient-to-r from-rose-500/15 to-rose-500/5 text-rose-200 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.2)]"
                  : "text-gray-500 hover:text-gray-100 hover:bg-white/[0.05]"
              }`}>
              {active && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8),0_0_20px_rgba(244,63,94,0.4)]" />}
              {active && collapsed  && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-rose-400 shadow-[0_0_10px_rgba(244,63,94,0.8)]" />}
              <Icon className={`w-4 h-4 shrink-0 transition-all ${active ? "text-rose-400 drop-shadow-[0_0_6px_rgba(244,63,94,0.8)]" : "text-gray-600 group-hover:text-gray-300"}`} />
              {!collapsed && <span className={`flex-1 font-medium ${active ? "font-semibold" : ""}`}>{label}</span>}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#141420] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                  {label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Staff */}
        {isStaff && (
          <div className="pt-2">
            {!collapsed && <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-[0.12em] px-3 mb-1.5 mt-1">Verwaltung</p>}
            {collapsed   && <div className="border-t border-white/[0.05] mx-2 mb-1.5" />}
            <Link href="/admin" title={collapsed ? "Admin-Bereich" : undefined}
              className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                pathname.startsWith("/admin")
                  ? "bg-gradient-to-r from-purple-500/15 to-purple-500/5 text-purple-200 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.2)]"
                  : "text-gray-500 hover:text-gray-100 hover:bg-white/[0.05]"
              }`}>
              {pathname.startsWith("/admin") && !collapsed && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.8),0_0_20px_rgba(168,85,247,0.4)]" />}
              <ShieldCheck className={`w-4 h-4 shrink-0 ${pathname.startsWith("/admin") ? "text-purple-400" : "text-gray-600 group-hover:text-gray-400"}`} />
              {!collapsed && "Admin-Bereich"}
              {collapsed && <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#141420] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">Admin-Bereich</span>}
            </Link>
          </div>
        )}
      </nav>

      {/* ── Theme toggle ─────────────────────────────────────────── */}
      <div className={`${collapsed ? "px-1.5 pb-1" : "px-2 pb-1"}`}>
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* ── User + Sparziel ──────────────────────────────────────── */}
      <div className={`border-t border-white/[0.05] ${collapsed ? "p-2" : "p-3"}`}>
        {/* Avatar + info */}
        <div className={`flex items-center mb-2.5 ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="relative shrink-0 group">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={32} height={32} className="w-8 h-8 rounded-full ring-1 ring-white/10" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-600 to-rose-950 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10">
                {session?.user?.name?.[0] ?? "?"}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080c18] shadow-[0_0_8px_#34d399] glow-active" />
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#141420] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                {session?.user?.name ?? "Gast"}
              </span>
            )}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">{session?.user?.name ?? "Gast"}</p>
                <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold mt-0.5 ${roleCls}`}>{roleLabel}</span>
              </div>
              <button onClick={() => signOut()} className="text-gray-600 hover:text-white transition-colors p-1 rounded-md hover:bg-white/[0.05] shrink-0" title="Abmelden">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Punkte + Sparziel */}
        {collapsed ? (
          <button onClick={() => signOut()} title="Abmelden"
            className="w-full flex justify-center p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.04] transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="px-0.5">
            {/* Punkte-Anzeige */}
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-amber-400 font-bold">{points.toLocaleString("de-DE")} Punkte</span>
              {goal && (
                <Link href="/shop" className="text-[10px] text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-0.5">
                  <Target className="w-2.5 h-2.5" />
                  {goal.pct}%
                </Link>
              )}
            </div>

            {/* Sparziel-Balken */}
            {goal ? (
              <>
                <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 shadow-[0_0_6px_rgba(245,158,11,0.5)] transition-all duration-700"
                    style={{ width: `${goal.pct}%` }}
                  />
                </div>
                <p className="text-[9px] text-gray-600 mt-1 truncate">
                  {goal.item.icon} {goal.item.name} · noch {goal.left.toLocaleString("de-DE")} Pts
                </p>
              </>
            ) : (
              <Link href="/shop" className="block">
                <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden hover:bg-white/[0.07] transition-colors" />
                <p className="text-[9px] text-gray-700 mt-1 hover:text-gray-500 transition-colors">Sparziel im Shop setzen →</p>
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
