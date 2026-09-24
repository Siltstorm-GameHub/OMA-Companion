"use client";
import JobBadge from "@/components/community-jobs/JobBadge";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import RankedAvatar from "@/components/RankedAvatar";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useLayoutEffect, forwardRef } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { ShieldCheck, LogOut, Sun, Moon, MessageCircleMore } from "@/components/icons";
import { WHATSAPP_COMMUNITY_URL } from "@/lib/config";
import PollBadge from "@/components/PollBadge";
import { GateLink, useGuestGate } from "@/components/GuestGate";
import { InkStrokes, NAV_GLYPHS, NavGlyph, useInkSlot } from "@/components/nav/ink-nav";

const NAV = [
  { label: "Home",    href: "/dashboard",   glyph: NAV_GLYPHS.home },
  { label: "Events",  href: "/events",      glyph: NAV_GLYPHS.events },
  { label: "Rang",    href: "/leaderboard", glyph: NAV_GLYPHS.leaderboard },
  { label: "Shop",    href: "/shop",        glyph: NAV_GLYPHS.shop },
  { label: "Spenden", href: "/donations",   glyph: NAV_GLYPHS.donations },
  { label: "Profil",  href: "/profile",     glyph: NAV_GLYPHS.profile },
];

const GLYPH = 22;           // Icon-Größe in der Pille
const STROKE = 46;          // Kantenlänge des Pinselstrich-Paars

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    return (localStorage.getItem("theme") as "dark" | "light" | null) ?? "dark";
  });
  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    const apply = () => {
      setTheme(next);
      localStorage.setItem("theme", next);
      document.documentElement.setAttribute("data-theme", next);
    };
    if (typeof (document as Document & { startViewTransition?: unknown }).startViewTransition === "function") {
      (document as Document & { startViewTransition: (fn: () => void) => void }).startViewTransition(apply);
    } else { apply(); }
  }
  return { theme, toggle };
}

/*
 * ── NavLink ──────────────────────────────────────────────────────────────
 * Icon + Label sind immer sichtbar. Das Pinselstrich-Paar (siehe FloatingPill)
 * sitzt hinter dem Icon des aktiven Links; das Label wird beim aktiven Link
 * weiß hervorgehoben. `glyph` = eigenes Icon, sonst Lucide (nur Admin).
 */
const NavLink = forwardRef<HTMLSpanElement, {
  label: string; href: string; active: boolean; filled: boolean;
  glyph?: string; icon?: LucideIcon; danger?: boolean;
}>(function NavLink({ label, href, active, filled, glyph, icon: Icon, danger = false }, glyphRef) {
  const [hov, setHov] = useState(false);
  const color = danger
    ? (active ? "#f87171" : hov ? "#f87171" : "var(--nav-icon-inactive)")
    : (filled ? "#fff" : "var(--nav-glyph)");

  return (
    <GateLink
      href={href}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "3px 10px 3px 8px", borderRadius: 9, whiteSpace: "nowrap",
        position: "relative", zIndex: 2,
        transition: "background 150ms ease, box-shadow 150ms ease",
        background: !active && hov
          ? (danger ? "rgba(153,27,27,0.08)" : "var(--nav-hover-bg)")
          : "transparent",
        boxShadow: !active && hov ? "inset 0 0 0 1px rgba(20,184,166,0.10)" : "none",
      }}
    >
      <span
        ref={glyphRef}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: GLYPH, height: GLYPH, flexShrink: 0,
        }}
      >
        {glyph
          ? <NavGlyph src={glyph} size={GLYPH} filled={filled} />
          : Icon && <Icon style={{ width: 17, height: 17, strokeWidth: active ? 2.4 : 1.8, color, transition: "color 150ms" }} />}
      </span>
      <span
        style={{
          fontSize: 12.5, fontWeight: active ? 650 : 500, color,
          transition: "color 150ms ease", lineHeight: 1, letterSpacing: "-0.01em",
        }}
      >
        {label}
      </span>
    </GateLink>
  );
});

/* ── FloatingPill ─────────────────────────────────────────────────────── */
export default function FloatingPill({ hideBrandAndProfile = false }: { hideBrandAndProfile?: boolean }) {
  const pathname          = usePathname();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const { isGuest, openGate } = useGuestGate();
  const [avatarOpen, setAvatarOpen]     = useState(false);
  const [strokePos, setStrokePos] = useState<{ x: number; y: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const clipRef       = useRef<HTMLDivElement>(null);
  const glyphRefs     = useRef<(HTMLSpanElement | null)[]>([]);

  const isStaff = (session?.user as { role?: string } | undefined)?.role === "moderator"
    || (session?.user as { role?: string } | undefined)?.role === "admin";
  const userName = session?.user?.name ?? session?.user?.email ?? "?";
  const myRankPoints = (session?.user as { rankPoints?: number } | undefined)?.rankPoints ?? 0;

  const inkItems = NAV.map(({ label, href, glyph }) => ({
    label, href, glyph,
    active: pathname === href || (href !== "/dashboard" && pathname.startsWith(href)),
    showPollBadge: href === "/events",
  }));
  const activeIndex = inkItems.findIndex(n => n.active);
  const { shown, phase } = useInkSlot(activeIndex);
  const adminActive = isStaff && pathname.startsWith("/admin");

  /* Pinselstrich-Paar mittig hinter das Icon des Slots setzen, an dem es gerade sitzt */
  useLayoutEffect(() => {
    const measure = () => {
      const clip = clipRef.current;
      const g = shown >= 0 ? glyphRefs.current[shown] : null;
      if (!clip || !g) { setStrokePos(null); return; }
      const c = clip.getBoundingClientRect();
      const r = g.getBoundingClientRect();
      setStrokePos({ x: r.left - c.left + r.width / 2, y: r.top - c.top + r.height / 2 });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [shown, pathname, isStaff]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div className="hidden lg:flex" style={{
      position: "fixed", top: "calc(var(--top-ticker, 2.25rem) + 8px)", left: "50%",
      transform: "translateX(-50%)", zIndex: 45, alignItems: "center", gap: 2,
      padding: "5px 8px", background: "var(--nav-glass-bg)",
      border: "1px solid var(--nav-glass-border)", borderRadius: 999,
      boxShadow: "var(--nav-shadow)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    }}>

      {/* Logo — auf Battle Cards ausgeblendet (eigener Header dort, siehe DashboardChrome) */}
      {!hideBrandAndProfile && (
        <>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", marginRight: 4, flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, overflow: "hidden",
              boxShadow: "0 0 10px rgba(20,184,166,0.28), 0 0 18px rgba(139,32,32,0.18)",
              outline: "1px solid rgba(20,184,166,0.22)",
            }}>
              <Image src="/brand/logo-256.png" alt="OMA" width={28} height={28}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>
          </Link>
          <div style={{ width: 1, height: 22, background: "var(--nav-divider)", margin: "0 4px", flexShrink: 0 }} />
        </>
      )}

      {/* Nav-Links; das Pinselstrich-Paar liegt hinter dem Icon des aktiven Links */}
      <div style={{ display: "flex", alignItems: "center", gap: 1, position: "relative" }}>
        <div ref={clipRef} style={{
          position: "absolute", top: -5, bottom: -5, left: -4, right: -4,
          overflow: "hidden", borderRadius: 999, pointerEvents: "none", zIndex: 1,
        }}>
          {strokePos && (
            <div style={{
              position: "absolute", left: strokePos.x - STROKE / 2, top: strokePos.y - STROKE / 2,
              transition: "none",
            }}>
              <InkStrokes phase={phase} size={STROKE} />
            </div>
          )}
        </div>
        {inkItems.map(({ label, href, glyph, active, showPollBadge }, i) => (
          <div key={href} style={{ position: "relative" }}>
            <NavLink
              ref={el => { glyphRefs.current[i] = el; }}
              label={label} href={href} glyph={glyph}
              active={active} filled={active && shown === i && phase === "rest"}
            />
            {showPollBadge && <PollBadge />}
          </div>
        ))}
        {isStaff && (
          <NavLink label="Admin" href="/admin" icon={ShieldCheck} active={adminActive} filled={false} danger />
        )}
      </div>

      {/* Avatar + Dropdown — auf Battle Cards ausgeblendet (siehe DashboardChrome) */}
      {!hideBrandAndProfile && isGuest && (
      <>
      <div style={{ width: 1, height: 22, background: "var(--nav-divider)", margin: "0 4px", flexShrink: 0 }} />
      <button
        type="button"
        onClick={() => openGate({ title: "So kommst du rein", message: "Zwei kurze Schritte, dann steht dir alles offen:" })}
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 9, border: "none", cursor: "pointer",
          background: "#5865F2", color: "#fff", fontSize: 12.5, fontWeight: 650, whiteSpace: "nowrap", flexShrink: 0 }}
      >
        Anmelden
      </button>
      </>
      )}

      {!hideBrandAndProfile && !isGuest && (
      <>
      <div style={{ width: 1, height: 22, background: "var(--nav-divider)", margin: "0 4px", flexShrink: 0 }} />

      <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setAvatarOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: avatarOpen ? "rgba(20,184,166,0.10)" : "none",
            border: "none", borderRadius: 8, padding: "3px 5px 3px 3px",
            cursor: "pointer", transition: "background 150ms", position: "relative",
          }}
          className={!avatarOpen ? "hover:bg-[var(--nav-hover-bg)]" : ""}
        >
          <div style={{
            outline: avatarOpen ? "1.5px solid rgba(20,184,166,0.55)" : "1.5px solid var(--nav-divider)",
            borderRadius: 8,
            transition: "outline 150ms",
          }}>
            <RankedAvatar rankPoints={myRankPoints} src={session?.user?.image} alt={userName} size={26} rounded="lg" />
          </div>
          <ChevronDown style={{
            width: 12, height: 12, color: "var(--nav-icon-inactive)",
            transform: avatarOpen ? "rotate(180deg)" : "none", transition: "transform 200ms",
          }} />
        </button>

        {/* Dropdown */}
        {avatarOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0,
            width: 280, background: "var(--nav-dropdown-bg)",
            border: "1px solid var(--nav-dropdown-border)", borderRadius: 12,
            boxShadow: "var(--nav-dropdown-shadow)", zIndex: 60,
            overflow: "hidden",
          }}>
            {/* Header: Avatar + Username + Theme-Icon + Logout-Icon */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", borderBottom: "1px solid var(--nav-divider)",
            }}>
              <RankedAvatar rankPoints={myRankPoints} src={session?.user?.image} alt={userName} size={28} rounded="lg" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--nav-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}<JobBadge userId={(session?.user as { id?: string } | undefined)?.id} variant="compact" className="ml-1" /></p>
                <p style={{ fontSize: 10, color: "rgba(20,184,166,0.6)", margin: "1px 0 0" }}>OMA-Mitglied</p>
              </div>
              {/* Theme toggle — icon only */}
              <button onClick={toggle} title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 7, background: "none", border: "none", cursor: "pointer",
                  color: "var(--nav-icon-inactive)", flexShrink: 0 }}
                className="hover:text-amber-400 hover:bg-[var(--nav-hover-bg)] transition-colors">
                {theme === "dark"
                  ? <Sun style={{ width: 14, height: 14 }} />
                  : <Moon style={{ width: 14, height: 14 }} />}
              </button>
              {/* Logout — icon only */}
              <button onClick={() => { setAvatarOpen(false); signOut(); }}
                title="Abmelden"
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 7, background: "none", border: "none", cursor: "pointer",
                  color: "var(--nav-icon-inactive)", flexShrink: 0 }}
                className="hover:text-red-400 hover:bg-red-500/[0.08] transition-colors">
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>

            <div style={{ padding: "4px 6px" }}>
              <a
                href={WHATSAPP_COMMUNITY_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", gap: 5,
                  padding: "7px 12px", borderRadius: 8, fontSize: 11, color: "#4ade80",
                  textDecoration: "none" }}
                className="hover:bg-green-500/[0.08] transition-colors"
              >
                <MessageCircleMore style={{ width: 11, height: 11 }} />
                WhatsApp Community beitreten
              </a>
            </div>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
}
