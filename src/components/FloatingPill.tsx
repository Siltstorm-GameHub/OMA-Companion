"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutDashboard, CalendarDays, Star, Trophy, ShoppingBag,
  Heart, User, ShieldCheck, LogOut, ChevronDown, Sun, Moon, Bell, Settings, X, MessageCircleMore,
} from "lucide-react";
import { WHATSAPP_COMMUNITY_URL } from "@/lib/config";
import PollBadge from "@/components/PollBadge";

const NAV = [
  { label: "Dashboard",      href: "/dashboard",   icon: LayoutDashboard },
  { label: "Events",         href: "/events",       icon: CalendarDays    },
  { label: "Level-Up-League",href: "/lul",          icon: Star            },
  { label: "Rangliste",      href: "/leaderboard",  icon: Trophy          },
  { label: "Shop",           href: "/shop",         icon: ShoppingBag     },
  { label: "Spendenpool",    href: "/donations",    icon: Heart           },
  { label: "Profil",         href: "/profile",      icon: User            },
];

const NOTIF_ICONS: Record<string, string> = {
  badge:        "🏅",
  quest:        "⭐",
  event_result: "✅",
  event_start:  "⏰",
  points:       "⭐",
  coins:        "💰",
  clip:         "🎬",
  admin:        "📢",
};

type Notification = {
  id: string; type: string; title: string; body: string;
  url?: string | null; read: boolean; createdAt: string;
};

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("theme") as "dark" | "light" | null;
    if (saved) setTheme(saved);
  }, []);
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

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return "Gerade eben";
  if (mins < 60)  return `vor ${mins} Min`;
  const h = Math.floor(mins / 60);
  if (h < 24)     return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d !== 1 ? "en" : ""}`;
}

/* ── Tooltip ──────────────────────────────────────────────────────────── */
function Tooltip({ label }: { label: string }) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 8px)", left: "50%",
      transform: "translateX(-50%)", background: "rgba(13,13,15,0.97)",
      border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6,
      padding: "4px 9px", fontSize: 11, fontWeight: 500,
      color: "rgba(255,255,255,0.75)", whiteSpace: "nowrap",
      pointerEvents: "none", zIndex: 60, boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
    }}>
      {label}
      <div style={{
        position: "absolute", top: -4, left: "50%",
        transform: "translateX(-50%) rotate(45deg)", width: 7, height: 7,
        background: "rgba(13,13,15,0.97)", border: "1px solid rgba(255,255,255,0.08)",
        borderRight: "none", borderBottom: "none",
      }} />
    </div>
  );
}

/* ── NavIcon ──────────────────────────────────────────────────────────── */
function NavIcon({ label, href, icon: Icon, active, danger = false }: {
  label: string; href: string; icon: React.ElementType; active: boolean; danger?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const color = danger ? (active ? "#f87171" : "#4b5563") : (active ? "#2dd4bf" : "#4b5563");
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <Link href={href} style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        width: 36, height: 36, borderRadius: 8,
        background: active ? (danger ? "rgba(153,27,27,0.16)" : "rgba(20,184,166,0.13)") : "transparent",
        boxShadow: active && !danger ? "inset 0 0 0 1px rgba(20,184,166,0.24)"
          : active && danger ? "inset 0 0 0 1px rgba(153,27,27,0.30)" : "none",
        textDecoration: "none", transition: "background 150ms, box-shadow 150ms", position: "relative",
      }} className={!active ? (danger ? "hover:bg-red-900/20" : "hover:bg-white/[0.05]") : ""}>
        {active && (
          <span style={{
            position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)",
            width: 4, height: 4, borderRadius: "50%",
            background: danger ? "#f87171" : "#2dd4bf",
            boxShadow: danger ? "0 0 6px rgba(248,113,113,0.8)" : "0 0 6px rgba(45,212,191,0.8)",
          }} />
        )}
        <Icon style={{
          width: 17, height: 17, strokeWidth: active ? 2.4 : 1.8, color,
          filter: active && !danger ? "drop-shadow(0 0 4px rgba(20,184,166,0.5))" : "none",
          transition: "color 150ms", marginBottom: active ? 3 : 0,
        }} />
      </Link>
      {hovered && <Tooltip label={label} />}
    </div>
  );
}

/* ── FloatingPill ─────────────────────────────────────────────────────── */
export default function FloatingPill() {
  const pathname          = usePathname();
  const router            = useRouter();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [avatarOpen, setAvatarOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const dropRef = useRef<HTMLDivElement>(null);

  const isStaff = (session?.user as { role?: string } | undefined)?.role === "moderator"
    || (session?.user as { role?: string } | undefined)?.role === "admin";
  const userName = session?.user?.name ?? session?.user?.email ?? "?";

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch("/api/notifications/read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    setUnreadCount(prev => {
      const wasUnread = notifications.find(n => n.id === id)?.read === false;
      return wasUnread ? Math.max(0, prev - 1) : prev;
    });
    await fetch("/api/notifications/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function deleteAll() {
    setNotifications([]);
    setUnreadCount(0);
    await fetch("/api/notifications/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  async function handleNotifClick(n: Notification) {
    if (!n.read) await markRead(n.id);
    setAvatarOpen(false);
    if (n.url) router.push(n.url);
  }

  return (
    <div className="hidden lg:flex" style={{
      position: "fixed", top: "calc(2.25rem + 8px)", left: "50%",
      transform: "translateX(-50%)", zIndex: 45, alignItems: "center", gap: 2,
      padding: "5px 8px", background: "rgba(13,13,15,0.94)",
      border: "1px solid rgba(20,184,166,0.13)", borderRadius: 999,
      boxShadow: "0 8px 32px rgba(0,0,0,0.60), 0 0 0 1px rgba(20,184,166,0.06)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    }}>

      {/* Logo */}
      <Link href="/dashboard" style={{ display: "flex", alignItems: "center", marginRight: 4, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, overflow: "hidden",
          boxShadow: "0 0 10px rgba(20,184,166,0.28), 0 0 18px rgba(139,32,32,0.18)",
          outline: "1px solid rgba(20,184,166,0.22)",
        }}>
          <Image src="/OMALogoNew.png" alt="OMA" width={28} height={28}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      </Link>

      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.07)", margin: "0 4px", flexShrink: 0 }} />

      {NAV.map(({ label, href, icon }) => (
        <div key={href} style={{ position: "relative" }}>
          <NavIcon label={label} href={href} icon={icon}
            active={pathname === href || (href !== "/dashboard" && pathname.startsWith(href))} />
          {href === "/events" && <PollBadge />}
        </div>
      ))}
      {isStaff && (
        <NavIcon label="Admin" href="/admin" icon={ShieldCheck}
          active={pathname.startsWith("/admin")} danger />
      )}

      <div style={{ width: 1, height: 22, background: "rgba(255,255,255,0.07)", margin: "0 4px", flexShrink: 0 }} />

      {/* Avatar + dropdown */}
      <div ref={dropRef} style={{ position: "relative", flexShrink: 0 }}>
        <button
          onClick={() => setAvatarOpen(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: avatarOpen ? "rgba(20,184,166,0.10)" : "none",
            border: "none", borderRadius: 8, padding: "3px 5px 3px 3px",
            cursor: "pointer", transition: "background 150ms", position: "relative",
          }}
          className={!avatarOpen ? "hover:bg-white/[0.05]" : ""}
        >
          <div style={{
            width: 26, height: 26, borderRadius: 6, overflow: "hidden",
            outline: avatarOpen ? "1.5px solid rgba(20,184,166,0.55)" : "1.5px solid rgba(255,255,255,0.10)",
            transition: "outline 150ms",
          }}>
            {session?.user?.image
              ? <Image src={session.user.image} alt="avatar" width={26} height={26}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                  justifyContent: "center", background: "linear-gradient(135deg, #14b8a6, #8b2020)",
                  fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  {userName[0]?.toUpperCase() ?? "?"}
                </div>
            }
          </div>
          {/* Unread dot */}
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 1, right: 1, width: 8, height: 8,
              borderRadius: "50%", background: "#ef4444",
              boxShadow: "0 0 0 2px rgba(13,13,15,0.9)",
            }} />
          )}
          <ChevronDown style={{
            width: 12, height: 12, color: "rgba(255,255,255,0.35)",
            transform: avatarOpen ? "rotate(180deg)" : "none", transition: "transform 200ms",
          }} />
        </button>

        {/* Dropdown */}
        {avatarOpen && (
          <div style={{
            position: "absolute", top: "calc(100% + 10px)", right: 0,
            width: 280, background: "rgba(13,13,15,0.97)",
            border: "1px solid rgba(20,184,166,0.12)", borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.7)", zIndex: 60,
            overflow: "hidden",
          }}>
            {/* Header: Avatar + Username + Theme-Icon + Logout-Icon */}
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, overflow: "hidden", flexShrink: 0 }}>
                {session?.user?.image
                  ? <Image src={session.user.image} alt="avatar" width={28} height={28}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
                      justifyContent: "center", background: "linear-gradient(135deg,#0d9488,#115e59)",
                      fontSize: 11, fontWeight: 700, color: "#fff" }}>
                      {userName[0]?.toUpperCase() ?? "?"}
                    </div>
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: "#fff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
                <p style={{ fontSize: 10, color: "rgba(20,184,166,0.6)", margin: "1px 0 0" }}>OMA-Mitglied</p>
              </div>
              {/* Theme toggle — icon only */}
              <button onClick={toggle} title={theme === "dark" ? "Light Mode" : "Dark Mode"}
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 7, background: "none", border: "none", cursor: "pointer",
                  color: "#6b7280", flexShrink: 0 }}
                className="hover:text-amber-400 hover:bg-white/[0.05] transition-colors">
                {theme === "dark"
                  ? <Sun style={{ width: 14, height: 14 }} />
                  : <Moon style={{ width: 14, height: 14 }} />}
              </button>
              {/* Logout — icon only */}
              <button onClick={() => { setAvatarOpen(false); signOut(); }}
                title="Abmelden"
                style={{ width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center",
                  borderRadius: 7, background: "none", border: "none", cursor: "pointer",
                  color: "#6b7280", flexShrink: 0 }}
                className="hover:text-red-400 hover:bg-red-500/[0.08] transition-colors">
                <LogOut style={{ width: 14, height: 14 }} />
              </button>
            </div>

            {/* Benachrichtigungen */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px 6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Bell style={{ width: 12, height: 12, color: "rgba(20,184,166,0.7)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#d1d5db" }}>Benachrichtigungen</span>
                  {unreadCount > 0 && (
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 999,
                      background: "rgba(20,184,166,0.2)", color: "#2dd4bf" }}>
                      {unreadCount}
                    </span>
                  )}
                </div>
                {notifications.length > 0 && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead}
                        style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                        className="hover:text-teal-400 transition-colors">
                        Alle lesen
                      </button>
                    )}
                    <button onClick={deleteAll}
                      style={{ fontSize: 10, color: "#6b7280", background: "none", border: "none", cursor: "pointer" }}
                      className="hover:text-red-400 transition-colors">
                      Alle löschen
                    </button>
                  </div>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: "12px 14px 14px", textAlign: "center" }}>
                  <Bell style={{ width: 22, height: 22, color: "#374151", margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>Keine Benachrichtigungen</p>
                </div>
              ) : (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  {notifications.slice(0, 5).map(n => (
                    <div key={n.id}
                      style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "8px 12px", background: !n.read ? "rgba(20,184,166,0.04)" : "none",
                        transition: "background 100ms", position: "relative",
                      }}
                      className="group hover:bg-white/[0.03]">
                      <button onClick={() => handleNotifClick(n)}
                        style={{ display: "flex", alignItems: "flex-start", gap: 10, flex: 1,
                          background: "none", border: "none", cursor: "pointer", textAlign: "left",
                          minWidth: 0, padding: 0 }}>
                        <span style={{ fontSize: 15, marginTop: 1, flexShrink: 0 }}>
                          {NOTIF_ICONS[n.type] ?? "🔔"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: 0, overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap",
                            color: n.read ? "#9ca3af" : "#e2e8f0" }}>
                            {n.title}
                          </p>
                          <p style={{ fontSize: 11, color: "#6b7280", margin: "1px 0 0", overflow: "hidden",
                            textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {n.body}
                          </p>
                          <p style={{ fontSize: 10, color: "rgba(20,184,166,0.5)", margin: "2px 0 0" }}>
                            {timeAgo(n.createdAt)}
                          </p>
                        </div>
                      </button>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 1 }}>
                        {!n.read && (
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#2dd4bf" }} />
                        )}
                        <button onClick={(e) => deleteNotification(n.id, e)}
                          title="Löschen"
                          style={{ width: 18, height: 18, display: "flex", alignItems: "center",
                            justifyContent: "center", borderRadius: 4, background: "none", border: "none",
                            cursor: "pointer", color: "#4b5563", opacity: 0, transition: "opacity 150ms" }}
                          className="group-hover:opacity-100 hover:!text-red-400 hover:!bg-red-500/10">
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "4px 6px" }}>
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
                <Link href="/profile?tab=notifications" onClick={() => setAvatarOpen(false)}
                  style={{ display: "flex", alignItems: "center", gap: 5,
                    padding: "7px 12px", borderRadius: 8, fontSize: 11, color: "#6b7280",
                    textDecoration: "none" }}
                  className="hover:text-teal-400 hover:bg-teal-500/[0.06] transition-colors">
                  <Settings style={{ width: 11, height: 11 }} />
                  Einstellungen & alle anzeigen
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
