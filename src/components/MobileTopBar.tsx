"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu, X, LayoutDashboard, CalendarDays, Trophy, Scroll,
  User, Swords, Star, ShieldCheck, LogOut, Zap,
} from "lucide-react";
import { getLevel, getNextLevelPoints } from "@/lib/points";

const NAV = [
  { label: "Dashboard",    href: "/dashboard",  icon: LayoutDashboard },
  { label: "Quests",       href: "/quests",      icon: Scroll },
  { label: "Events",       href: "/events",      icon: CalendarDays },
  { label: "Turnier",      href: "/tournament",  icon: Swords },
  { label: "Rangliste",    href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",  href: "/profile",     icon: User },
];

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/quests":     "Quests",
  "/events":     "Events",
  "/tournament": "Turnier",
  "/leaderboard":"Rangliste",
  "/profile":    "Mein Profil",
  "/admin":      "Admin",
};

export default function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  const role   = session?.user?.role   ?? "user";
  const points = session?.user?.points ?? 0;
  const level  = getLevel(points);
  const nextPts = getNextLevelPoints(points);
  const prevPts = getNextLevelPoints(points - 1);
  const progress = nextPts > prevPts
    ? Math.min(100, Math.round(((points - prevPts) / (nextPts - prevPts)) * 100))
    : 100;
  const isStaff = role === "admin" || role === "moderator";
  const displayName = session?.user?.name ?? "Gast";

  // Page title
  const title = Object.entries(ROUTE_TITLES).find(([p]) =>
    pathname === p || pathname.startsWith(p + "/")
  )?.[1] ?? "OMA";

  return (
    <>
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 z-40 md:hidden h-14 bg-gray-950/95 backdrop-blur-md border-b border-white/5 flex items-center px-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 mr-auto">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-900 shrink-0">
            <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-bold text-white">{title}</span>
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside className={`fixed top-0 left-0 bottom-0 z-50 md:hidden w-72 bg-gray-950 border-r border-white/5 flex flex-col transition-transform duration-300 ease-out ${
        open ? "translate-x-0" : "-translate-x-full"
      }`}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden bg-gray-900">
              <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold text-white">Old Masters Ally</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? "bg-rose-500/10 text-rose-300"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? "text-rose-400" : "text-gray-600"}`} />
                {label}
                {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-rose-400" />}
              </Link>
            );
          })}

          {isStaff && (
            <div className="pt-3">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest px-3 mb-1.5">Verwaltung</p>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all ${
                  pathname.startsWith("/admin")
                    ? "bg-purple-500/10 text-purple-300"
                    : "text-gray-500 hover:text-white hover:bg-white/5"
                }`}
              >
                <ShieldCheck className={`w-5 h-5 ${pathname.startsWith("/admin") ? "text-purple-400" : "text-gray-600"}`} />
                Admin-Bereich
              </Link>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              {session?.user?.image ? (
                <img src={session.user.image} alt="avatar" className="w-10 h-10 rounded-full ring-2 ring-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-700 to-rose-950 flex items-center justify-center text-sm font-bold text-white">
                  {displayName[0]}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-gray-950 shadow-[0_0_6px_#34d399]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-gray-500">Level {level} · {points.toLocaleString("de-DE")} Pts</p>
            </div>
          </div>

          {/* XP bar */}
          <div className="mb-3">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-700 to-rose-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-600 mt-1">
              <span className="flex items-center gap-1"><Zap className="w-2.5 h-2.5 text-amber-500" />Level {level}</span>
              <span>{progress}%</span>
            </div>
          </div>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Abmelden
          </button>
        </div>
      </aside>
    </>
  );
}
