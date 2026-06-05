"use client";
import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Menu, X, LayoutDashboard, CalendarDays, Trophy, Scroll,
  User, Star, ShieldCheck, LogOut, ShoppingBag,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",          href: "/events",      icon: CalendarDays },
  { label: "Quests",          href: "/quests",      icon: Scroll },
  { label: "Shop",            href: "/shop",        icon: ShoppingBag },
  { label: "Level-Up-League", href: "/lul",         icon: Star },
  { label: "Rangliste",       href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",     href: "/profile",     icon: User },
];

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/feed":       "Aktivitäts-Feed",
  "/events":     "Events",
  "/quests":     "Quests",
  "/tournament": "Turnier-Details",
  "/lul":        "Level-Up-League",
  "/leaderboard":"Rangliste",
  "/profile":    "Mein Profil",
  "/admin":      "Admin",
};

export default function MobileTopBar() {
  const [open, setOpen]         = useState(false);
  const [dragX, setDragX]       = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX             = React.useRef(0);
  const pathname = usePathname();
  const { data: session } = useSession();

  // Swipe-to-close: swipe left ≥ 60 px closes the drawer
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    setDragging(true);
    setDragX(0);
  }
  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientX - touchStartX.current;
    if (delta < 0) setDragX(delta); // only track leftward swipe
  }
  function onTouchEnd() {
    setDragging(false);
    if (dragX < -60) setOpen(false);
    setDragX(0);
  }

  const role      = session?.user?.role   ?? "user";
  const points    = session?.user?.points ?? 0;
  const isStaff   = role === "admin" || role === "moderator";
  const displayName = session?.user?.name ?? "Gast";

  const title = Object.entries(ROUTE_TITLES)
    .find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "OMA";

  return (
    <>
      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header
        style={{ background: "rgba(9,9,15,0.9)" }}
        className="fixed top-0 left-0 right-0 z-40 md:hidden h-14 backdrop-blur-2xl border-b border-white/[0.06] flex items-center px-4 gap-3"
      >
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-auto min-w-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 ring-1 ring-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
            <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-semibold text-white truncate">{title}</span>
        </Link>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Overlay ─────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Drawer ──────────────────────────────────────────────── */}
      <aside
        style={{
          background: "rgba(9,9,15,0.97)",
          transform: open ? `translateX(${Math.max(dragX, -288)}px)` : "translateX(-100%)",
          transition: dragging ? "none" : "transform 300ms cubic-bezier(0.16,1,0.3,1)",
          opacity: open ? Math.max(0.5, 1 + dragX / 288) : 1,
        }}
        className="fixed top-0 left-0 bottom-0 z-50 md:hidden w-72 border-r border-white/[0.06] flex flex-col backdrop-blur-xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-white/[0.06] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.2)]">
              <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Old Masters Ally</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  active
                    ? "bg-rose-500/10 text-rose-200 shadow-[inset_0_0_0_1px_rgba(244,63,94,0.15)]"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                )}
                <Icon className={`w-5 h-5 ${active ? "text-rose-400" : "text-gray-600"}`} />
                {label}
              </Link>
            );
          })}

          {isStaff && (
            <div className="pt-3">
              <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-[0.12em] px-3 mb-1.5">Verwaltung</p>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  pathname.startsWith("/admin")
                    ? "bg-purple-500/10 text-purple-200 shadow-[inset_0_0_0_1px_rgba(168,85,247,0.15)]"
                    : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
              >
                {pathname.startsWith("/admin") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.6)]" />
                )}
                <ShieldCheck className={`w-5 h-5 ${pathname.startsWith("/admin") ? "text-purple-400" : "text-gray-600"}`} />
                Admin-Bereich
              </Link>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="avatar" width={40} height={40} className="w-10 h-10 rounded-full ring-1 ring-white/10" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-600 to-rose-950 flex items-center justify-center text-sm font-bold text-white ring-1 ring-white/10">
                  {displayName[0]}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080c18] shadow-[0_0_8px_#34d399]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs text-amber-400 font-semibold">{points.toLocaleString("de-DE")} Punkte</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ThemeToggle />
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-white hover:bg-white/[0.05] transition-colors shrink-0"
              title="Abmelden"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
