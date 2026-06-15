"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { MessageCircle, X, Send } from "lucide-react";
import Image from "next/image";

interface LobbyMsg {
  id: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string | null; username: string | null; image: string | null };
}

function displayName(u: LobbyMsg["user"]) {
  return u.username ?? u.name ?? "User";
}

export function FloatingLobbyChat() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<LobbyMsg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const openRef = useRef(false);
  openRef.current = open;

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

  // Auto-Scroll ans Ende
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

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

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Chat schließen" : "Community-Chat öffnen"}
        className={`lobby-chat-fab fixed right-4 lg:right-6 z-40 w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90${!open && unread > 0 ? " lobby-fab-pulse" : ""}`}
        style={{
          background: open
            ? "rgba(20,184,166,0.22)"
            : unread > 0
            ? "rgba(20,184,166,0.28)"
            : "rgba(20,184,166,0.10)",
          border: `1px solid ${open || unread > 0 ? "rgba(20,184,166,0.6)" : "rgba(20,184,166,0.22)"}`,
          backdropFilter: "blur(14px)",
        }}
      >
        {open ? (
          <X className="w-5 h-5 text-teal-300" />
        ) : (
          <MessageCircle className={`w-5 h-5 ${unread > 0 ? "text-teal-300" : "text-teal-400"}`} />
        )}
        {!open && unread > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
            style={{ background: "#14b8a6", boxShadow: "0 0 10px rgba(20,184,166,0.7)" }}
          >
            {unread > 99 ? "99+" : unread}
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

      {/* ── Chat-Panel ──────────────────────────────────────────────── */}
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
          transform: open ? "translateY(0)" : "translateY(100%)",
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
            <span className="font-semibold text-sm text-white">Community-Lobby</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Chat schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

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
                <div className="flex-shrink-0 w-7 h-7 rounded-full overflow-hidden bg-gray-800 self-end">
                  {msg.user.image ? (
                    <Image
                      src={msg.user.image}
                      alt=""
                      width={28}
                      height={28}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-400">
                      {displayName(msg.user)[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
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
    </>
  );
}
