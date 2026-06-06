"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User,
  LogOut, ShieldCheck, ChevronLeft, ChevronRight, Scroll, Star, ShoppingBag, Target,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",          href: "/events",      icon: CalendarDays },
  { label: "Shop",            href: "/shop",        icon: ShoppingBag },
  { label: "Level-Up-League", href: "/lul",         icon: Star },
  { label: "Rangliste",       href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",     href: "/profile",     icon: User },
];

const ROLE_CONFIG: Record<string, { label: string; cls: string }> = {
  admin:     { label: "Admin",    cls: "text-teal-300 bg-teal-500/10 border border-teal-500/20 ring-1 ring-teal-500/10" },
  moderator: { label: "Mod",      cls: "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20" },
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

  useEffect(() => {
    fetch("/api/shop/goal")
      .then(r => r.json())
      .then(data => setGoal(data))
      .catch(() => {});
  }, [pathname]);

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
      style={{ background: "rgba(4,10,9,0.94)", borderRight: "1px solid rgba(20,184,166,0.09)" }}
      className={`hidden md:flex flex-col shrink-0 backdrop-blur-2xl transition-all duration-200 ${
        collapsed ? "w-14" : "w-48"
      }`}
    >
      {/* ── Logo ────────────────────────────────────────────────── */}
      <div className={`flex items-center h-16 border-b relative ${
        collapsed ? "justify-center px-0" : "px-4"
      }`} style={{ borderColor: "rgba(20,184,166,0.09)" }}>
        {/* Teal top accent line */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent" />

        <div className={`flex items-center gap-2.5 min-w-0 ${collapsed ? "justify-center" : ""}`}>
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-[0_0_20px_rgba(20,184,166,0.40)] ring-1 ring-teal-500/35">
            <Image src="/OMALogoNew.png" alt="OMA" width={36} height={36} className="w-full h-full object-cover" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-black text-white tracking-widest uppercase">OMA</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.9)] glow-active" />
                <span className="text-[10px] text-teal-400/80 font-semibold tracking-widest uppercase">Online</span>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={toggle}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-teal-400 z-10 shadow-lg transition-colors"
          style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.15)" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
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
              className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                active
                  ? "text-teal-200"
                  : "text-gray-500 hover:text-gray-100 hover:bg-white/[0.04]"
              }`}
              style={active ? {
                background: "linear-gradient(90deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))",
                boxShadow: "inset 0 0 0 1px rgba(20,184,166,0.18)",
              } : undefined}
            >
              {/* Teal left-border accent */}
              {active && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-teal-400"
                  style={{ boxShadow: "0 0 10px rgba(20,184,166,0.9), 0 0 20px rgba(20,184,166,0.5)" }} />
              )}
              {active && collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-teal-400"
                  style={{ boxShadow: "0 0 10px rgba(20,184,166,0.9)" }} />
              )}

              <Icon className={`w-4 h-4 shrink-0 transition-all ${
                active
                  ? "text-teal-400 drop-shadow-[0_0_6px_rgba(20,184,166,0.9)]"
                  : "text-gray-600 group-hover:text-gray-300"
              }`} />
              {!collapsed && <span className={`flex-1 font-medium ${active ? "font-semibold" : ""}`}>{label}</span>}

              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl"
                  style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.15)" }}>
                  {label}
                </span>
              )}
            </Link>
          );
        })}

        {/* Staff section */}
        {isStaff && (
          <div className="pt-2">
            {!collapsed && (
              <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-[0.12em] px-3 mb-1.5 mt-1">
                Verwaltung
              </p>
            )}
            {collapsed && <div className="mx-2 mb-1.5" style={{ borderTop: "1px solid rgba(20,184,166,0.08)" }} />}
            <Link
              href="/admin"
              title={collapsed ? "Admin-Bereich" : undefined}
              className={`group relative flex items-center rounded-xl text-sm font-medium transition-all duration-150 ${
                collapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2.5"
              } ${
                pathname.startsWith("/admin")
                  ? "text-red-200"
                  : "text-gray-500 hover:text-gray-100 hover:bg-white/[0.04]"
              }`}
              style={pathname.startsWith("/admin") ? {
                background: "linear-gradient(90deg, rgba(153,27,27,0.12), rgba(153,27,27,0.04))",
                boxShadow: "inset 0 0 0 1px rgba(153,27,27,0.18)",
              } : undefined}
            >
              {pathname.startsWith("/admin") && !collapsed && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-red-700"
                  style={{ boxShadow: "0 0 10px rgba(185,28,28,0.9), 0 0 20px rgba(185,28,28,0.5)" }} />
              )}
              <ShieldCheck className={`w-4 h-4 shrink-0 ${
                pathname.startsWith("/admin") ? "text-red-500 drop-shadow-[0_0_6px_rgba(185,28,28,0.8)]" : "text-gray-600 group-hover:text-gray-400"
              }`} />
              {!collapsed && "Admin-Bereich"}
              {collapsed && (
                <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl"
                  style={{ background: "#0a1512", border: "1px solid rgba(153,27,27,0.15)" }}>
                  Admin-Bereich
                </span>
              )}
            </Link>
          </div>
        )}
      </nav>

      {/* ── Theme toggle ─────────────────────────────────────────── */}
      <div className={`${collapsed ? "px-1.5 pb-1" : "px-2 pb-1"}`}>
        <ThemeToggle collapsed={collapsed} />
      </div>

      {/* ── User + Sparziel ──────────────────────────────────────── */}
      <div className={`${collapsed ? "p-2" : "p-3"}`}
        style={{ borderTop: "1px solid rgba(20,184,166,0.08)" }}>
        <div className={`flex items-center mb-2.5 ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <div className="relative shrink-0 group">
            {session?.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={32} height={32}
                className="w-8 h-8 rounded-full ring-1" style={{ "--tw-ring-color": "rgba(20,184,166,0.25)" } as React.CSSProperties} />
            ) : (
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ring-1"
                style={{ background: "linear-gradient(135deg, #0d9488, #115e59)", "--tw-ring-color": "rgba(20,184,166,0.3)" } as React.CSSProperties}>
                {session?.user?.name?.[0] ?? "?"}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#040a09] glow-active"
              style={{ boxShadow: "0 0 8px #34d399" }} />
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2.5 px-2.5 py-1 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 shadow-xl"
                style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.15)" }}>
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
              <button onClick={() => signOut()}
                className="text-gray-600 hover:text-teal-400 transition-colors p-1 rounded-md hover:bg-teal-500/[0.06] shrink-0"
                title="Abmelden">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Punkte + Sparziel */}
        {collapsed ? (
          <button onClick={() => signOut()} title="Abmelden"
            className="w-full flex justify-center p-2 rounded-lg text-gray-600 hover:text-teal-400 hover:bg-teal-500/[0.04] transition-colors">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="px-0.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-teal-400 font-bold">{points.toLocaleString("de-DE")} Punkte</span>
              {goal && (
                <Link href="/shop" className="text-[10px] text-gray-600 hover:text-teal-400 transition-colors flex items-center gap-0.5">
                  <Target className="w-2.5 h-2.5" />
                  {goal.pct}%
                </Link>
              )}
            </div>
            {goal ? (
              <>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(20,184,166,0.08)" }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${goal.pct}%`, background: "linear-gradient(90deg, #0d9488, #14b8a6, #2dd4bf)", boxShadow: "0 0 8px rgba(20,184,166,0.6)" }} />
                </div>
                <p className="text-[9px] text-gray-600 mt-1 truncate">
                  {goal.item.icon} {goal.item.name} · noch {goal.left.toLocaleString("de-DE")} Pts
                </p>
              </>
            ) : (
              <Link href="/shop" className="block">
                <div className="h-1 rounded-full overflow-hidden hover:bg-teal-500/[0.07] transition-colors" style={{ background: "rgba(20,184,166,0.04)" }} />
                <p className="text-[9px] text-gray-700 mt-1 hover:text-gray-500 transition-colors">Sparziel im Shop setzen →</p>
              </Link>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
