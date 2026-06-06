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

// Primäre Navigation (auch in BottomNav)
const NAV_PRIMARY = [
  { label: "Dashboard",  href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",     href: "/events",      icon: CalendarDays },
  { label: "Shop",       href: "/shop",        icon: ShoppingBag },
  { label: "Rangliste",  href: "/leaderboard", icon: Trophy },
  { label: "Mein Profil",href: "/profile",     icon: User },
];

// Sekundäre Navigation (nur im Drawer)
const NAV_SECONDARY = [
  { label: "Quests",          href: "/quests", icon: Scroll },
  { label: "Level-Up-League", href: "/lul",    icon: Star },
];

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/events":     "Events",
  "/quests":     "Quests",
  "/shop":       "Shop",
  "/auctions":   "Auktionen",
  "/tournament": "Turnier-Details",
  "/lul":        "Level-Up-League",
  "/leaderboard":"Rangliste",
  "/profile":    "Mein Profil",
  "/points":     "Punktesystem",
  "/admin":      "Admin",
};

export default function MobileTopBar() {
  const [open, setOpen]         = useState(false);
  const [dragX, setDragX]       = useState(0);
  const [dragging, setDragging] = useState(false);
  const touchStartX             = React.useRef(0);
  const pathname = usePathname();

  // Drawer automatisch schließen wenn Route wechselt
  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);
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
    if (dragX < -40) setOpen(false);
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
        style={{ background: "rgba(4,10,9,0.95)", borderBottom: "1px solid rgba(20,184,166,0.09)" }}
        className="fixed top-0 left-0 right-0 z-40 md:hidden h-14 backdrop-blur-2xl flex items-center px-4 gap-3"
      >
        {/* Subtile Teal-Linie oben */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

        <Link href="/dashboard" className="flex items-center gap-2.5 mr-auto min-w-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0"
            style={{ boxShadow: "0 0 12px rgba(20,184,166,0.35)", outline: "1px solid rgba(20,184,166,0.25)" }}>
            <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <span className="text-sm font-semibold text-white truncate">{title}</span>
        </Link>

        <button
          onClick={() => setOpen(true)}
          className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-teal-400 hover:bg-teal-500/[0.06] transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </header>

      {/* ── Overlay (z-[48] damit es unter dem Drawer liegt) ────── */}
      {open && (
        <div
          className="fixed inset-0 z-[48] md:hidden bg-black/70"
          onClick={() => setOpen(false)}
          onTouchEnd={() => setOpen(false)}
        />
      )}

      {/* ── Drawer (z-[49]) ─────────────────────────────────────── */}
      <aside
        style={{
          background: "rgba(4,10,9,0.97)",
          borderRight: "1px solid rgba(20,184,166,0.09)",
          transform: open ? `translateX(${Math.max(dragX, -256)}px)` : "translateX(-100%)",
          transition: dragging ? "none" : "transform 300ms cubic-bezier(0.16,1,0.3,1)",
          opacity: open ? Math.max(0.5, 1 + dragX / 256) : 1,
        }}
        className="fixed top-0 left-0 bottom-0 z-[49] md:hidden w-64 flex flex-col backdrop-blur-xl"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Teal-Linie oben */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/50 to-transparent pointer-events-none" />

        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 shrink-0"
          style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0"
              style={{ boxShadow: "0 0 12px rgba(20,184,166,0.35)", outline: "1px solid rgba(20,184,166,0.25)" }}>
              <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Old Masters Ally</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="flex items-center justify-center w-11 h-11 rounded-xl text-gray-400 hover:text-teal-400 hover:bg-teal-500/[0.06] transition-colors active:scale-95"
            aria-label="Menü schließen"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">

          {/* Primäre Links */}
          {NAV_PRIMARY.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  active ? "text-teal-200" : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
                style={active ? {
                  background: "linear-gradient(90deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))",
                  boxShadow: "inset 0 0 0 1px rgba(20,184,166,0.18)",
                } : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-teal-400"
                    style={{ boxShadow: "0 0 8px rgba(20,184,166,0.9)" }} />
                )}
                <Icon className={`w-5 h-5 shrink-0 ${active ? "text-teal-400" : "text-gray-600"}`} />
                {label}
              </Link>
            );
          })}

          {/* Trennlinie + sekundäre Links */}
          <div className="pt-2 mt-1" style={{ borderTop: "1px solid rgba(20,184,166,0.06)" }}>
            <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-[0.12em] px-3 mb-1.5 mt-2">
              Weitere
            </p>
            {NAV_SECONDARY.map(({ label, href, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                    active ? "text-teal-200" : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                  }`}
                  style={active ? {
                    background: "linear-gradient(90deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))",
                    boxShadow: "inset 0 0 0 1px rgba(20,184,166,0.18)",
                  } : undefined}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-teal-400"
                      style={{ boxShadow: "0 0 8px rgba(20,184,166,0.9)" }} />
                  )}
                  <Icon className={`w-5 h-5 shrink-0 ${active ? "text-teal-400" : "text-gray-600"}`} />
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Admin */}
          {isStaff && (
            <div className="pt-2 mt-1" style={{ borderTop: "1px solid rgba(20,184,166,0.06)" }}>
              <p className="text-[9px] font-semibold text-gray-600 uppercase tracking-[0.12em] px-3 mb-1.5 mt-2">
                Verwaltung
              </p>
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  pathname.startsWith("/admin") ? "text-red-200" : "text-gray-500 hover:text-gray-200 hover:bg-white/[0.04]"
                }`}
                style={pathname.startsWith("/admin") ? {
                  background: "linear-gradient(90deg, rgba(153,27,27,0.12), rgba(153,27,27,0.04))",
                  boxShadow: "inset 0 0 0 1px rgba(153,27,27,0.18)",
                } : undefined}
              >
                {pathname.startsWith("/admin") && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-red-700"
                    style={{ boxShadow: "0 0 8px rgba(185,28,28,0.9)" }} />
                )}
                <ShieldCheck className={`w-5 h-5 shrink-0 ${pathname.startsWith("/admin") ? "text-red-500" : "text-gray-600"}`} />
                Admin-Bereich
              </Link>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className="p-4 shrink-0" style={{ borderTop: "1px solid rgba(20,184,166,0.08)" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="relative shrink-0">
              {session?.user?.image ? (
                <Image src={session.user.image} alt="avatar" width={40} height={40}
                  className="w-10 h-10 rounded-full"
                  style={{ outline: "1px solid rgba(20,184,166,0.25)" }} />
              ) : (
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #0d9488, #115e59)", outline: "1px solid rgba(20,184,166,0.3)" }}>
                  {displayName[0]}
                </div>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#040a09] shadow-[0_0_8px_#34d399]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs font-semibold" style={{ color: "#14b8a6" }}>{points.toLocaleString("de-DE")} Punkte</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ThemeToggle />
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm text-gray-500 hover:text-teal-400 hover:bg-teal-500/[0.05] transition-colors shrink-0"
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
