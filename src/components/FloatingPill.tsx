"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard, CalendarDays, Star, Trophy, ShoppingBag,
  Heart, User, ShieldCheck, LogOut, ChevronDown,
} from "lucide-react";

const NAV = [
  { label: "Dashboard",      href: "/dashboard",   icon: LayoutDashboard },
  { label: "Events",         href: "/events",       icon: CalendarDays    },
  { label: "Level-Up-League",href: "/lul",          icon: Star            },
  { label: "Rangliste",      href: "/leaderboard",  icon: Trophy          },
  { label: "Shop",           href: "/shop",         icon: ShoppingBag     },
  { label: "Spendenpool",    href: "/donations",    icon: Heart           },
  { label: "Profil",         href: "/profile",      icon: User            },
];

/* ── Tooltip ──────────────────────────────────────────────────────────── */
function Tooltip({ label }: { label: string }) {
  return (
    <div style={{
      position: "absolute",
      top: "calc(100% + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(13,13,15,0.97)",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 6,
      padding: "4px 9px",
      fontSize: 11,
      fontWeight: 500,
      color: "rgba(255,255,255,0.75)",
      whiteSpace: "nowrap",
      pointerEvents: "none",
      zIndex: 60,
      boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    }}>
      {label}
      {/* arrow */}
      <div style={{
        position: "absolute",
        top: -4,
        left: "50%",
        transform: "translateX(-50%) rotate(45deg)",
        width: 7,
        height: 7,
        background: "rgba(13,13,15,0.97)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRight: "none",
        borderBottom: "none",
      }} />
    </div>
  );
}

/* ── NavIcon ──────────────────────────────────────────────────────────── */
function NavIcon({
  label, href, icon: Icon, active, danger = false,
}: { label: string; href: string; icon: React.ElementType; active: boolean; danger?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const color = danger
    ? (active ? "#f87171" : "#4b5563")
    : (active ? "#2dd4bf" : "#4b5563");

  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>
      <Link
        href={href}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: 8,
          background: active
            ? (danger ? "rgba(153,27,27,0.16)" : "rgba(20,184,166,0.13)")
            : "transparent",
          boxShadow: active && !danger
            ? "inset 0 0 0 1px rgba(20,184,166,0.24)"
            : active && danger
            ? "inset 0 0 0 1px rgba(153,27,27,0.30)"
            : "none",
          textDecoration: "none",
          transition: "background 150ms, box-shadow 150ms",
          position: "relative",
        }}
        className={!active ? (danger ? "hover:bg-red-900/20" : "hover:bg-white/[0.05]") : ""}
      >
        {/* Active dot indicator */}
        {active && (
          <span style={{
            position: "absolute",
            bottom: 3,
            left: "50%",
            transform: "translateX(-50%)",
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: danger ? "#f87171" : "#2dd4bf",
            boxShadow: danger ? "0 0 6px rgba(248,113,113,0.8)" : "0 0 6px rgba(45,212,191,0.8)",
          }} />
        )}
        <Icon style={{
          width: 17,
          height: 17,
          strokeWidth: active ? 2.4 : 1.8,
          color,
          filter: active && !danger ? "drop-shadow(0 0 4px rgba(20,184,166,0.5))" : "none",
          transition: "color 150ms",
          marginBottom: active ? 3 : 0,
        }} />
      </Link>
      {hovered && <Tooltip label={label} />}
    </div>
  );
}

/* ── FloatingPill ─────────────────────────────────────────────────────── */
export default function FloatingPill() {
  const pathname          = usePathname();
  const { data: session } = useSession();
  const [avatarOpen, setAvatarOpen] = useState(false);
  const dropRef           = useRef<HTMLDivElement>(null);

  const isStaff   = (session?.user as { role?: string } | undefined)?.role === "moderator"
    || (session?.user as { role?: string } | undefined)?.role === "admin";
  const userName  = session?.user?.name ?? session?.user?.email ?? "?";

  // close dropdown on outside click
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
    <div style={{
      position: "fixed",
      top: 44,           // sits just below the 36px news ticker + 8px gap
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 45,
      display: "flex",
      alignItems: "center",
      gap: 2,
      padding: "5px 8px",
      background: "rgba(13,13,15,0.94)",
      border: "1px solid rgba(20,184,166,0.13)",
      borderRadius: 999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(20,184,166,0.06)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
    }}>

      {/* Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", marginRight: 4, flexShrink: 0 }}>
        <div style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 0 10px rgba(20,184,166,0.28), 0 0 18px rgba(139,32,32,0.18)",
          outline: "1px solid rgba(20,184,166,0.22)",
        }}>
          <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </Link>

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.07)", margin: "0 4px", flexShrink: 0 }} />

      {/* Nav links */}
      {NAV.map(({ label, href, icon }) => (
        <NavIcon
          key={href}
          label={label}
          href={href}
          icon={icon}
          active={pathname === href || (href !== "/dashboard" && pathname.startsWith(href))}
        />
      ))}

      {isStaff && (
        <NavIcon label="Admin" href="/admin" icon={ShieldCheck}
          active={pathname.startsWith("/admin")} danger />
      )}

      {/* Divider */}
      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.07)", margin: "0 4px", flexShrink: 0 }} />

      {/* Avatar + dropdown */}
      <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setAvatarOpen(v => !v)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: avatarOpen ? "rgba(20,184,166,0.10)" : "none",
            border: "none",
            borderRadius: 8,
            padding: "3px 5px 3px 3px",
            cursor: "pointer",
            transition: "background 150ms",
          }}
          className={!avatarOpen ? "hover:bg-white/[0.05]" : ""}
        >
          <div style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            overflow: "hidden",
            outline: avatarOpen ? "1.5px solid rgba(20,184,166,0.55)" : "1.5px solid rgba(255,255,255,0.10)",
            transition: "outline 150ms",
          }}>
            {session?.user?.image
              ? <Image src={session.user.image} alt="avatar" width={26} height={26}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: "linear-gradient(135deg, #14b8a6, #8b2020)", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {userName[0]?.toUpperCase() ?? "?"}
                </div>
            }
          </div>
          <ChevronDown style={{
            width: 12,
            height: 12,
            color: "rgba(255,255,255,0.35)",
            transform: avatarOpen ? "rotate(180deg)" : "none",
            transition: "transform 200ms",
          }} />
        </button>

        {/* Dropdown */}
        {avatarOpen && (
          <div style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            minWidth: 190,
            background: "rgba(13,13,15,0.97)",
            border: "1px solid rgba(20,184,166,0.12)",
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
            overflow: "hidden",
            zIndex: 60,
          }}>
            {/* User info */}
            <div style={{ padding: "12px 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{userName}</p>
              <p style={{ fontSize: 11, color: "rgba(20,184,166,0.65)", margin: "2px 0 0" }}>OMA-Mitglied</p>
            </div>
            <div style={{ padding: "6px 6px" }}>
              <Link href="/profile" onClick={() => setAvatarOpen(false)}
                style={{ display: "flex", alignItems: "center", gap: 9, padding: "9px 10px", borderRadius: 8,
                  fontSize: 13, color: "#9ca3af", textDecoration: "none" }}
                className="hover:text-teal-400 hover:bg-teal-500/[0.08] transition-colors">
                <User style={{ width: 14, height: 14 }} /> Mein Profil
              </Link>
              <button onClick={() => { setAvatarOpen(false); signOut(); }}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 10px",
                  borderRadius: 8, background: "none", border: "none", cursor: "pointer", fontSize: 13 }}
                className="text-gray-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors">
                <LogOut style={{ width: 14, height: 14 }} /> Abmelden
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
