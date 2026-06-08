"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, CalendarDays, Star, Trophy, User,
  ShoppingBag, Heart, ShieldCheck, LogOut, X, ChevronUp,
} from "lucide-react";

const TABS = [
  { label: "Home",      href: "/dashboard",   icon: LayoutDashboard },
  { label: "Events",    href: "/events",       icon: CalendarDays    },
  { label: "LuL",       href: "/lul",          icon: Star            },
  { label: "Rangliste", href: "/leaderboard",  icon: Trophy          },
  { label: "Profil",    href: "/profile",      icon: User            },
];

const MORE_ITEMS = [
  { label: "Shop",        href: "/shop",       icon: ShoppingBag },
  { label: "Spendenpool", href: "/donations",  icon: Heart       },
];

export default function BottomTabBar() {
  const pathname              = usePathname();
  const { data: session }     = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  const isStaff = (session?.user as { role?: string } | undefined)?.role === "moderator"
    || (session?.user as { role?: string } | undefined)?.role === "admin";
  const userName = session?.user?.name ?? session?.user?.email ?? "?";

  return (
    <>
      {/* ── More-Sheet ───────────────────────────────────────────────── */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-40"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setMoreOpen(false)}
        />
      )}

      <div
        style={{
          position: "fixed",
          bottom: moreOpen ? 72 : -280,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 50,
          width: "min(420px, 96vw)",
          background: "rgba(13,13,15,0.97)",
          border: "1px solid rgba(20,184,166,0.14)",
          borderRadius: 14,
          boxShadow: "0 -8px 40px rgba(0,0,0,0.7)",
          transition: "bottom 320ms cubic-bezier(0.22, 1, 0.36, 1)",
          overflow: "hidden",
        }}
      >
        {/* Sheet header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", outline: "1.5px solid rgba(20,184,166,0.30)", flexShrink: 0 }}>
              {session?.user?.image
                ? <Image src={session.user.image} alt="avatar" width={34} height={34} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #14b8a6, #8b2020)", fontSize: 13, fontWeight: 700, color: "#fff" }}>{userName[0]?.toUpperCase() ?? "?"}</div>
              }
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#fff", margin: 0 }}>{userName}</p>
              <p style={{ fontSize: 11, color: "rgba(20,184,166,0.65)", margin: 0 }}>Mein Konto</p>
            </div>
          </div>
          <button onClick={() => setMoreOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", padding: 6 }}>
            <X style={{ width: 16, height: 16, color: "#6b7280" }} />
          </button>
        </div>

        {/* More nav items */}
        <div style={{ padding: "8px 10px" }}>
          {MORE_ITEMS.map(({ label, href, icon: Icon }) => (
            <Link key={href} href={href} onClick={() => setMoreOpen(false)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", borderRadius: 10, textDecoration: "none", marginBottom: 2,
                background: pathname.startsWith(href) ? "rgba(20,184,166,0.10)" : "transparent",
                border: pathname.startsWith(href) ? "1px solid rgba(20,184,166,0.18)" : "1px solid transparent",
              }}>
              <Icon style={{ width: 18, height: 18, color: pathname.startsWith(href) ? "#2dd4bf" : "#4b5563" }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: pathname.startsWith(href) ? "#2dd4bf" : "#9ca3af" }}>{label}</span>
            </Link>
          ))}

          {isStaff && (
            <Link href="/admin" onClick={() => setMoreOpen(false)}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 12px", borderRadius: 10, textDecoration: "none", marginBottom: 2,
                background: pathname.startsWith("/admin") ? "rgba(153,27,27,0.12)" : "transparent",
                border: pathname.startsWith("/admin") ? "1px solid rgba(153,27,27,0.22)" : "1px solid transparent",
              }}>
              <ShieldCheck style={{ width: 18, height: 18, color: pathname.startsWith("/admin") ? "#f87171" : "#4b5563" }} />
              <span style={{ fontSize: 14, fontWeight: 500, color: pathname.startsWith("/admin") ? "#f87171" : "#9ca3af" }}>Admin</span>
            </Link>
          )}
        </div>

        <div style={{ padding: "4px 10px 12px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
          <button onClick={() => signOut()}
            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 12px", borderRadius: 10, background: "none", border: "none", cursor: "pointer" }}
            className="hover:bg-red-500/8 group/logout">
            <LogOut style={{ width: 18, height: 18, color: "#4b5563" }} className="group-hover/logout:text-red-400 transition-colors" />
            <span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }} className="group-hover/logout:text-red-400 transition-colors">Abmelden</span>
          </button>
        </div>
      </div>

      {/* ── Bottom Tab Bar ───────────────────────────────────────────── */}
      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 45,
          background: "rgba(13,13,15,0.97)",
          borderTop: "1px solid rgba(20,184,166,0.10)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div style={{ display: "flex", alignItems: "stretch", maxWidth: 640, margin: "0 auto" }}>
          {TABS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link key={href} href={href}
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  padding: "10px 0 8px",
                  textDecoration: "none",
                  position: "relative",
                  transition: "background 150ms",
                }}
                className={active ? "" : "hover:bg-white/[0.03]"}
              >
                {/* Active top indicator */}
                {active && (
                  <span style={{
                    position: "absolute",
                    top: 0,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 28,
                    height: 2,
                    borderRadius: "0 0 2px 2px",
                    background: "linear-gradient(90deg, #14b8a6, #2dd4bf)",
                    boxShadow: "0 0 8px rgba(20,184,166,0.7)",
                  }} />
                )}
                <Icon style={{
                  width: 20,
                  height: 20,
                  strokeWidth: active ? 2.5 : 1.8,
                  color: active ? "#2dd4bf" : "#4b5563",
                  filter: active ? "drop-shadow(0 0 5px rgba(20,184,166,0.6))" : "none",
                  transition: "color 150ms, filter 150ms",
                }} />
                <span style={{
                  fontSize: 10,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#2dd4bf" : "#6b7280",
                  letterSpacing: "0.01em",
                  transition: "color 150ms",
                }}>
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(v => !v)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              padding: "10px 0 8px",
              background: "none",
              border: "none",
              cursor: "pointer",
              position: "relative",
            }}
            className="hover:bg-white/[0.03]"
          >
            {moreOpen && (
              <span style={{
                position: "absolute",
                top: 0,
                left: "50%",
                transform: "translateX(-50%)",
                width: 28,
                height: 2,
                borderRadius: "0 0 2px 2px",
                background: "rgba(255,255,255,0.2)",
              }} />
            )}
            <ChevronUp style={{
              width: 20,
              height: 20,
              strokeWidth: 1.8,
              color: moreOpen ? "#e5e7eb" : "#4b5563",
              transform: moreOpen ? "rotate(180deg)" : "none",
              transition: "transform 250ms, color 150ms",
            }} />
            <span style={{ fontSize: 10, fontWeight: 500, color: moreOpen ? "#e5e7eb" : "#6b7280", letterSpacing: "0.01em" }}>
              Mehr
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
