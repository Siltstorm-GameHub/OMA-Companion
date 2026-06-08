"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User,
  ShieldCheck, Star, ShoppingBag, LogOut, Heart,
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
  const [isDesktop,  setIsDesktop]  = useState(false);
  const [expanded,   setExpanded]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const avatarRef    = useRef<HTMLDivElement>(null);
  const leaveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const fn = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setMobileOpen(false);
    };
    document.addEventListener("pointerdown", fn);
    return () => document.removeEventListener("pointerdown", fn);
  }, [mobileOpen]);

  useEffect(() => {
    if (!avatarOpen) return;
    const fn = (e: PointerEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node))
        setAvatarOpen(false);
    };
    document.addEventListener("pointerdown", fn);
    return () => document.removeEventListener("pointerdown", fn);
  }, [avatarOpen]);

  const isStaff = ["admin", "moderator"].includes(session?.user?.role ?? "");

  function onEnter() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setExpanded(true);
  }
  function onLeave() {
    leaveTimer.current = setTimeout(() => setExpanded(false), 60);
  }

  // ── Desktop ────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <nav
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center"
        style={{
          background:    "rgba(13,13,15,0.94)",
          border:        "1px solid rgba(139,92,246,0.14)",
          backdropFilter:"blur(24px)",
          boxShadow:     "0 8px 32px rgba(0,0,0,0.65), 0 0 0 1px rgba(139,92,246,0.06)",
          borderRadius:  12,
          padding:       "5px 8px",
          gap:           6,
        }}
      >
        {/* Logo pill */}
        <Link href="/dashboard"
          className="flex items-center justify-center rounded-xl shrink-0"
          style={{ width: 34, height: 34 }}>
          <div className="w-[26px] h-[26px] rounded-sm overflow-hidden"
            style={{ boxShadow: "0 0 14px rgba(139,92,246,0.35)", outline: "1px solid rgba(139,92,246,0.25)" }}>
            <Image src="/OMALogoNew.png" alt="OMA" width={26} height={26} className="w-full h-full object-cover" />
          </div>
        </Link>

        <Divider />

        {NAV.map(({ label, href, icon: Icon }) => (
          <NavItem key={href}
            label={label} href={href} icon={Icon}
            active={pathname === href || pathname.startsWith(href + "/")}
            expanded={expanded}
          />
        ))}

        {isStaff && <>
          <Divider />
          <NavItem label="Admin" href="/admin" icon={ShieldCheck}
            active={pathname.startsWith("/admin")} expanded={expanded} danger />
        </>}

        <Divider />

        {/* Avatar */}
        <div ref={avatarRef} className="relative">
          <button
            onClick={() => setAvatarOpen(v => !v)}
            className="flex items-center justify-center rounded-xl shrink-0"
            style={{
              width: 34, height: 34,
              background:  avatarOpen ? "rgba(139,92,246,0.14)" : "transparent",
              boxShadow:   avatarOpen ? "0 0 14px rgba(139,92,246,0.20), inset 0 0 0 1px rgba(139,92,246,0.22)" : "none",
              transition:  "background 150ms, box-shadow 150ms",
            }}
            aria-label="Profil-Menü"
          >
            {session?.user?.image
              ? <Image src={session.user.image} alt="avatar" width={26} height={26}
                  className="w-[26px] h-[26px] rounded-full"
                  style={{ outline: "1px solid rgba(139,92,246,0.22)" }} />
              : <div className="w-[26px] h-[26px] rounded-sm flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)", outline: "1px solid rgba(139,92,246,0.3)" }}>
                  {session?.user?.name?.[0] ?? "?"}
                </div>
            }
          </button>

          <div style={{
            position:      "absolute",
            bottom:        "calc(100% + 8px)",
            right:         0,
            background:    "rgba(13,13,15,0.97)",
            border:        "1px solid rgba(139,92,246,0.14)",
            backdropFilter:"blur(24px)",
            boxShadow:     "0 8px 32px rgba(0,0,0,0.7)",
            borderRadius:  8,
            minWidth:      160,
            overflow:      "hidden",
            transformOrigin:"bottom right",
            transform:     avatarOpen ? "scale(1) translateY(0)" : "scale(0.92) translateY(4px)",
            opacity:       avatarOpen ? 1 : 0,
            pointerEvents: avatarOpen ? "auto" : "none",
            transition:    "transform 180ms cubic-bezier(0.16,1,0.3,1), opacity 140ms ease",
          }}>
            <div className="px-3 py-2.5" style={{ borderBottom: "1px solid rgba(139,92,246,0.08)" }}>
              <p className="text-xs font-semibold text-white">{session?.user?.name ?? "Gast"}</p>
              <p className="text-[10px] mt-0.5" style={{ color: "rgba(139,92,246,0.7)" }}>
                {(session?.user as { points?: number })?.points?.toLocaleString("de-DE") ?? 0} Münzen
              </p>
            </div>
            <div className="p-1">
              <Link href="/profile" onClick={() => setAvatarOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs text-gray-400 hover:text-violet-400 hover:bg-violet-500/[0.08] transition-colors">
                <User style={{ width: 13, height: 13 }} /> Mein Profil
              </Link>
              <button onClick={() => signOut()}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors">
                <LogOut style={{ width: 13, height: 13 }} /> Abmelden
              </button>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // ── Mobile ─────────────────────────────────────────────────────
  return (
    <div ref={containerRef}>
      {mobileOpen && (
        <div className="fixed inset-0 z-[44] bg-black/60"
          style={{ backdropFilter: "blur(3px)" }}
          onPointerDown={() => setMobileOpen(false)} />
      )}

      <button
        onClick={() => setMobileOpen(v => !v)}
        className="fixed left-4 bottom-24 z-[46] w-12 h-12 rounded-2xl flex items-center justify-center"
        style={{
          background:    mobileOpen ? "rgba(139,92,246,0.16)" : "rgba(13,13,15,0.94)",
          border:        `1px solid ${mobileOpen ? "rgba(139,92,246,0.35)" : "rgba(139,92,246,0.15)"}`,
          backdropFilter:"blur(20px)",
          boxShadow:     mobileOpen ? "0 0 24px rgba(139,92,246,0.22), 0 4px 20px rgba(0,0,0,0.5)" : "0 4px 20px rgba(0,0,0,0.5)",
          transition:    "all 200ms",
          borderRadius:  10,
        }}
        aria-label="Navigation öffnen"
      >
        <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} className="w-7 h-7 rounded-lg object-cover" />
      </button>

      <div style={{
        position:      "fixed",
        left:          80,
        bottom:        80,
        zIndex:        45,
        background:    "rgba(13,13,15,0.97)",
        border:        "1px solid rgba(139,92,246,0.14)",
        backdropFilter:"blur(24px)",
        boxShadow:     "0 8px 40px rgba(0,0,0,0.70), 0 0 0 1px rgba(139,92,246,0.07)",
        borderRadius:  12,
        minWidth:      200,
        overflow:      "hidden",
        transformOrigin:"bottom left",
        transform:     mobileOpen ? "scale(1) translateY(0)" : "scale(0.88) translateY(10px)",
        opacity:       mobileOpen ? 1 : 0,
        pointerEvents: mobileOpen ? "auto" : "none",
        transition:    "transform 240ms cubic-bezier(0.16,1,0.3,1), opacity 180ms ease",
      }}>
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid rgba(139,92,246,0.08)" }}>
          {session?.user?.image
            ? <Image src={session.user.image} alt="avatar" width={32} height={32}
                className="w-8 h-8 rounded-sm shrink-0" style={{ outline: "1px solid rgba(139,92,246,0.25)" }} />
            : <div className="w-8 h-8 rounded-sm shrink-0 flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #6d28d9, #4f46e5)" }}>
                {session?.user?.name?.[0] ?? "?"}
              </div>
          }
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{session?.user?.name ?? "Gast"}</p>
            <p className="text-xs" style={{ color: "rgba(139,92,246,0.7)" }}>
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
                style={active ? { background: "rgba(139,92,246,0.12)", boxShadow: "inset 0 0 0 1px rgba(139,92,246,0.18)" } : undefined}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-full"
                  style={{ background: "#8b5cf6", boxShadow: "0 0 8px rgba(139,92,246,0.9)" }} />}
                <Icon style={{ width: 17, height: 17, strokeWidth: active ? 2.5 : 2, color: active ? "#a78bfa" : "#4b5563" }} />
                <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "#a78bfa" : "#9ca3af" }}>{label}</span>
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

        <div className="px-2 pb-2" style={{ borderTop: "1px solid rgba(139,92,246,0.07)" }}>
          <button onClick={() => signOut()}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition-colors mt-1.5 text-gray-600 hover:text-red-400">
            <LogOut style={{ width: 17, height: 17 }} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Abmelden</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function Divider() {
  return (
    <div className="h-6 w-px shrink-0" style={{ background: "rgba(139,92,246,0.12)" }} />
  );
}

function NavItem({
  label, href, icon: Icon, active, expanded, danger,
}: {
  label: string; href: string; icon: React.ElementType;
  active: boolean; expanded: boolean; danger?: boolean;
}) {
  const violet = "#a78bfa";
  const red    = "#f87171";
  const accent = danger ? red : violet;

  const iconColor  = active ? accent : "#6b7280";
  const labelColor = active ? accent : "#9ca3af";

  const activeBg     = danger ? "rgba(153,27,27,0.14)"  : "rgba(139,92,246,0.14)";
  const activeShadow = danger
    ? "0 0 12px rgba(153,27,27,0.18), inset 0 0 0 1px rgba(153,27,27,0.22)"
    : "0 0 12px rgba(139,92,246,0.15), inset 0 0 0 1px rgba(139,92,246,0.22)";

  return (
    <Link
      href={href}
      className="relative flex items-center shrink-0 rounded-xl"
      style={{
        height:       34,
        paddingLeft:  expanded ? 10 : 8,
        paddingRight: expanded ? 10 : 8,
        minWidth:     34,
        background:   active ? activeBg     : "transparent",
        boxShadow:    active ? activeShadow : "none",
        // Single consistent transition — never changes, so React/CSS always agree
        transition:   "padding-left 220ms cubic-bezier(0.4,0,0.2,1), padding-right 220ms cubic-bezier(0.4,0,0.2,1), background 150ms ease, box-shadow 150ms ease",
      }}
    >
      <Icon style={{
        width:       18,
        height:      18,
        strokeWidth: active ? 2.5 : 2,
        color:       iconColor,
        filter:      active ? `drop-shadow(0 0 4px ${accent}99)` : "none",
        flexShrink:  0,
        transition:  "color 150ms ease, filter 150ms ease",
      }} />

      {/*
        CSS Grid trick: grid-template-columns 0fr → 1fr is reliably transitionable
        and automatically matches the actual text width — no hardcoded px needed.
        The inner span needs overflow:hidden to clip during the transition.
      */}
      <div style={{
        display:             "grid",
        gridTemplateColumns: expanded ? "1fr" : "0fr",
        marginLeft:          expanded ? 7 : 0,
        transition:          "grid-template-columns 220ms cubic-bezier(0.4,0,0.2,1), margin-left 220ms cubic-bezier(0.4,0,0.2,1)",
      }}>
        <span style={{
          overflow:      "hidden",
          whiteSpace:    "nowrap",
          fontSize:      12,
          fontWeight:    active ? 600 : 500,
          color:         labelColor,
          letterSpacing: "0.01em",
          opacity:       expanded ? 1 : 0,
          transition:    "opacity 140ms ease, color 150ms ease",
        }}>
          {label}
        </span>
      </div>
    </Link>
  );
}
