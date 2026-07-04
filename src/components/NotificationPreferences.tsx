"use client";
import { useState, useEffect } from "react";
import { Bell, BellOff } from "lucide-react";

type Prefs = {
  badge:     boolean;
  quest:     boolean;
  event:     boolean;
  points:    boolean;
  clip:      boolean;
  admin:     boolean;
  discordDm: boolean;
};

const CATEGORIES: { key: keyof Prefs; label: string; desc: string; icon: string }[] = [
  { key: "event",  label: "Events",          desc: "Event startet & Ergebnis (nur bei Anmeldung)", icon: "📅" },
  { key: "badge",  label: "Abzeichen",        desc: "Neues Badge freigeschaltet",                   icon: "🏅" },
  { key: "quest",  label: "Quests",           desc: "Quest abgeschlossen & Belohnung erhalten",      icon: "⭐" },
  { key: "points", label: "Punkte & Münzen",  desc: "Münzen oder Rang-Punkte erhalten",              icon: "💰" },
  { key: "clip",   label: "Clip des Monats",  desc: "Abstimmung & Ergebnisse",                       icon: "🎬" },
  { key: "admin",  label: "Admin-Nachrichten",desc: "Direkte Nachrichten vom Admin-Team",            icon: "📢" },
];

const DISCORD_DM_CATEGORY: { key: keyof Prefs; label: string; desc: string; icon: string } =
  { key: "discordDm", label: "Discord-Direktnachrichten", desc: "Benachrichtigungen zusätzlich per Discord-DM erhalten", icon: "💬" };

export default function NotificationPreferences() {
  const [prefs, setPrefs]       = useState<Prefs | null>(null);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    fetch("/api/notifications/preferences")
      .then(r => r.json())
      .then((data: Prefs) => setPrefs(data))
      .catch(() => {});
  }, []);

  async function toggle(key: keyof Prefs) {
    if (!prefs) return;
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: !prefs[key] }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  if (!prefs) {
    return (
      <div className="rounded-xl p-4 animate-pulse"
        style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.08)" }}>
        <div className="h-4 w-32 rounded" style={{ background: "rgba(255,255,255,0.06)" }} />
      </div>
    );
  }

  const renderToggle = (cat: { key: keyof Prefs; label: string; desc: string; icon: string }) => (
    <button
      key={cat.key}
      onClick={() => toggle(cat.key)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors text-left"
    >
      <span className="text-base shrink-0">{cat.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{cat.label}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{cat.desc}</p>
      </div>
      <div
        className="w-9 h-5 rounded-full flex items-center transition-all shrink-0"
        style={{
          background: prefs![cat.key] ? "rgba(20,184,166,0.3)" : "rgba(255,255,255,0.08)",
          justifyContent: prefs![cat.key] ? "flex-end" : "flex-start",
          padding: "2px",
        }}
      >
        <div
          className="w-4 h-4 rounded-full transition-all"
          style={{ background: prefs![cat.key] ? "#2dd4bf" : "#4b5563" }}
        />
      </div>
    </button>
  );

  return (
    <div className="rounded-xl overflow-hidden"
      style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.1)" }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid rgba(20,184,166,0.08)" }}>
        <div className="flex items-center gap-2">
          <Bell style={{ width: 14, height: 14, color: "rgba(20,184,166,0.7)" }} />
          <span className="text-sm font-semibold text-white">Benachrichtigungen</span>
        </div>
        {saving && <span className="text-[11px] text-gray-500">Wird gespeichert…</span>}
        {saved  && <span className="text-[11px]" style={{ color: "#2dd4bf" }}>Gespeichert ✓</span>}
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(20,184,166,0.05)" }}>
        {CATEGORIES.map(renderToggle)}
      </div>
      <div className="divide-y" style={{ borderColor: "rgba(20,184,166,0.05)", borderTop: "1px solid rgba(20,184,166,0.08)" }}>
        {renderToggle(DISCORD_DM_CATEGORY)}
      </div>
      <div className="px-4 py-2.5 flex items-center gap-1.5"
        style={{ borderTop: "1px solid rgba(20,184,166,0.08)" }}>
        <BellOff style={{ width: 11, height: 11, color: "#6b7280" }} />
        <p className="text-[11px] text-gray-500">
          In-App-Benachrichtigungen im Profil-Menü oben rechts.
        </p>
      </div>
    </div>
  );
}
