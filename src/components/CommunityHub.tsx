"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { HUB_TOGGLE_EVENT, publishHubBadge } from "@/lib/hub-events";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Bell, Settings } from "@/components/icons";
import Link from "next/link";
import RankedAvatar from "@/components/RankedAvatar";
import { Tabs } from "@/components/admin/Tabs";
import { usePolling } from "@/lib/usePolling";
import { useMediaQuery } from "@/lib/useMediaQuery";
import EventThreadsPanel from "@/components/events/EventThreadsPanel";
import { eventIdFromCommentsUrl, type EventThreadDTO } from "@/lib/event-comments-shared";

const NOTIF_DISPLAY_LIMIT = 30;

interface PresenceUser {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  rankPoints: number;
}

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  url?: string | null;
  read: boolean;
  createdAt: string;
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
  game:         "🎮",
  event_comment: "💬",
};

function displayName(u: { name: string | null; username: string | null }) {
  return u.username ?? u.name ?? "User";
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

/**
 * Knopf unten rechts mit Panel: Benachrichtigungen + Event-Absprachen (Schnellzugriff auf die
 * Kommentare der eigenen Events — ersetzt die frühere Community-Lobby) und die Online-Leiste.
 */
export function CommunityHub() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "threads">("notifications");
  const [threads, setThreads] = useState<EventThreadDTO[]>([]);
  const [threadsLoaded, setThreadsLoaded] = useState(false);
  const [threadsUnread, setThreadsUnread] = useState(0);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const threadsEtagRef = useRef<string | null>(null);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifUnread, setNotifUnread] = useState(0);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(data.notifications);
      setNotifUnread(data.unreadCount);
    } catch { /* Netzwerkfehler ignorieren */ }
  }, []);


  async function markRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setNotifUnread(prev => Math.max(0, prev - 1));
    await fetch("/api/notifications/read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function markAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setNotifUnread(0);
    await fetch("/api/notifications/read", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  async function deleteNotification(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const wasUnread = notifications.find(n => n.id === id)?.read === false;
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (wasUnread) setNotifUnread(prev => Math.max(0, prev - 1));
    await fetch("/api/notifications/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  }

  async function deleteAllNotifications() {
    setNotifications([]);
    setNotifUnread(0);
    await fetch("/api/notifications/delete", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    }).catch(() => {});
  }

  async function handleNotifClick(n: Notification) {
    if (!n.read) await markRead(n.id);
    // Absprachen-Benachrichtigung: Verlauf direkt hier im Panel öffnen statt die Seite zu wechseln
    const threadEventId = eventIdFromCommentsUrl(n.url);
    if (threadEventId) {
      setSelectedThread(threadEventId);
      setActiveTab("threads");
      return;
    }
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  // Eingeloggt: POST = Heartbeat + Online-Liste in einem Aufruf. Gäste lesen nur (GET).
  const isLoggedIn = !!session;
  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/presence", isLoggedIn ? { method: "POST" } : { cache: "no-store" });
      if (!res.ok) return;
      const data: { count: number; users: PresenceUser[] } = await res.json();
      setOnlineCount(data.count);
      setOnlineUsers(data.users);
    } catch {
      // Netzwerkfehler ignorieren
    }
  }, [isLoggedIn]);

  const fetchThreads = useCallback(async () => {
    try {
      // ETag: unverändert → 304 ohne Inhalt
      const res = await fetch("/api/me/event-threads", {
        cache: "no-store",
        headers: threadsEtagRef.current ? { "If-None-Match": threadsEtagRef.current } : undefined,
      });
      if (res.status === 304) { setThreadsLoaded(true); return; }
      if (!res.ok) return;
      threadsEtagRef.current = res.headers.get("ETag");
      const data = await res.json() as { threads: EventThreadDTO[]; unreadTotal: number };
      setThreads(data.threads);
      setThreadsUnread(data.unreadTotal);
      setThreadsLoaded(true);
    } catch { /* Netzwerkfehler ignorieren */ }
  }, []);

  // Nach dem Lesen eines Verlaufs: Zähler und (automatisch erledigte) Benachrichtigungen neu laden
  const refreshAfterRead = useCallback(() => { fetchThreads(); fetchNotifications(); }, [fetchThreads, fetchNotifications]);

  // Polling nur bei sichtbarem Tab (usePolling), bei geschlossenem Fenster seltener — jede Abfrage ist
  // ein Vercel-Function-Aufruf. Wechselt `open`, startet das Intervall neu und lädt sofort.
  // Absprachen-Übersicht: 30 s offen, 60 s geschlossen (dann nur für den Zähler am Knopf).
  usePolling(fetchThreads, session ? (open ? 30_000 : 60_000) : null);
  // Benachrichtigungen: 30 s offen, 60 s geschlossen.
  usePolling(fetchNotifications, open ? 30_000 : 60_000);
  // Presence + Heartbeat: 20 s offen, 60 s geschlossen (Aktiv-Fenster serverseitig 2 min).
  usePolling(fetchPresence, open ? 20_000 : 60_000);


  function handleToggle() {
    setOpen((o) => {
      const next = !o;
      if (next) {
        // Ungelesene Absprachen zuerst — sonst offene Benachrichtigungen, sonst die Absprachen-Übersicht
        setSelectedThread(null);
        setActiveTab(threadsUnread > 0 ? "threads" : otherNotifUnread > 0 ? "notifications" : "threads");
      }
      return next;
    });
  }

  // Absprachen-Benachrichtigungen nicht doppelt zählen — die stecken schon in threadsUnread
  const otherNotifUnread = Math.max(0, notifUnread - notifications.filter(n => !n.read && n.type === "event_comment").length);
  const totalBadge = otherNotifUnread + threadsUnread;

  // Glocke in der Kopfzeile: Zähler melden, Öffnen/Schließen von dort annehmen
  useEffect(() => { publishHubBadge(totalBadge); }, [totalBadge]);
  const toggleRef = useRef(handleToggle);
  useEffect(() => { toggleRef.current = handleToggle; });
  useEffect(() => {
    const onToggle = () => toggleRef.current();
    window.addEventListener(HUB_TOGGLE_EVENT, onToggle);
    return () => window.removeEventListener(HUB_TOGGLE_EVENT, onToggle);
  }, []);

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        aria-label={open ? "Fenster schließen" : `Benachrichtigungen & Absprachen öffnen${totalBadge > 0 ? ` (${totalBadge} neu)` : ""}`}
        className={`hub-fab fixed right-4 lg:right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90${!open && totalBadge > 0 ? " hub-fab-pulse" : ""}`}
        style={{
          background: open || totalBadge > 0 ? "var(--color-primary-soft)" : "var(--color-surface)",
          border: `1px solid ${open || totalBadge > 0 ? "var(--color-primary)" : "var(--color-line)"}`,
        }}
      >
        {open ? (
          <X className="w-5 h-5 text-teal-300" />
        ) : (
          <MessageCircle className={`w-5 h-5 ${totalBadge > 0 ? "text-teal-300" : "text-teal-400"}`} />
        )}
        {!open && totalBadge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
            style={{ background: "var(--color-live)" }}
          >
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
        {onlineCount > 0 && (
          <span
            className="absolute -bottom-1 -left-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
            style={{ background: "var(--color-surface-2)", border: "1px solid var(--color-line-strong)" }}
            title={`${onlineCount} Spieler online`}
          >
            {onlineCount > 99 ? "99+" : onlineCount}
          </span>
        )}
      </button>

      {/* ── Mobile-Backdrop ─────────────────────────────────────────── */}
      <div
        className="lg:hidden fixed inset-0 z-40 bg-black/40"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
        onClick={() => setOpen(false)}
      />

      {/* ── Panel ───────────────────────────────────────────────────── */}
      <div
        className={`hub-panel fixed left-0 right-0 max-h-[70vh] rounded-t-2xl z-50 flex flex-col overflow-hidden ${activeTab === "threads" && selectedThread ? "h-[70vh] lg:h-auto" : ""}`}
        style={{
          background: "var(--color-sidebar)",
          borderTop: "1px solid var(--color-line)",
          borderLeft: "1px solid var(--color-line)",
          boxShadow: open ? "var(--shadow-pop)" : "none",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transform: open
            ? "translate(0,0)"
            : isDesktop
            ? "translateX(100%)"
            : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease",
        }}
      >
        {/* Tabs (ersetzen den früheren Fensterkopf) + Schließen */}
        <div className="flex-shrink-0 flex items-center gap-1 pl-2 pr-2 pt-1" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Tabs
            variant="underline"
            className="flex-1 min-w-0 !border-b-0"
            active={activeTab}
            onChange={(key) => { setActiveTab(key as "notifications" | "threads"); setSelectedThread(null); }}
            tabs={[
              {
                key: "notifications",
                // Absprachen-Benachrichtigungen zählen schon beim Absprachen-Tab mit
                label: otherNotifUnread > 0 ? `Benachrichtigungen (${otherNotifUnread})` : "Benachrichtigungen",
                icon: Bell,
                activeClassName: "border-teal-500 text-white",
              },
              {
                key: "threads",
                label: threadsUnread > 0 ? `Absprachen (${threadsUnread})` : "Absprachen",
                icon: MessageCircle,
                activeClassName: "border-teal-500 text-white",
              },
            ]}
          />
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-line transition-colors"
            aria-label="Fenster schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Benachrichtigungen ──────────────────────────────────────── */}
        {activeTab === "notifications" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {notifications.length > 0 && (
              <div className="flex items-center justify-end gap-3 px-4 py-2 flex-shrink-0">
                {notifUnread > 0 && (
                  <button onClick={markAllRead}
                    className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors">
                    Alle lesen
                  </button>
                )}
                <button onClick={deleteAllNotifications}
                  className="text-[11px] text-gray-500 hover:text-red-400 transition-colors">
                  Alle löschen
                </button>
              </div>
            )}

            {notifications.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 py-10">
                <Bell style={{ width: 22, height: 22, color: "#374151" }} />
                <p className="text-xs text-gray-600">Keine Benachrichtigungen</p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {notifications.slice(0, NOTIF_DISPLAY_LIMIT).map((n) => (
                  <div
                    key={n.id}
                    className="group flex gap-2.5 items-start px-4 py-2.5 hover:bg-surface-2 transition-colors"
                    style={!n.read ? { background: "rgba(20,184,166,0.04)" } : undefined}
                  >
                    <button
                      onClick={() => handleNotifClick(n)}
                      className="flex gap-2.5 items-start flex-1 min-w-0 text-left"
                    >
                      <span className="text-base mt-0.5 shrink-0">{NOTIF_ICONS[n.type] ?? "🔔"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate"
                          style={{ color: n.read ? "#9ca3af" : "#e2e8f0" }}>
                          {n.title}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">{n.body}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(20,184,166,0.5)" }}>
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 mt-1 shrink-0">
                      {!n.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markRead(n.id); }}
                          title="Als gelesen markieren"
                          className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                          style={{ background: "#2dd4bf" }}
                        />
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

            <div className="flex-shrink-0 p-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Link
                href="/profile?tab=settings#notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-teal-400 hover:bg-teal-500/8 transition-colors"
              >
                <Settings style={{ width: 11, height: 11 }} />
                Einstellungen
              </Link>
            </div>
          </div>
        )}

        {/* ── Absprachen (ersetzt die frühere Lobby) ─────────────────────── */}
        {activeTab === "threads" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Online-Spieler */}
            {onlineUsers.length > 0 && !selectedThread && (
              <div
                className="flex items-center gap-2 px-4 py-2 flex-shrink-0 overflow-x-auto"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-[10px] text-gray-500 flex-shrink-0">
                  {onlineCount} online
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  {onlineUsers.map((u) => (
                    <Link
                      key={u.id}
                      href={`/profile/${u.id}`}
                      onClick={() => setOpen(false)}
                      className="flex-shrink-0 relative rounded-full hover:ring-2 hover:ring-teal-400/60 transition-shadow"
                      title={displayName(u)}
                    >
                      <RankedAvatar userId={u.id} src={u.image} alt={displayName(u)} size={24} />
                      <span
                        className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                        style={{ background: "#14b8a6", border: "1px solid rgba(13,13,15,0.97)" }}
                      />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {session?.user?.id ? (
              <EventThreadsPanel
                userId={session.user.id}
                threads={threads}
                loaded={threadsLoaded}
                selectedId={selectedThread}
                onSelect={setSelectedThread}
                onRefresh={refreshAfterRead}
                onNavigate={() => setOpen(false)}
              />
            ) : (
              <p className="flex-1 text-xs text-gray-600 text-center py-10">Melde dich an, um bei den Absprachen zu deinen Events mitzureden.</p>
            )}
          </div>
        )}
      </div>
    </>
  );
}
