"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { LogOut, Sun, Moon, Bell, Settings, X, ShieldAlert } from "lucide-react";
import PwaInstallButton from "@/components/PwaInstallButton";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

const ROUTE_TITLES: Record<string, string> = {
  "/dashboard":  "Dashboard",
  "/events":     "Events",
  "/shop":       "Shop",
  "/tournament": "Turnier-Details",
  "/lul":        "Level-Up-League",
  "/leaderboard":"Rangliste",
  "/donations":  "Spendenpool",
  "/profile":    "Mein Profil",
  "/points":     "Punktesystem",
  "/admin":      "Admin",
};

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
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  read: boolean;
  createdAt: string;
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
    } else {
      apply();
    }
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

export default function MobileTopBar() {
  const pathname          = usePathname();
  const router            = useRouter();
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const [open, setOpen]   = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef            = useRef<HTMLButtonElement>(null);
  const dropRef           = useRef<HTMLDivElement>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount]     = useState(0);

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
    setMounted(true);
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

  // Schließen bei Außenklick
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => {
      if (
        dropRef.current && !dropRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) setOpen(false);
    };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open]);

  // Schließen bei Seitenwechsel
  useEffect(() => { setOpen(false); }, [pathname]);

  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const wasUnread = notifications.find(n => n.id === id)?.read === false;
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    await fetch("/api/notifications/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function deleteAll() {
    setNotifications([]);
    setUnreadCount(0);
    await fetch("/api/notifications/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  async function handleNotifClick(n: Notification) {
    if (!n.read) await markRead(n.id);
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  const title = Object.entries(ROUTE_TITLES)
    .find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1] ?? "OMA";

  const dropdown = mounted && open ? createPortal(
    <div
      ref={dropRef}
      style={{
        position: "fixed",
        top: "calc(2.25rem + 3.5rem + 0.5rem)",
        right: "1rem",
        zIndex: 9999,
        background: "rgba(4,10,9,0.97)",
        border: "1px solid rgba(20,184,166,0.14)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
        borderRadius: "0.75rem",
        width: 280,
        overflow: "hidden",
      }}
    >
      {/* Header: Avatar + Username + Theme + Abmelden */}
      <div className="px-3 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
        <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
          {session?.user?.image ? (
            <Image src={session.user.image} alt="avatar" width={28} height={28} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: "linear-gradient(135deg, #0d9488, #115e59)" }}>
              {session?.user?.name?.[0] ?? "?"}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white truncate">{session?.user?.name ?? "Gast"}</p>
          <p className="text-[10px] flex items-center gap-1" style={{ color: "rgba(20,184,166,0.7)" }}>
            <img src="/Muenze Icon.png" alt="" width={10} height={10} style={{ objectFit: "contain" }} />
            {(session?.user as { points?: number })?.points?.toLocaleString("de-DE") ?? 0}
          </p>
        </div>
        <button
          onClick={toggle}
          title={theme === "dark" ? "Light Mode" : "Dark Mode"}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-400 hover:bg-white/[0.04] transition-colors shrink-0"
        >
          {theme === "dark"
            ? <Sun style={{ width: 13, height: 13 }} />
            : <Moon style={{ width: 13, height: 13 }} />}
        </button>
        <button
          onClick={() => signOut()}
          title="Abmelden"
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/8 transition-colors shrink-0"
        >
          <LogOut style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {/* PWA Install (klein) */}
      <div className="px-1 pt-1">
        <PwaInstallButton />
      </div>

      {/* Benachrichtigungen */}
      <div style={{ borderTop: "1px solid rgba(20,184,166,0.08)" }}>
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-1.5">
            <Bell style={{ width: 12, height: 12, color: "rgba(20,184,166,0.7)" }} />
            <span className="text-[11px] font-semibold text-gray-300">Benachrichtigungen</span>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: "rgba(20,184,166,0.2)", color: "#2dd4bf" }}>
                {unreadCount}
              </span>
            )}
          </div>
          {notifications.length > 0 && (
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead}
                  className="text-[10px] text-gray-500 hover:text-teal-400 transition-colors">
                  Alle lesen
                </button>
              )}
              <button onClick={deleteAll}
                className="text-[10px] text-gray-500 hover:text-red-400 transition-colors">
                Alle löschen
              </button>
            </div>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-5 px-3 flex flex-col items-center gap-1.5">
            <Bell style={{ width: 20, height: 20, color: "#374151" }} />
            <p className="text-[11px] text-gray-600">Keine Benachrichtigungen</p>
          </div>
        ) : (
          <div style={{ maxHeight: 240, overflowY: "auto" }}>
            {notifications.slice(0, 5).map(n => (
              <div
                key={n.id}
                className="group flex gap-2 items-start px-3 py-2 hover:bg-white/[0.03] transition-colors"
                style={!n.read ? { background: "rgba(20,184,166,0.04)" } : undefined}
              >
                <button
                  onClick={() => handleNotifClick(n)}
                  className="flex gap-2 items-start flex-1 min-w-0 text-left"
                >
                  <span className="text-sm mt-0.5 shrink-0">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold truncate"
                      style={{ color: n.read ? "#9ca3af" : "#e2e8f0" }}>
                      {n.title}
                    </p>
                    <p className="text-[10px] text-gray-500 truncate">{n.body}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: "rgba(20,184,166,0.5)" }}>
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>
                </button>
                <div className="flex items-center gap-1 mt-1 shrink-0">
                  {!n.read && (
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#2dd4bf" }} />
                  )}
                  <button
                    onClick={(e) => deleteNotification(n.id, e)}
                    title="Löschen"
                    className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  >
                    <X style={{ width: 10, height: 10 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: "1px solid rgba(20,184,166,0.06)" }} className="p-1">
          <Link
            href="/profile?tab=notifications"
            onClick={() => setOpen(false)}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-teal-400 hover:bg-teal-500/8 transition-colors"
          >
            <Settings style={{ width: 11, height: 11 }} />
            Einstellungen & alle anzeigen
          </Link>
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <header
        style={{ background: "rgba(4,10,9,0.95)", borderBottom: "1px solid rgba(20,184,166,0.09)", top: "2.25rem" }}
        className="fixed left-0 right-0 z-50 lg:hidden h-14 backdrop-blur-2xl flex items-stretch px-4 gap-3"
      >
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent pointer-events-none" />

        <div className="flex-1 min-w-0 flex items-center">
          <Link href="/dashboard" className="flex items-center min-w-0">
            <span className="text-sm font-semibold text-white truncate">{title}</span>
          </Link>
        </div>

        {/* Admin-Button (nur Staff, nur Mobile) */}
        {(session?.user as { role?: string })?.role === "admin" || (session?.user as { role?: string })?.role === "moderator" ? (
          <Link
            href="/admin"
            className="flex items-center justify-center gap-1.5 px-2.5 rounded-lg transition-colors shrink-0 h-full"
            style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.22)", touchAction: "manipulation" }}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
            <span className="text-xs font-semibold text-red-400">Admin</span>
          </Link>
        ) : null}

        {/* Avatar Button mit Unread-Dot */}
        <button
          ref={btnRef}
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}
          className="overflow-visible flex items-center justify-center transition-all shrink-0 relative h-full"
          style={{
            width: 44,
            touchAction: "manipulation",
            zIndex: 200,
            marginRight: -6,
          }}
          aria-label="Profil-Menü"
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden"
            style={open
              ? { outline: "2px solid rgba(20,184,166,0.5)", outlineOffset: 2 }
              : { outline: "1px solid rgba(20,184,166,0.22)", outlineOffset: 1 }}
          >
            {session?.user?.image ? (
              <Image src={session.user.image} alt="avatar" width={32} height={32} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white"
                style={{ background: "linear-gradient(135deg, #0d9488, #115e59)" }}>
                {session?.user?.name?.[0] ?? "?"}
              </div>
            )}
          </div>
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center"
              style={{ background: "#ef4444", color: "#fff", zIndex: 201, lineHeight: 1 }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </header>

      {dropdown}
    </>
  );
}
