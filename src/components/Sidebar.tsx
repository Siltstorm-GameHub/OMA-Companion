"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User, Swords,
  LogOut, ShieldCheck, Zap, ChevronLeft, ChevronRight, Scroll, Star,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { getLevel, getNextLevelPoints } from "@/lib/points";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Quests",          href: "/quests",      icon: Scroll },
  { label: "Events",          href: "/events",      icon: CalendarDays },
  { label: "Turnier",         href: "/tournament",  icon: Swords },
  { label: "Level-Up-League", href: "/lul",         icon: Star },
  { label: "Rangliste",       href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",     href: "/profile",     icon: User },
];

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin:     { label: "Admin",    cls: "text-purple-300 bg-purple-500/10 border border-purple-500/20 ring-1 ring-purple-500/10" },
  moderator: { label: "Mod",      cls: "text-blue-300 bg-blue-500/10 border border-blue-500/20" },
  user:      { label: "Mitglied", cls: "text-gray-500 bg-white/[0.04] border border-white/5" },
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((v) => {
      localStorage.setItem("sidebar-collapsed", String(!v));
      return !v;
    });
  }

  const role    = session?.user?.role   ?? "user";
  const points  = session?.user?.points ?? 0;
  const level   = getLevel(points);
  const nextPts = getNextLevelPoints(points);
  const prevPts = getNextLevelPoints(points - 1);
  const progress = nextPts > prevPts
    ? Math.min(100, Math.round(((points - prevPts) / (nextPts - prevPts)) * 100))
    : 100;
  const isStaff = role === "admin" || role === "moderator";
  const { label: roleLabel, cls: roleCls } = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;

  return (
    <aside
      style={{ background: "rgba(9,9,15,0.92)" }}
      className={`flex flex-col shrink-0 border-r border-white/[0.05] backdrop-blur-xl transition-all duration-200 ${
        collapsed ? "w-14" : "w-56"
      }`}
    >
      {/* ── Logo ────────────────────────────────────────────────── */}
      <div className={`flex items-center h-16 border-b border-white/[0.05] relative ${
        collapsed ? "justify-center px-0" : "px-4"
      }`}>
        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          {/* Logo with glow */}
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-[0_0_16px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/20">
            <Image src="/OMALogoNew.png" alt="OMA" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-bold text-white tracking-tight">OMA</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                <span className="text-[10px] text-gray-500 font-medium tracking-wide">ONLINE</span>
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-[#141420] border border-white/10 flex items-center justify-center text-gray-500 hover:text-white hover:border-white/20 hover:bg-[#1a1a28] z-10 shadow-lg"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft  className="w-3 h-3" />}
        </button>
      </div>

      {/* ── Nav ─────────────────────────────────────────────────── */}
      <nav className={`flex-1 py-3 space-y-0.5 overflow-y-auto ${collapsed ? "px-1.5" : "px-2"}`}>
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                active
                  ? "bg-rose-500/10 text-rose-200 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.15)]"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
              }`}
            >
              {/* Active left-border accent */}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              )}

              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? "text-rose-400" : "text-gray-600 group-hover:text-gray-400"
                }`}
              />
              {!collapsed && <span className="flex-1">{label}</span>}

              {/* Tooltip when collapsed */}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#141420] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                  {label}
                </span>
              )}
            </Link>
          );
        })}

        {/* ── Staff section ──────────────────────────────────────── */}
        {isStaff && (
          <div className={`pt-2 ${collapsed ? "" : ""}`}>
            {!collapsed && (
              <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-[0.12em] px-3 mb-1.5 mt-1">
                Verwaltung
              </p>
            )}
            {collapsed && <div className="border-t border-white/[0.05] mx-2 mb-1.5" />}
            <Link
              href="/admin"
              title={collapsed ? "Admin-Bereich" : undefined}
              className={`group relative flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                pathname.startsWith("/admin")
                  ? "bg-purple-500/10 text-purple-200 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.15)]"
                  : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
              }`}
            >
              {pathname.startsWith("/admin") && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
              )}
              <ShieldCheck
                className={`w-4 h-4 shrink-0 ${
                  pathname.startsWith("/admin") ? "text-purple-400" : "text-gray-600 group-hover:text-gray-400"
                }`}
              />
              {!collapsed && "Admin-Bereich"}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#141420] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                  Admin-Bereich
                </span>
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* ── User ─────────────────────────────────────────────────── */}
      <div className={`border-t border-white/[0.05] ${collapsed ? "p-2" : "p-3"}`}>
        {/* Avatar + info */}
        <div className={`flex items-center mb-2.5 ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="relative shrink-0 group">
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt="avatar"
                className="w-8 h-8 rounded-full ring-1 ring-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-600 to-rose-950 flex items-center justify-center text-xs font-bold text-white ring-1 ring-white/10">
                {session?.user?.name?.[0] ?? "?"}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#09090f] shadow-[0_0_8px_#34d399]" />
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg bg-[#141420] border border-white/10 text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl">
                {session?.user?.name ?? "Gast"}
              </span>
            )}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {session?.user?.name ?? "Gast"}
                </p>
                <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-semibold mt-0.5 ${roleCls}`}>
                  {roleLabel}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="text-gray-600 hover:text-white transition-colors p-1 rounded-md hover:bg-white/[0.05] shrink-0"
                title="Abmelden"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* XP bar */}
        {collapsed ? (
          <button
            onClick={() => signOut()}
            title="Abmelden"
            className="w-full flex justify-center p-2 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.04] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="px-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1 text-[10px] text-gray-500">
                <Zap className="w-3 h-3 text-amber-400" />
                <span className="font-medium">Level {level}</span>
              </div>
              <span className="text-[10px] text-gray-600">{progress}%</span>
            </div>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-rose-600 to-rose-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
