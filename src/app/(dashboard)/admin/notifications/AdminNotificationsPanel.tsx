"use client";
import { useState } from "react";
import { Send, Users, User } from "lucide-react";

type SendResult = { ok: boolean; sent?: number; error?: string };

export default function AdminNotificationsPanel() {
  const [mode, setMode]     = useState<"all" | "user">("all");
  const [userId, setUserId] = useState("");
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [url, setUrl]       = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<SendResult | null>(null);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    if (mode === "user" && !userId.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(mode === "all" ? { all: true } : { userIds: [userId.trim()] }),
          title: title.trim(),
          body:  body.trim(),
          url:   url.trim() || undefined,
        }),
      });
      const data = await res.json() as SendResult;
      setResult(data);
      if (data.ok) { setTitle(""); setBody(""); setUrl(""); setUserId(""); }
    } catch {
      setResult({ ok: false, error: "Netzwerkfehler" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.1)" }}>
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
        <Send style={{ width: 14, height: 14, color: "rgba(20,184,166,0.7)" }} />
        <span className="text-sm font-semibold text-white">Benachrichtigung senden</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Modus */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode("all")}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: mode === "all" ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.04)",
              color: mode === "all" ? "#2dd4bf" : "#9ca3af",
              border: `1px solid ${mode === "all" ? "rgba(20,184,166,0.3)" : "transparent"}`,
            }}
          >
            <Users style={{ width: 12, height: 12 }} /> Alle User
          </button>
          <button
            onClick={() => setMode("user")}
            className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: mode === "user" ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.04)",
              color: mode === "user" ? "#2dd4bf" : "#9ca3af",
              border: `1px solid ${mode === "user" ? "rgba(20,184,166,0.3)" : "transparent"}`,
            }}
          >
            <User style={{ width: 12, height: 12 }} /> Einzelner User
          </button>
        </div>

        {/* User-ID Feld */}
        {mode === "user" && (
          <div>
            <label className="block text-[11px] text-gray-500 mb-1">User-ID</label>
            <input
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="cuid des Users…"
              className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,166,0.1)" }}
            />
          </div>
        )}

        {/* Titel */}
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Titel</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="📢 Wichtige Info…"
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,166,0.1)" }}
          />
        </div>

        {/* Text */}
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Text</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Inhalt der Benachrichtigung…"
            rows={3}
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,166,0.1)" }}
          />
        </div>

        {/* Link (optional) */}
        <div>
          <label className="block text-[11px] text-gray-500 mb-1">Link (optional)</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="/events oder /profile…"
            className="w-full px-3 py-2 rounded-lg text-sm text-white placeholder-gray-600 outline-none"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(20,184,166,0.1)" }}
          />
        </div>

        <button
          onClick={send}
          disabled={loading || !title.trim() || !body.trim() || (mode === "user" && !userId.trim())}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: "rgba(20,184,166,0.2)",
            color: "#2dd4bf",
            border: "1px solid rgba(20,184,166,0.3)",
            opacity: (loading || !title.trim() || !body.trim()) ? 0.5 : 1,
          }}
        >
          <Send style={{ width: 14, height: 14 }} />
          {loading ? "Wird gesendet…" : "Senden"}
        </button>

        {result && (
          <p className="text-xs text-center" style={{ color: result.ok ? "#2dd4bf" : "#f87171" }}>
            {result.ok
              ? `✓ An ${result.sent} User${result.sent !== 1 ? " " : "n"} gesendet`
              : `Fehler: ${result.error}`}
          </p>
        )}
      </div>
    </div>
  );
}
