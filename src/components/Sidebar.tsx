"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User,
  ShieldCheck, Star, ShoppingBag, LogOut, Heart, ChevronUp,
} from "lucide-react";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";

const NAV = [
  { label: "Dashboard",       href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",          href: "/events",      icon: CalendarDays },
  { label: "Shop",            href: "/shop",        icon: ShoppingBag },
  { label: "Level-Up-League", href: "/lul",         icon: Star },
  { label: "Rangliste",       href: "/leaderboard", icon: Trophy },
  { label: "Spendenpool",     href: "/donations",   icon: Heart },
  { label: "Mein Profil",     href: "/profile",     icon: User },
];

export default function Sidebar() {
  const pathname          = usePathname();
  const { data: session } = useSession();
  const [isDesktop, setIsDesktop] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close mobile menu on outside tap
  useEffect(() => {
    if (!mobileOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setMobileOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [mobileOpen]);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarOpen) return;
    const onPointer = (e: PointerEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node))
        setAvatarOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [avatarOpen]);

  const role    = session?.user?.role ?? "user";
  const isStaff = role === "admin" || role === "moderator";

  // ── Desktop: horizontal bottom bar ────────────────────────────
  if (isDesktop) {
    return (
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-3 py-2 rounded-2xl"
        style={{
          background: "rgba(4,10,9,0.90)",
          border: "1px solid rgba(20,184,166,0.12)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(20,184,166,0.06)",
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="group relative flex items-center justify-center w-9 h-9 mr-1">
          <div className="w-7 h-7 rounded-xl overflow-hidden" style={{ boxShadow: "0 0 14px rgba(20,184,166,0.35)", outline: "1px solid rgba(20,184,166,0.25)" }}>
            <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-full h-full object-cover" />
          </div>
          <Tooltip label="OMA Home" dir="up" />
        </Link>

        <Divider vertical />

        {NAV.map(({ label, href, icon: Icon }) => (
          <NavIcon key={href} label={label} href={href} icon={Icon}
            active={pathname === href || pathname.startsWith(href + "/")} />
        ))}

        {isStaff && (
          <>
            <Divider vertical />
            <NavIcon label="Admin" href="/admin" icon={ShieldCheck} active={pathname.startsWith("/admin")} danger />
          </>
        )}

        <Divider vertical />

        {/* Avatar + logout dropdown */}
        <div ref={avatarRef} className="relative flex items-center justify-center">
          <button
            onClick={() => setAvatarOpen(v => !v)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
            style={avatarOpen ? { background: "rgba(20,184,166,0.14)", boxShadow: "0 0 14px rgba(20,184,166,0.20), inset 0 0 0 1px rgba(20,184,166,0.22)" } : undefined}
            aria-label="Profil-Menü"
          >
            {session?.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={28} height={28}
                className="w-7 h-7 rounded-full" style={{ outline: "1px solid rgba(20,184,166,0.22)" }} />
            ) : (
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #115e59)", outline: "1px solid rgba(20,184,166,0.3)" }}>
                {session?.user?.name?.[0] ?? "?"}
              </div>
            )}
          </button>

          {/* Dropdown */}
          <div
            className="absolute bottom-full mb-2 right-0 rounded-xl overflow-hidden"
            style={{
              background: "rgba(4,10,9,0.97)",
              border: "1px solid rgba(20,184,166,0.14)",
              backdropFilter: "blur(24px)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              minWidth: 160,
              transformOrigin: "bottom right",
              transform: avatarOpen ? "scale(1) translateY(0)" : "scale(0.9) translateY(6px)",
              opacity: avatarOpen ? 1 : 0,
              pointerEvents: avatarOpen ? "auto" : "none",
              transition: "transform 200ms cubic-bezier(0.16,1,0.3,1), opacity 150ms ease",
            }}
          >
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
              <p className="text-xs font-semibold text-white">{session?.user?.name ?? "Gast"}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(20,184,166,0.7)" }}>
                {(session?.user as { points?: number })?.points?.toLocaleString("de-DE") ?? 0} Münzen
              </p>
            </div>
            <div className="p-1">
              <Link href="/profile" onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-teal-400 hover:bg-teal-500/8 transition-colors w-full">
                <User style={{ width: 13, height: 13 }} />
                Mein Profil
              </Link>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/8 transition-colors w-full"
              >
                <LogOut style={{ width: 13, height: 13 }} />
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Mobile: floating round FAB + popup panel ───────────────────
  return (
    <div ref={containerRef}>
      {mobileOpen && (
        <div className="fixed inset-0 z-[44] bg-black/60" style={{ backdropFilter: "blur(3px)" }}
          onPointerDown={() => setMobileOpen(false)} />
      )}

      {/* FAB */}
      <button
        onClick={() => setMobileOpen(v => !v)}
        className="fixed left-4 bottom-24 z-[46] w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{
          background: mobileOpen ? "rgba(20,184,166,0.18)" : "rgba(4,10,9,0.92)",
          border: `1px solid ${mobileOpen ? "rgba(20,184,166,0.35)" : "rgba(20,184,166,0.18)"}`,
          backdropFilter: "blur(20px)",
          boxShadow: mobileOpen
            ? "0 0 24px rgba(20,184,166,0.25), 0 4px 20px rgba(0,0,0,0.5)"
            : "0 4px 20px rgba(0,0,0,0.5)",
          transition: "all 200ms",
        }}
        aria-label="Navigation öffnen"
      >
        <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
      </button>

      {/* Popup */}
      <div
        className="fixed left-20 bottom-20 z-[45] rounded-2xl overflow-hidden"
        style={{
          background: "rgba(4,10,9,0.97)",
          border: "1px solid rgba(20,184,166,0.14)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(20,184,166,0.07)",
          minWidth: 200,
          transformOrigin: "bottom left",
          transform: mobileOpen ? "scale(1) translateY(0)" : "scale(0.85) translateY(12px)",
          opacity: mobileOpen ? 1 : 0,
          pointerEvents: mobileOpen ? "auto" : "none",
          transition: "transform 250ms cubic-bezier(0.16,1,0.3,1), opacity 200ms ease",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
          {session?.user?.image ? (
            <Image src={session.user.image} alt="avatar" width={32} height={32}
              className="w-8 h-8 rounded-full shrink-0" style={{ outline: "1px solid rgba(20,184,166,0.22)" }} />
          ) : (
            <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #115e59)" }}>
              {session?.user?.name?.[0] ?? "?"}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session?.user?.name ?? "Gast"}</p>
            <p className="text-xs" style={{ color: "rgba(20,184,166,0.7)" }}>
              {(session?.user as { points?: number })?.points?.toLocaleString("de-DE") ?? 0} Münzen
            </p>
          </div>
        </div>

        <nav className="px-2 py-2 space-y-0.5">
          {NAV.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative"
                style={active ? { background: "rgba(20,184,166,0.12)", boxShadow: "inset 0 0 0 1px rgba(20,184,166,0.20)" } : undefined}>
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full"
                    style={{ background: "#14b8a6", boxShadow: "0 0 8px rgba(20,184,166,0.9)" }} />
                )}
                <Icon style={{ width: 17, height: 17, strokeWidth: active ? 2.5 : 2, color: active ? "#2dd4bf" : "#4b5563" }} />
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "#2dd4bf" : "#9ca3af" }}>{label}</span>
              </Link>
            );
          })}

          {isStaff && (
            <Link href="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative"
              style={pathname.startsWith("/admin") ? { background: "rgba(153,27,27,0.12)", boxShadow: "inset 0 0 0 1px rgba(153,27,27,0.20)" } : undefined}>
              <ShieldCheck style={{ width: 17, height: 17, strokeWidth: 2, color: pathname.startsWith("/admin") ? "#f87171" : "#4b5563" }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: pathname.startsWith("/admin") ? "#f87171" : "#9ca3af" }}>Admin</span>
            </Link>
          )}
        </nav>

        <div className="px-2 pb-2" style={{ borderTop: "1px solid rgba(20,184,166,0.07)" }}>
          <button onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors mt-1.5 text-gray-500 hover:text-teal-400">
            <LogOut style={{ width: 17, height: 17 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Abmelden</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-components ───────────────────────────────────────

function Divider({ vertical }: { vertical?: boolean }) {
  return vertical
    ? <div className="h-6 w-px mx-0.5" style={{ background: "rgba(20,184,166,0.10)" }} />
    : <div className="w-6 h-px my-0.5" style={{ background: "rgba(20,184,166,0.10)" }} />;
}

function Tooltip({ label, dir = "up" }: { label: string; dir?: "up" | "right" }) {
  const pos = dir === "up"
    ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
    : "left-full ml-3 top-1/2 -translate-y-1/2";
  return (
    <span
      className={`pointer-events-none absolute ${pos} px-2.5 py-1 rounded-lg text-white text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50`}
      style={{ background: "#0a1512", border: "1px solid rgba(20,184,166,0.15)", boxShadow: "0 4px 12px rgba(0,0,0,0.4)" }}
    >
      {label}
    </span>
  );
}

function NavIcon({ label, href, icon: Icon, active, danger }: {
  label: string; href: string; icon: React.ElementType; active: boolean; danger?: boolean;
}) {
  const color  = danger ? (active ? "#f87171" : "#4b5563") : (active ? "#2dd4bf" : "#4b5563");
  const bg     = danger ? "rgba(153,27,27,0.14)" : "rgba(20,184,166,0.14)";
  const shadow = danger
    ? "0 0 14px rgba(153,27,27,0.20), inset 0 0 0 1px rgba(153,27,27,0.22)"
    : "0 0 14px rgba(20,184,166,0.20), inset 0 0 0 1px rgba(20,184,166,0.22)";

  return (
    <Link href={href}
      className="group relative flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-150"
      style={active ? { background: bg, boxShadow: shadow } : undefined}>
      <Icon style={{ width: 18, height: 18, strokeWidth: active ? 2.5 : 2, color, filter: active ? `drop-shadow(0 0 5px ${color})` : "none", transition: "all 150ms" }} />
      <Tooltip label={label} dir="up" />
    </Link>
  );
}
