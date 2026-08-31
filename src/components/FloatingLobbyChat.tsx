"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { MessageCircle, X, Send, Bell, Settings } from "lucide-react";
import Link from "next/link";
import RankedAvatar from "@/components/RankedAvatar";
import { Tabs } from "@/components/admin/Tabs";

const NOTIF_DISPLAY_LIMIT = 30;

interface LobbyMsg {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; username: string | null; image: string | null; rankPoints: number };
}

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

export function FloatingLobbyChat() {
  const { data: session } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "lobby">("notifications");
  const [messages, setMessages] = useState<LobbyMsg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [isDesktop, setIsDesktop] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  // Spiegelt `open` für den Polling-Callback, der sonst über seine Closure einen veralteten
  // Wert sähe. Die Zuweisung gehört in einen Effekt: eine Ref-Mutation während des Renders
  // ist bei abgebrochenen oder doppelten Renderdurchläufen nicht verlässlich.
  const openRef = useRef(false);
  useEffect(() => { openRef.current = open; }, [open]);

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

  useEffect(() => {
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [fetchNotifications]);

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
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  const fetchPresence = useCallback(async () => {
    try {
      const res = await fetch("/api/presence", { cache: "no-store" });
      if (!res.ok) return;
      const data: { count: number; users: PresenceUser[] } = await res.json();
      setOnlineCount(data.count);
      setOnlineUsers(data.users);
    } catch {
      // Netzwerkfehler ignorieren
    }
  }, []);

  const sendHeartbeat = useCallback(async () => {
    if (!session) return;
    try {
      await fetch("/api/presence", { method: "POST" });
    } catch {
      // Netzwerkfehler ignorieren
    }
  }, [session]);

  const fetchMessages = useCallback(async (mode: "initial" | "poll" | "baseline") => {
    try {
      const url =
        mode !== "initial" && lastTimestampRef.current
          ? `/api/lobby?after=${encodeURIComponent(lastTimestampRef.current)}`
          : "/api/lobby";
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return;
      const data: LobbyMsg[] = await res.json();

      if (mode === "baseline") {
        // Nur Timestamp setzen – keine Nachrichten anzeigen, kein Unread-Count
        if (data.length) lastTimestampRef.current = data[data.length - 1].createdAt;
        return;
      }

      if (!data.length) return;
      lastTimestampRef.current = data[data.length - 1].createdAt;

      setMessages((prev) => {
        if (mode === "initial") return data;
        const ids = new Set(prev.map((m) => m.id));
        const fresh = data.filter((m) => !ids.has(m.id));
        if (!fresh.length) return prev;
        if (!openRef.current) setUnread((u) => u + fresh.length);
        return [...prev, ...fresh];
      });
    } catch {
      // Netzwerkfehler ignorieren
    }
  }, []);

  // Baseline beim ersten Mount setzen (ohne Unread zu zählen)
  useEffect(() => {
    fetchMessages("baseline");
  }, [fetchMessages]);

  // Wenn Chat geöffnet: Verlauf laden & Unread zurücksetzen
  useEffect(() => {
    if (open) {
      setUnread(0);
      lastTimestampRef.current = null;
      fetchMessages("initial");
    }
  }, [open, fetchMessages]);

  // Polling: 3 s wenn offen, 10 s wenn geschlossen
  useEffect(() => {
    const id = setInterval(() => fetchMessages("poll"), open ? 3000 : 10000);
    return () => clearInterval(id);
  }, [open, fetchMessages]);

  // Heartbeat: signalisiert eigene Aktivität, solange die App offen ist (alle 60 s)
  useEffect(() => {
    sendHeartbeat();
    const id = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(id);
  }, [sendHeartbeat]);

  // Presence: Online-Zähler/Liste laden (alle 15 s, sofort beim Öffnen)
  useEffect(() => {
    fetchPresence();
    const id = setInterval(fetchPresence, 15000);
    return () => clearInterval(id);
  }, [fetchPresence]);

  useEffect(() => {
    if (open) fetchPresence();
  }, [open, fetchPresence]);

  // Desktop-Breakpoint überwachen (Slide-Richtung: rechts vs. unten)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Auto-Scroll ans Ende (nur im Lobby-Tab relevant)
  useEffect(() => {
    if (open && activeTab === "lobby") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, activeTab]);

  function handleToggle() {
    setOpen((o) => {
      const next = !o;
      if (next) setActiveTab(notifUnread > 0 ? "notifications" : "lobby");
      return next;
    });
  }

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !session || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/lobby", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        setText("");
        await fetchMessages("poll");
      }
    } finally {
      setSending(false);
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const totalBadge = notifUnread + unread;

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        onClick={handleToggle}
        aria-label={open ? "Fenster schließen" : `Benachrichtigungen & Lobby öffnen${totalBadge > 0 ? ` (${totalBadge} neu)` : ""}`}
        className={`lobby-chat-fab fixed right-4 lg:right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90${!open && totalBadge > 0 ? " lobby-fab-pulse" : ""}`}
        style={{
          background: open
            ? "rgba(20,184,166,0.22)"
            : totalBadge > 0
            ? "rgba(20,184,166,0.28)"
            : "rgba(20,184,166,0.10)",
          border: `1px solid ${open || totalBadge > 0 ? "rgba(20,184,166,0.6)" : "rgba(20,184,166,0.22)"}`,
          backdropFilter: "blur(14px)",
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
            style={{ background: "#14b8a6", boxShadow: "0 0 10px rgba(20,184,166,0.7)" }}
          >
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
        {onlineCount > 0 && (
          <span
            className="absolute -bottom-1 -left-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
            style={{ background: "rgba(30,30,32,0.95)", border: "1px solid rgba(20,184,166,0.5)" }}
            title={`${onlineCount} Spieler online`}
          >
            {onlineCount > 99 ? "99+" : onlineCount}
          </span>
        )}
      </button>

      {/* ── Mobile-Backdrop ─────────────────────────────────────────── */}
      <div
        className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s ease",
        }}
        onClick={() => setOpen(false)}
      />

      {/* ── Panel ───────────────────────────────────────────────────── */}
      <div
        className="lobby-chat-panel fixed left-0 right-0 max-h-[70vh] rounded-t-2xl z-50 flex flex-col overflow-hidden"
        style={{
          background: "rgba(13,13,15,0.97)",
          backdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          borderLeft: "1px solid rgba(255,255,255,0.07)",
          boxShadow: open ? "-4px 0 48px rgba(0,0,0,0.6)" : "none",
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
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ background: "#14b8a6", boxShadow: "0 0 6px #14b8a6" }}
            />
            <span className="font-semibold text-sm text-white">
              {activeTab === "notifications" ? "Benachrichtigungen" : "Community-Lobby"}
            </span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Fenster schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex-shrink-0 px-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <Tabs
            variant="underline"
            active={activeTab}
            onChange={(key) => setActiveTab(key as "notifications" | "lobby")}
            tabs={[
              {
                key: "notifications",
                label: notifUnread > 0 ? `Benachrichtigungen (${notifUnread})` : "Benachrichtigungen",
                icon: Bell,
                activeClassName: "border-teal-500 text-white",
              },
              {
                key: "lobby",
                label: unread > 0 ? `Lobby (${unread})` : "Lobby",
                icon: MessageCircle,
                activeClassName: "border-teal-500 text-white",
              },
            ]}
          />
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
                    className="group flex gap-2.5 items-start px-4 py-2.5 hover:bg-white/[0.03] transition-colors"
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
                href="/profile?tab=notifications"
                onClick={() => setOpen(false)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] text-gray-500 hover:text-teal-400 hover:bg-teal-500/8 transition-colors"
              >
                <Settings style={{ width: 11, height: 11 }} />
                Einstellungen
              </Link>
            </div>
          </div>
        )}

        {/* ── Lobby ───────────────────────────────────────────────────── */}
        {activeTab === "lobby" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Online-Spieler */}
            {onlineUsers.length > 0 && (
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
                        <RankedAvatar rankPoints={u.rankPoints} src={u.image} alt={displayName(u)} size={24} />
                        <span
                          className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full"
                          style={{ background: "#14b8a6", boxShadow: "0 0 4px #14b8a6", border: "1px solid rgba(13,13,15,0.97)" }}
                        />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Nachrichten-Liste */}
              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
                {messages.length === 0 && (
                  <p className="text-center text-xs text-gray-600 py-10">
                    Noch keine Nachrichten – fang an!
                  </p>
                )}
                {messages.map((msg) => {
                  const isOwn = msg.user.id === session?.user?.id;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
                      <Link
                        href={`/profile/${msg.user.id}`}
                        onClick={() => setOpen(false)}
                        className="flex-shrink-0 self-end rounded-full hover:ring-2 hover:ring-teal-400/60 transition-shadow"
                        title={displayName(msg.user)}
                      >
                        <RankedAvatar rankPoints={msg.user.rankPoints} src={msg.user.image} alt={displayName(msg.user)} size={28} />
                      </Link>
                      <div className={`flex flex-col gap-0.5 max-w-[75%] ${isOwn ? "items-end" : "items-start"}`}>
                        <span className="text-[10px] text-gray-500">{displayName(msg.user)}</span>
                        <div
                          className="text-sm px-3 py-1.5 leading-snug"
                          style={
                            isOwn
                              ? {
                                  background: "rgba(20,184,166,0.18)",
                                  color: "rgba(255,255,255,0.92)",
                                  borderRadius: "14px 14px 4px 14px",
                                }
                              : {
                                  background: "rgba(255,255,255,0.06)",
                                  color: "rgba(255,255,255,0.85)",
                                  borderRadius: "14px 14px 14px 4px",
                                }
                          }
                        >
                          {msg.content}
                        </div>
                        <span className="text-[10px] text-gray-600">
                          {new Date(msg.createdAt).toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div
                className="flex-shrink-0 flex items-center gap-2 px-3 py-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                {session ? (
                  <>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={handleKey}
                      placeholder="Nachricht schreiben…"
                      maxLength={500}
                      className="flex-1 text-sm rounded-xl px-3 py-2 text-white placeholder-gray-600 outline-none transition-colors"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = "rgba(20,184,166,0.4)")
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")
                      }
                    />
                    <button
                      onClick={handleSend}
                      disabled={!text.trim() || sending}
                      className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-35"
                      style={{
                        background: "rgba(20,184,166,0.18)",
                        border: "1px solid rgba(20,184,166,0.3)",
                      }}
                      aria-label="Senden"
                    >
                      <Send className="w-4 h-4 text-teal-400" />
                    </button>
                  </>
                ) : (
                  <p className="text-xs text-gray-600 text-center w-full py-1">
                    Melde dich an um zu chatten
                  </p>
                )}
              </div>
            </div>
        )}
      </div>
    </>
  );
}
