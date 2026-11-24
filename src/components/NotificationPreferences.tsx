"use client";
import { useState, useEffect } from "react";
import { Glyph, type GlyphName } from "@/components/ui/Glyph";
import { Bell, BellOff } from "@/components/icons";

type Prefs = {
  badge:     boolean;
  quest:     boolean;
  event:     boolean;
  myEvent:   boolean;
  points:    boolean;
  clip:      boolean;
  admin:     boolean;
  game:      boolean;
  eventComment: boolean;
  discordDm: boolean;
};

const CATEGORIES: { key: keyof Prefs; label: string; desc: string; icon: GlyphName }[] = [
  { key: "myEvent", label: "Meine Events",   desc: "Events, bei denen du dabei bist: Erinnerung, Check-in, Auslosung, dein nächstes Match, Nachrücken, Ergebnis. Als Veranstalter auch: Ergebnisse prüfen, kurzfristige Abmeldungen.", icon: "target" },
  { key: "event",  label: "Neue Events",     desc: "Ankündigungen neuer Events für alle Mitglieder. Abschalten betrifft nicht deine eigenen Events.", icon: "calendar" },
  { key: "eventComment", label: "Event-Absprachen", desc: "Neue Nachrichten, Erwähnungen & „komme später“ bei deinen Events", icon: "chat" },
  { key: "badge",  label: "Battle Cards",     desc: "Stufenaufstieg deiner Community-Karte",         icon: "award" },
  { key: "quest",  label: "Quests",           desc: "Quest abgeschlossen & Belohnung erhalten",      icon: "star" },
  { key: "points", label: "Punkte & Münzen",  desc: "Münzen oder Rang-Punkte erhalten",              icon: "coins" },
  { key: "clip",   label: "Clip des Monats",  desc: "Abstimmung & Ergebnisse",                       icon: "clip" },
  { key: "game",   label: "GameSwipe",      desc: "Angebote, Drop der Woche & neue Karten (OMA GameSwipe)", icon: "gamepad" },
  { key: "admin",  label: "Admin-Nachrichten",desc: "Direkte Nachrichten vom Admin-Team",            icon: "megaphone" },
];

const DISCORD_DM_CATEGORY: { key: keyof Prefs; label: string; desc: string; icon: GlyphName } =
  { key: "discordDm", label: "Discord-Direktnachrichten", desc: "Benachrichtigungen zusätzlich per Discord-DM erhalten", icon: "chat" };

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
        style={{ background: "var(--color-surface-2)", border: "1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
        <div className="h-4 w-32 rounded" style={{ background: "var(--color-surface-3)" }} />
      </div>
    );
  }

  const renderToggle = (cat: { key: keyof Prefs; label: string; desc: string; icon: GlyphName }) => (
    <button
      key={cat.key}
      onClick={() => toggle(cat.key)}
      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-2 transition-colors text-left"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-primary-soft text-primary-fg"><Glyph name={cat.icon} /></span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{cat.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{cat.desc}</p>
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
      style={{ background: "var(--color-surface-2)", border: "1px solid color-mix(in srgb, var(--color-primary) 10%, transparent)" }}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: "1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
        <div className="flex items-center gap-2">
          <Bell style={{ width: 14, height: 14, color: "color-mix(in srgb, var(--color-primary) 70%, transparent)" }} />
          <span className="text-sm font-semibold text-white">Benachrichtigungen</span>
        </div>
        {saving && <span className="text-xs text-gray-500">Wird gespeichert…</span>}
        {saved  && <span className="text-xs" style={{ color: "#2dd4bf" }}>Gespeichert ✓</span>}
      </div>
      <div className="divide-y" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 5%, transparent)" }}>
        {CATEGORIES.map(renderToggle)}
      </div>
      <div className="divide-y" style={{ borderColor: "color-mix(in srgb, var(--color-primary) 5%, transparent)", borderTop: "1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
        {renderToggle(DISCORD_DM_CATEGORY)}
      </div>
      <div className="px-4 py-2.5 flex items-center gap-1.5"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--color-primary) 8%, transparent)" }}>
        <BellOff style={{ width: 11, height: 11, color: "#6b7280" }} />
        <p className="text-xs text-gray-500">
          In-App-Benachrichtigungen im Profil-Menü oben rechts.
        </p>
      </div>
    </div>
  );
}
