"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Users, X, ChevronDown, Check, Smartphone, Bell, MessageSquare, Hash } from "lucide-react";
import Image from "next/image";
import { PAGE_LINKS } from "@/lib/page-links";

type UserResult = { id: string; name: string | null; username: string | null; image: string | null };
type SendResult  = { ok: boolean; sent?: Record<string, number>; error?: string };

export default function BroadcastPanel() {
  const [mode, setMode]             = useState<"all" | "user">("all");
  const [selectedUsers, setSelected] = useState<UserResult[]>([]);
  const [query, setQuery]           = useState("");
  const [suggestions, setSuggestions] = useState<UserResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [url, setUrl]       = useState("");
  const [showLinkDrop, setShowLinkDrop] = useState(false);

  const [channels, setChannels] = useState({ push: false, inApp: true, discordDm: false, discordChannel: false });
  const [discordChannelId, setDiscordChannelId] = useState("");

  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<SendResult | null>(null);

  const searchRef   = useRef<HTMLDivElement>(null);
  const linkDropRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSuggestions(false);
      if (linkDropRef.current && !linkDropRef.current.contains(e.target as Node)) setShowLinkDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const searchUsers = useCallback(async (q: string) => {
    if (!q.trim()) { setSuggestions([]); return; }
    setLoadingSearch(true);
    try {
      const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(q)}`);
      const data = await res.json() as UserResult[];
      setSuggestions(data.filter(u => !selectedUsers.some(s => s.id === u.id)));
    } catch { /* ignore */ } finally {
      setLoadingSearch(false);
    }
  }, [selectedUsers]);

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchUsers(q), 250);
  }

  function addUser(u: UserResult) {
    setSelected(prev => [...prev, u]);
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function removeUser(id: string) {
    setSelected(prev => prev.filter(u => u.id !== id));
  }

  function selectLink(pageUrl: string) {
    setUrl(pageUrl);
    setShowLinkDrop(false);
  }

  function toggleChannel(key: keyof typeof channels) {
    setChannels(c => ({ ...c, [key]: !c[key] }));
  }

  const selectedLink = PAGE_LINKS.find(p => p.url === url);
  const anyChannel = channels.push || channels.inApp || channels.discordDm || channels.discordChannel;
  const canSend = title.trim() && body.trim() && anyChannel && (mode === "all" || selectedUsers.length > 0);

  async function send() {
    if (!canSend) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "all" ? { all: true } : { userIds: selectedUsers.map(u => u.id) }),
          title: title.trim(),
          body:  body.trim(),
          url:   url.trim() || undefined,
          channels,
          discordChannelId: channels.discordChannel ? (discordChannelId.trim() || undefined) : undefined,
        }),
      });
      const data = await res.json() as SendResult;
      setResult(data);
      if (data.ok) {
        setTitle(""); setBody(""); setUrl("");
        setSelected([]); setQuery("");
      }
    } catch {
      setResult({ ok: false, error: "Netzwerkfehler" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="surface p-5 space-y-4"
      style={{ border: "1px solid rgba(20,184,166,0.15)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>
      <h2 className="text-sm font-semibold text-white flex items-center gap-2">
        <Send className="w-4 h-4 text-teal-400" />
        Nachricht senden
      </h2>

      {/* Empfänger-Modus */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("all")}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: mode === "all" ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.04)",
            color: mode === "all" ? "#2dd4bf" : "#9ca3af",
            border: `1px solid ${mode === "all" ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}>
          <Users style={{ width: 13, height: 13 }} /> Alle User
        </button>
        <button type="button" onClick={() => setMode("user")}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{
            background: mode === "user" ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.04)",
            color: mode === "user" ? "#2dd4bf" : "#9ca3af",
            border: `1px solid ${mode === "user" ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}>
          <Users style={{ width: 13, height: 13 }} /> Bestimmte User
        </button>
      </div>

      {/* User-Auswahl mit Autocomplete */}
      {mode === "user" && (
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">User auswählen</label>
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedUsers.map(u => (
                <div key={u.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs"
                  style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.25)", color: "#2dd4bf" }}>
                  {u.image && <Image src={u.image} alt="" width={16} height={16} className="rounded-full" />}
                  <span>{u.username ?? u.name ?? u.id.slice(0, 8)}</span>
                  <button type="button" onClick={() => removeUser(u.id)} className="hover:text-white transition-colors ml-0.5">
                    <X style={{ width: 11, height: 11 }} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div ref={searchRef} className="relative">
            <input
              type="text" value={query} onChange={handleQueryChange}
              onFocus={() => { if (query) setShowSuggestions(true); }}
              placeholder="Username eingeben…"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors"
            />
            {showSuggestions && (query || suggestions.length > 0) && (
              <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
                style={{ background: "rgba(10,18,16,0.98)", border: "1px solid rgba(20,184,166,0.15)" }}>
                {loadingSearch && <div className="px-3 py-2 text-xs text-gray-500">Suche…</div>}
                {!loadingSearch && suggestions.length === 0 && query.trim() && (
                  <div className="px-3 py-2 text-xs text-gray-500">Keine User gefunden</div>
                )}
                {suggestions.map(u => (
                  <button key={u.id} type="button" onClick={() => addUser(u)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-white/5 transition-colors">
                    {u.image ? (
                      <Image src={u.image} alt="" width={24} height={24} className="rounded-full shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>
                        {(u.username ?? u.name ?? "?")[0]}
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-medium text-white">{u.username ?? u.name}</p>
                      {u.username && u.name && u.name !== u.username && (
                        <p className="text-[10px] text-gray-500">{u.name}</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Titel */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Titel</label>
        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="📢 Wichtige Info…"
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors" />
      </div>

      {/* Text */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Text</label>
        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Inhalt der Benachrichtigung…" rows={3}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors resize-none" />
      </div>

      {/* Link-Dropdown */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Seite verlinken (optional)</label>
        <div ref={linkDropRef} className="relative">
          <button type="button" onClick={() => setShowLinkDrop(v => !v)}
            className="w-full flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm transition-colors hover:border-teal-500/30"
            style={{ color: selectedLink ? "#e2e8f0" : "#4b5563" }}>
            <span>{selectedLink ? `${selectedLink.label} (${selectedLink.url})` : "Keine Verlinkung"}</span>
            <ChevronDown style={{ width: 14, height: 14, flexShrink: 0 }} />
          </button>
          {showLinkDrop && (
            <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl"
              style={{ background: "rgba(10,18,16,0.98)", border: "1px solid rgba(20,184,166,0.15)" }}>
              <button type="button" onClick={() => selectLink("")}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-500 hover:bg-white/5 transition-colors">
                <span>Keine Verlinkung</span>
                {!url && <Check style={{ width: 13, height: 13, color: "#2dd4bf" }} />}
              </button>
              {PAGE_LINKS.map(p => (
                <button key={p.url} type="button" onClick={() => selectLink(p.url)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors"
                  style={{ color: url === p.url ? "#2dd4bf" : "#d1d5db" }}>
                  <span>{p.label}</span>
                  <span className="text-xs text-gray-600">{p.url}</span>
                  {url === p.url && <Check style={{ width: 13, height: 13, color: "#2dd4bf" }} />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Kanäle */}
      <div>
        <label className="text-xs text-gray-400 mb-1.5 block">Kanäle</label>
        <div className="flex flex-wrap gap-1.5">
          {([
            ["push", "Push", Smartphone],
            ["inApp", "In-App", Bell],
            ["discordDm", "Discord-DM", Send],
            ["discordChannel", "Discord-Kanal", MessageSquare],
          ] as const).map(([key, label, Icon]) => (
            <button key={key} type="button" onClick={() => toggleChannel(key)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors"
              style={{
                background: channels[key] ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.02)",
                color: channels[key] ? "#2dd4bf" : "#6b7280",
                border: `1px solid ${channels[key] ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.06)"}`,
              }}>
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        {channels.discordChannel && (
          <div className="flex items-center gap-2 mt-2">
            <Hash className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            <input value={discordChannelId} onChange={e => setDiscordChannelId(e.target.value)}
              placeholder="Standard: News-Kanal"
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50 transition-colors" />
          </div>
        )}
      </div>

      <button type="button" onClick={send} disabled={loading || !canSend}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
        style={{
          background: "rgba(20,184,166,0.2)", color: "#2dd4bf", border: "1px solid rgba(20,184,166,0.3)",
          opacity: (loading || !canSend) ? 0.5 : 1,
          cursor: (loading || !canSend) ? "not-allowed" : "pointer",
        }}>
        <Send style={{ width: 14, height: 14 }} />
        {loading ? "Wird gesendet…" : "Senden"}
      </button>

      {result && (
        <p className="text-xs" style={{ color: result.ok ? "#2dd4bf" : "#f87171" }}>
          {result.ok
            ? `✓ Gesendet — ${Object.entries(result.sent ?? {}).map(([k, v]) => `${k}: ${v}`).join(" · ")}`
            : `Fehler: ${result.error}`}
        </p>
      )}
    </div>
  );
}
