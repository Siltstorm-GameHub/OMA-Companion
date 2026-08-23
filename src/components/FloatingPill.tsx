"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import RankedAvatar from "@/components/RankedAvatar";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect, useCallback, useLayoutEffect, forwardRef } from "react";
import {
  LayoutDashboard, CalendarDays, Trophy, ShoppingBag,
  Heart, User, ShieldCheck, LogOut, ChevronDown, Sun, Moon, Bell, Settings, X, MessageCircleMore,
  MonitorSmartphone,
  type LucideIcon,
} from "lucide-react";
import { WHATSAPP_COMMUNITY_URL } from "@/lib/config";
import PollBadge from "@/components/PollBadge";

const NAV = [
  { label: "Dashboard",      href: "/dashboard",   icon: LayoutDashboard },
  { label: "Events",         href: "/events",       icon: CalendarDays    },
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

/*
 * ── NavLink ──────────────────────────────────────────────────────────────
 * Icon + label are always visible (no more hover-only tooltip). The active
 * item's icon and label are duplicated into a floating "bump" capsule
 * rendered by the parent (see `bump` state in FloatingPill) — the real
 * icon/label here just fade out (opacity 0) but keep their layout box so
 * the bump can measure the whole link and slide onto it.
 */
const NavLink = forwardRef<HTMLAnchorElement, {
  label: string; href: string; icon: LucideIcon; active: boolean; danger?: boolean;
}>(function NavLink({ label, href, icon: Icon, active, danger = false }, ref) {
  const [hov, setHov] = useState(false);
  const activeColor   = danger ? "#f87171" : "#2dd4bf";
  const inactiveColor = "var(--nav-icon-inactive)";
  const color = active ? activeColor : hov ? "var(--nav-text-hover)" : inactiveColor;

  return (
    <Link
      ref={ref}
      href={href}
      title={label}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "6px 10px", borderRadius: 9, whiteSpace: "nowrap",
        position: "relative",
        transition: "background 150ms ease, box-shadow 150ms ease",
        background: !active && hov
          ? (danger ? "rgba(153,27,27,0.08)" : "var(--nav-hover-bg)")
          : "transparent",
        boxShadow: !active && hov ? "inset 0 0 0 1px rgba(20,184,166,0.10)" : "none",
      }}
    >
      <span
        data-navicon
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 17, height: 17, flexShrink: 0,
          opacity: active ? 0 : 1,
          transition: "opacity 150ms ease",
        }}
      >
        <Icon style={{ width: 17, height: 17, strokeWidth: active ? 2.4 : 1.8, color, transition: "color 150ms" }} />
      </span>
      <span
        data-navlabel
        style={{
          fontSize: 12.5, fontWeight: active ? 650 : 500, color,
          transition: "color 150ms ease, opacity 150ms ease", lineHeight: 1, letterSpacing: "-0.01em",
          opacity: active ? 0 : 1,
        }}
      >
        {label}
      </span>
    </Link>
  );
});

/* ── FloatingPill ─────────────────────────────────────────────────────── */
/**
 * `mancaveVisible` kommt aus dem Layout, weil das Feature-Flag in der
 * BotConfig liegt und damit nur serverseitig lesbar ist. Solange es aus ist,
 * ist der Eintrag nur für Admins sichtbar — die Mancave ERSETZT "Profil"
 * nicht, sondern kommt als eigener zusätzlicher Slot dazu.
 */
export default function FloatingPill({ mancaveVisible = false }: { mancaveVisible?: boolean }) {
  const pathname          = usePathname();
  const router            = useRouter();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [avatarOpen, setAvatarOpen]     = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]   = useState(0);
  const [bump, setBump] = useState<{ left: number; top: number; width: number } | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const navRef        = useRef<HTMLDivElement>(null);
  const activeLinkRef = useRef<HTMLAnchorElement>(null);

  const isStaff = (session?.user as { role?: string } | undefined)?.role === "moderator"
    || (session?.user as { role?: string } | undefined)?.role === "admin";
  const userName = session?.user?.name ?? session?.user?.email ?? "?";
  const myRankPoints = (session?.user as { rankPoints?: number } | undefined)?.rankPoints ?? 0;

  /*
   * Resolve nav items once: admin gets appended for staff, and each item
   * carries its own active flag (see original NavIcon logic this replaces).
   */
  const NAV_ITEMS: { label: string; href: string; icon: LucideIcon; active: boolean; danger?: boolean; showPollBadge?: boolean }[] =
    NAV.map(({ label, href, icon }) => ({
      label, href, icon,
      active: pathname === href || (href !== "/dashboard" && pathname.startsWith(href)),
      showPollBadge: href === "/events",
    }));
  if (mancaveVisible) {
    NAV_ITEMS.push({ label: "Mancave", href: "/mancave", icon: MonitorSmartphone, active: pathname.startsWith("/mancave") });
  }
  if (isStaff) {
    NAV_ITEMS.push({ label: "Admin", href: "/admin", icon: ShieldCheck, active: pathname.startsWith("/admin"), danger: true });
  }
  const activeItem     = NAV_ITEMS.find(n => n.active);
  const activeIsDanger = !!activeItem?.danger;
  const ActiveIcon     = activeItem?.icon;

  /* Slide the bump capsule onto whichever item is active — covers the whole link (icon + label), not just the icon */
  useLayoutEffect(() => {
    const measure = () => {
      const nav  = navRef.current;
      const link = activeLinkRef.current;
      if (!nav || !link) { setBump(null); return; }
      const navBox  = nav.getBoundingClientRect();
      const linkBox = link.getBoundingClientRect();
      setBump({
        left:  linkBox.left - navBox.left,
        top:   linkBox.top  - navBox.top,
        width: linkBox.width,
      });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [pathname, isStaff, mancaveVisible]);

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
      position: "fixed", top: "calc(var(--top-ticker, 2.25rem) + 8px)", left: "50%",
      transform: "translateX(-50%)", zIndex: 45, alignItems: "center", gap: 2,
      padding: "5px 8px", background: "var(--nav-glass-bg)",
      border: "1px solid var(--nav-glass-border)", borderRadius: 999,
      boxShadow: "var(--nav-shadow)",
      backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
    }}>

      {/* Logo */}
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

      {/* Nav links, always visible, with a bump capsule over the active icon + label */}
      <div ref={navRef} style={{ display: "flex", alignItems: "center", gap: 1, position: "relative" }}>
        {bump && ActiveIcon && activeItem && (
          /*
           * Position/size come from the measured link box, so `left`/`width`
           * do change here (unlike the old icon-only circle, whose fixed
           * diameter let it stay transform-only) — but this is a single,
           * absolutely positioned, non-reflowing decorative element with no
           * siblings to disturb, so the layout cost is negligible; that
           * trade-off buys a correctly proportioned pill (a scaleX trick
           * would squash the border-radius into sharp corners as it stretches).
           */
          <div style={{
            position: "absolute", top: 0, left: bump.left, width: bump.width,
            height: 30, marginTop: -7,
            borderRadius: 15,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            padding: "0 10px",
            background: activeIsDanger ? "#f87171" : "#2dd4bf",
            boxShadow: activeIsDanger
              ? "0 4px 12px rgba(248,113,113,0.45), 0 0 0 4px var(--nav-glass-bg)"
              : "0 4px 12px rgba(45,212,191,0.45), 0 0 0 4px var(--nav-glass-bg)",
            transition: "left 400ms cubic-bezier(0.16, 1, 0.3, 1), width 400ms cubic-bezier(0.16, 1, 0.3, 1), background 150ms ease, box-shadow 150ms ease",
            pointerEvents: "none", zIndex: 2, whiteSpace: "nowrap",
          }}>
            <ActiveIcon style={{ width: 15, height: 15, strokeWidth: 2.4, color: activeIsDanger ? "#450a0a" : "#04342c", flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 650, color: activeIsDanger ? "#450a0a" : "#04342c", lineHeight: 1, letterSpacing: "-0.01em" }}>
              {activeItem.label}
            </span>
          </div>
        )}
        {NAV_ITEMS.map(({ label, href, icon, active, danger, showPollBadge }) => (
          <div key={href} style={{ position: "relative" }}>
            <NavLink
              ref={active ? activeLinkRef : undefined}
              label={label} href={href} icon={icon} active={active} danger={danger}
            />
            {showPollBadge && <PollBadge />}
          </div>
        ))}
      </div>

      <div style={{ width: 1, height: 22, background: "var(--nav-divider)", margin: "0 4px", flexShrink: 0 }} />

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
          className={!avatarOpen ? "hover:bg-[var(--nav-hover-bg)]" : ""}
        >
          <div style={{
            outline: avatarOpen ? "1.5px solid rgba(20,184,166,0.55)" : "1.5px solid var(--nav-divider)",
            borderRadius: 8,
            transition: "outline 150ms",
          }}>
            <RankedAvatar rankPoints={myRankPoints} src={session?.user?.image} alt={userName} size={26} rounded="lg" />
          </div>
          {/* Unread dot */}
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 1, right: 1, width: 8, height: 8,
              borderRadius: "50%", background: "#ef4444",
              boxShadow: "0 0 0 2px var(--nav-glass-bg)",
            }} />
          )}
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
                <p style={{ fontSize: 12, fontWeight: 600, color: "var(--nav-text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</p>
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

            {/* Benachrichtigungen */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 12px 6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Bell style={{ width: 12, height: 12, color: "rgba(20,184,166,0.7)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--nav-text-secondary)" }}>Benachrichtigungen</span>
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
                        style={{ fontSize: 10, color: "var(--nav-icon-inactive)", background: "none", border: "none", cursor: "pointer" }}
                        className="hover:text-teal-400 transition-colors">
                        Alle lesen
                      </button>
                    )}
                    <button onClick={deleteAll}
                      style={{ fontSize: 10, color: "var(--nav-icon-inactive)", background: "none", border: "none", cursor: "pointer" }}
                      className="hover:text-red-400 transition-colors">
                      Alle löschen
                    </button>
                  </div>
                )}
              </div>

              {notifications.length === 0 ? (
                <div style={{ padding: "12px 14px 14px", textAlign: "center" }}>
                  <Bell style={{ width: 22, height: 22, color: "var(--nav-icon-inactive)", margin: "0 auto 6px" }} />
                  <p style={{ fontSize: 12, color: "var(--nav-icon-inactive)", margin: 0 }}>Keine Benachrichtigungen</p>
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
                            color: n.read ? "var(--nav-text-tertiary)" : "var(--nav-text-primary)" }}>
                            {n.title}
                          </p>
                          <p style={{ fontSize: 11, color: "var(--nav-text-tertiary)", margin: "1px 0 0", overflow: "hidden",
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
                            cursor: "pointer", color: "var(--nav-icon-inactive)", opacity: 0, transition: "opacity 150ms" }}
                          className="group-hover:opacity-100 hover:!text-red-400 hover:!bg-red-500/10">
                          <X style={{ width: 11, height: 11 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: "1px solid var(--nav-divider)", padding: "4px 6px" }}>
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
                    padding: "7px 12px", borderRadius: 8, fontSize: 11, color: "var(--nav-icon-inactive)",
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
