"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard, CalendarDays, Trophy, User,
  ShieldCheck, Star, ShoppingBag, Heart, LogOut, AlignJustify, X,
} from "lucide-react";

/* ── Navigation items ──────────────────────────────────────────────── */
const NAV_LEFT = [
  { label: "Dashboard", href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",    href: "/events",     icon: CalendarDays    },
  { label: "Shop",      href: "/shop",       icon: ShoppingBag     },
  { label: "LuL",       href: "/lul",        icon: Star            },
];

const NAV_RIGHT = [
  { label: "Rangliste",   href: "/leaderboard", icon: Trophy },
  { label: "Spendenpool", href: "/donations",   icon: Heart  },
  { label: "Profil",      href: "/profile",     icon: User   },
];

const NAV_ALL = [
  { label: "Dashboard",     href: "/dashboard",  icon: LayoutDashboard },
  { label: "Events",        href: "/events",     icon: CalendarDays    },
  { label: "Shop",          href: "/shop",       icon: ShoppingBag     },
  { label: "Level-Up-League", href: "/lul",      icon: Star            },
  { label: "Rangliste",     href: "/leaderboard",icon: Trophy          },
  { label: "Spendenpool",   href: "/donations",  icon: Heart           },
  { label: "Mein Profil",   href: "/profile",    icon: User            },
];

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/events":     "Events",
  "/shop":       "Shop",
  "/lul":        "Level-Up-League",
  "/leaderboard":"Rangliste",
  "/donations":  "Spendenpool",
  "/profile":    "Mein Profil",
  "/tournament": "Turnier",
  "/admin":      "Admin",
};

/* ── Shared style constants ────────────────────────────────────────── */
const GLASS: React.CSSProperties = {
  background:     "rgba(4,10,9,0.92)",
  border:         "1px solid rgba(20,184,166,0.15)",
  backdropFilter: "blur(28px)",
  WebkitBackdropFilter: "blur(28px)",
  boxShadow:      "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(20,184,166,0.06)",
};

const DIVIDER = (
  <div style={{ width: 1, height: 20, background: "rgba(20,184,166,0.12)", margin: "0 6px", flexShrink: 0 }} />
);

/* ── Sub-components ────────────────────────────────────────────────── */
function NavLink({
  label, href, icon: Icon, active, danger = false, compact = false,
}: {
  label: string; href: string; icon: React.ElementType;
  active: boolean; danger?: boolean; compact?: boolean;
}) {
  const activeColor = danger ? "#f87171" : "#2dd4bf";
  const inactiveColor = "#6b7280";
  const color = active ? activeColor : inactiveColor;

  return (
    <Link
      href={href}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 0 : 6,
        padding: compact ? "6px 8px" : "6px 10px",
        borderRadius: 10,
        whiteSpace: "nowrap",
        transition: "background 150ms, color 150ms",
        background: active
          ? (danger ? "rgba(153,27,27,0.14)" : "rgba(20,184,166,0.12)")
          : "transparent",
        boxShadow: active
          ? (danger
            ? "inset 0 0 0 1px rgba(153,27,27,0.22)"
            : "inset 0 0 0 1px rgba(20,184,166,0.20)")
          : "none",
      }}
      className="group/link"
    >
      <Icon
        style={{
          width: 16, height: 16, strokeWidth: active ? 2.5 : 2,
          color, filter: active ? `drop-shadow(0 0 4px ${color})` : "none",
          transition: "all 150ms", flexShrink: 0,
        }}
      />
      {!compact && (
        <span style={{
          fontSize: 12.5, fontWeight: active ? 600 : 500,
          color, transition: "color 150ms", lineHeight: 1,
        }}>
          {label}
        </span>
      )}
    </Link>
  );
}

/* ── Main component ────────────────────────────────────────────────── */
export default function DynamicNotch() {
  const pathname          = usePathname();
  const { data: session } = useSession();

  const [hovered,     setHovered]     = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [avatarOpen,  setAvatarOpen]  = useState(false);
  const [isMobile,    setIsMobile]    = useState(false);

  const notchRef  = useRef<HTMLDivElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* Detect breakpoint */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    setIsMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  /* Close on route change */
  useEffect(() => { setMobileOpen(false); setAvatarOpen(false); }, [pathname]);

  /* Close on outside click */
  useEffect(() => {
    if (!mobileOpen && !avatarOpen) return;
    const h = (e: PointerEvent) => {
      if (notchRef.current && !notchRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
        setAvatarOpen(false);
      }
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [mobileOpen, avatarOpen]);

  /* Hover with small delay to prevent flicker on quick mouse-overs */
  const handleMouseEnter = useCallback(() => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHovered(false), 120);
  }, []);

  /* Derived */
  const title   = Object.entries(ROUTE_TITLES)
    .find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "OMA";
  const role    = (session?.user as { role?: string } | undefined)?.role ?? "user";
  const isStaff = role === "admin" || role === "moderator";
  const userName = session?.user?.name ?? "Gast";
  const coins    = (session?.user as { points?: number } | undefined)?.points?.toLocaleString("de-DE") ?? "0";

  /* ── Avatar pill (shared) ────────────────────────────────────── */
  const AvatarButton = (
    <button
      onClick={() => setAvatarOpen(v => !v)}
      aria-label="Profil-Menü"
      style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        outline: avatarOpen ? "2px solid rgba(20,184,166,0.5)" : "1px solid rgba(20,184,166,0.22)",
        outlineOffset: 2,
        transition: "outline 150ms",
        overflow: "hidden",
      }}
    >
      {session?.user?.image ? (
        <Image src={session.user.image} alt="avatar" width={32} height={32}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #0d9488, #115e59)",
          fontSize: 13, fontWeight: 700, color: "#fff",
        }}>
          {userName[0]?.toUpperCase() ?? "?"}
        </div>
      )}
    </button>
  );

  /* ── Avatar dropdown (shared) ─────────────────────────────────── */
  const AvatarDropdown = avatarOpen && (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 10px)",
        right: 0,
        ...GLASS,
        borderRadius: 14,
        minWidth: 170,
        zIndex: 60,
        animation: "notch-fade-in 180ms ease",
        transformOrigin: "top right",
      }}
    >
      <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{userName}</p>
        <p style={{ fontSize: 11, color: "rgba(20,184,166,0.7)", margin: "2px 0 0" }}>{coins} Münzen</p>
      </div>
      <div style={{ padding: 6 }}>
        <Link href="/profile" onClick={() => setAvatarOpen(false)}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, fontSize: 13, color: "#9ca3af", textDecoration: "none" }}
          className="hover:text-teal-400 hover:bg-teal-500/8 transition-colors">
          <User style={{ width: 13, height: 13 }} /> Mein Profil
        </Link>
        <button onClick={() => signOut()}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", borderRadius: 9, fontSize: 13, color: "#9ca3af", width: "100%", background: "none", border: "none", cursor: "pointer" }}
          className="hover:text-red-400 hover:bg-red-500/8 transition-colors">
          <LogOut style={{ width: 13, height: 13 }} /> Abmelden
        </button>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     MOBILE RENDER
  ══════════════════════════════════════════════════════════════ */
  if (isMobile) {
    return (
      <div ref={notchRef} style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>

        {/* Pill */}
        <div style={{
          ...GLASS,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "6px 10px 6px 8px",
          position: "relative",
        }}>
          {/* Menu toggle */}
          <button
            onClick={() => { setMobileOpen(v => !v); setAvatarOpen(false); }}
            aria-label={mobileOpen ? "Menü schließen" : "Menü öffnen"}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: mobileOpen ? "rgba(20,184,166,0.14)" : "transparent",
              border: mobileOpen ? "1px solid rgba(20,184,166,0.28)" : "1px solid transparent",
              transition: "all 200ms", cursor: "pointer",
            }}
          >
            {mobileOpen
              ? <X    style={{ width: 16, height: 16, color: "#2dd4bf" }} />
              : <AlignJustify style={{ width: 16, height: 16, color: "#6b7280" }} />
            }
          </button>

          {DIVIDER}

          {/* Logo */}
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, overflow: "hidden", boxShadow: "0 0 10px rgba(20,184,166,0.30)", outline: "1px solid rgba(20,184,166,0.22)" }}>
              <Image src="/OMALogoNew.png" alt="OMA" width={26} height={26} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </Link>

          {/* Page title */}
          <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", letterSpacing: "-0.01em" }}>
            {title}
          </span>

          {DIVIDER}

          {/* Avatar */}
          <div style={{ position: "relative" }}>
            {AvatarButton}
            {AvatarDropdown}
          </div>
        </div>

        {/* Mobile dropdown — slides down below pill */}
        {mobileOpen && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            left: "50%",
            ...GLASS,
            borderRadius: 16,
            minWidth: 220,
            overflow: "hidden",
            animation: "notch-slide-down 280ms cubic-bezier(0.16,1,0.3,1)",
          }}>
            {/* User info header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px 10px", borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", flexShrink: 0, outline: "1px solid rgba(20,184,166,0.22)" }}>
                {session?.user?.image ? (
                  <Image src={session.user.image} alt="avatar" width={34} height={34} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #0d9488, #115e59)", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                    {userName[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{userName}</p>
                <p style={{ fontSize: 11, color: "rgba(20,184,166,0.7)", margin: 0 }}>{coins} Münzen</p>
              </div>
            </div>

            {/* Nav links */}
            <nav style={{ padding: "6px 8px" }}>
              {NAV_ALL.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <Link key={href} href={href}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "10px 10px", borderRadius: 10,
                      background: active ? "rgba(20,184,166,0.12)" : "transparent",
                      boxShadow: active ? "inset 0 0 0 1px rgba(20,184,166,0.20)" : "none",
                      textDecoration: "none", position: "relative",
                      transition: "background 150ms",
                      marginBottom: 2,
                    }}>
                    {active && (
                      <span style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: 3, height: 16, borderRadius: 999, background: "#14b8a6", boxShadow: "0 0 8px rgba(20,184,166,0.9)" }} />
                    )}
                    <Icon style={{ width: 16, height: 16, strokeWidth: active ? 2.5 : 2, color: active ? "#2dd4bf" : "#4b5563", flexShrink: 0 }} />
                    <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 500, color: active ? "#2dd4bf" : "#9ca3af" }}>{label}</span>
                  </Link>
                );
              })}

              {isStaff && (
                <Link href="/admin"
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 10px", borderRadius: 10, textDecoration: "none",
                    background: pathname.startsWith("/admin") ? "rgba(153,27,27,0.12)" : "transparent",
                    boxShadow: pathname.startsWith("/admin") ? "inset 0 0 0 1px rgba(153,27,27,0.20)" : "none",
                    transition: "background 150ms",
                  }}>
                  <ShieldCheck style={{ width: 16, height: 16, strokeWidth: 2, color: pathname.startsWith("/admin") ? "#f87171" : "#4b5563" }} />
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: pathname.startsWith("/admin") ? "#f87171" : "#9ca3af" }}>Admin</span>
                </Link>
              )}
            </nav>

            {/* Logout */}
            <div style={{ padding: "4px 8px 8px", borderTop: "1px solid rgba(20,184,166,0.07)" }}>
              <button onClick={() => signOut()}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 10px", borderRadius: 10, background: "none", border: "none", cursor: "pointer", transition: "background 150ms" }}
                className="hover:bg-red-500/8 group/logout">
                <LogOut style={{ width: 16, height: 16, color: "#4b5563" }} className="group-hover/logout:text-red-400 transition-colors" />
                <span style={{ fontSize: 13.5, fontWeight: 500, color: "#6b7280" }} className="group-hover/logout:text-red-400 transition-colors">Abmelden</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════
     DESKTOP RENDER
  ══════════════════════════════════════════════════════════════ */
  return (
    <div
      ref={notchRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: "fixed", top: 10, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}
    >
      <div style={{
        ...GLASS,
        borderRadius: 999,
        display: "flex",
        alignItems: "center",
        padding: "6px 10px",
        position: "relative",
        transition: "box-shadow 300ms ease",
        boxShadow: hovered
          ? "0 12px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(20,184,166,0.18), 0 0 30px rgba(20,184,166,0.06)"
          : "0 8px 32px rgba(0,0,0,0.55), 0 0 0 1px rgba(20,184,166,0.06)",
      }}>

        {/* ── LEFT expansion: nav links ─────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center",
          maxWidth: hovered ? 340 : 0,
          overflow: "hidden",
          transition: "max-width 480ms cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 2, paddingRight: 4,
            opacity: hovered ? 1 : 0,
            transition: "opacity 250ms ease " + (hovered ? "120ms" : "0ms"),
          }}>
            {NAV_LEFT.map(({ label, href, icon }) => (
              <NavLink key={href} label={label} href={href} icon={icon}
                active={pathname === href || pathname.startsWith(href + "/")} />
            ))}
            {isStaff && (
              <NavLink label="Admin" href="/admin" icon={ShieldCheck}
                active={pathname.startsWith("/admin")} danger />
            )}
          </div>
          <div style={{ width: 1, height: 20, background: "rgba(20,184,166,0.12)", flexShrink: 0, opacity: hovered ? 1 : 0, transition: "opacity 250ms ease " + (hovered ? "120ms" : "0ms"), marginRight: 6 }} />
        </div>

        {/* ── CENTER: always visible ────────────────────────────────── */}
        {/* Logo */}
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", flexShrink: 0, marginRight: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 9, overflow: "hidden", boxShadow: "0 0 12px rgba(20,184,166,0.30)", outline: "1px solid rgba(20,184,166,0.22)" }}>
            <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        </Link>

        {/* Page title */}
        <span style={{
          fontSize: 13, fontWeight: 600, color: "#fff",
          whiteSpace: "nowrap", letterSpacing: "-0.01em",
          marginRight: 10, flexShrink: 0,
        }}>
          {title}
        </span>

        {DIVIDER}

        {/* Avatar + dropdown */}
        <div style={{ position: "relative", flexShrink: 0, marginLeft: 4 }}>
          {AvatarButton}
          {AvatarDropdown}
        </div>

        {/* ── RIGHT expansion: nav links ────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center",
          maxWidth: hovered ? 260 : 0,
          overflow: "hidden",
          transition: "max-width 480ms cubic-bezier(0.16,1,0.3,1)",
        }}>
          <div style={{ width: 1, height: 20, background: "rgba(20,184,166,0.12)", flexShrink: 0, opacity: hovered ? 1 : 0, transition: "opacity 250ms ease " + (hovered ? "120ms" : "0ms"), marginLeft: 6 }} />
          <div style={{
            display: "flex", alignItems: "center", gap: 2, paddingLeft: 4,
            opacity: hovered ? 1 : 0,
            transition: "opacity 250ms ease " + (hovered ? "120ms" : "0ms"),
          }}>
            {NAV_RIGHT.map(({ label, href, icon }) => (
              <NavLink key={href} label={label} href={href} icon={icon}
                active={pathname === href || pathname.startsWith(href + "/")} />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
