"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Bell, Save, Smartphone, MessageSquare, Send, Hash, Trash2 } from "lucide-react";

export type NotificationRuleRow = {
  key: string;
  label: string;
  description: string;
  category: string;
  pushEnabled: boolean;
  inAppEnabled: boolean;
  discordDmEnabled: boolean;
  discordChanEnabled: boolean;
  discordChannelId: string | null;
  titleTemplate: string;
  bodyTemplate: string;
  urlTemplate: string | null;
  reminderHoursBefore: number | null;
};

const CATEGORY_LABELS: Record<string, string> = {
  events:      "Events",
  tournaments: "Turniere",
  quests:      "Quests",
  badges:      "Abzeichen",
  clips:       "Clip des Monats",
  rank:        "Rang",
  system:      "System",
};

const CATEGORY_ORDER = ["events", "tournaments", "quests", "badges", "clips", "rank", "system"];

type Props = {
  initial: NotificationRuleRow[];
  newsChannelId: string | null;
};

function Toggle({ on, onClick, label, icon: Icon }: { on: boolean; onClick: () => void; label: string; icon: typeof Bell }) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
        on
          ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
          : "bg-white/[0.02] text-gray-600 border-white/[0.06] hover:border-white/[0.12]"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}

export default function NotificationRulesPanel({ initial, newsChannelId }: Props) {
  const [rules, setRules] = useState<NotificationRuleRow[]>(initial);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  function update(key: string, patch: Partial<NotificationRuleRow>) {
    setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirtyKeys((s) => new Set(s).add(key));
  }

  async function deleteRule(r: NotificationRuleRow) {
    if (!confirm(`„${r.label}" wirklich löschen? Diese Benachrichtigung wird dann auf keinem Kanal mehr gesendet.`)) return;
    setDeletingKey(r.key);
    try {
      const res = await fetch(`/api/admin/notification-rules/${encodeURIComponent(r.key)}`, { method: "DELETE" });
      if (res.ok) {
        setRules((rs) => rs.filter((x) => x.key !== r.key));
        setDirtyKeys((s) => { const next = new Set(s); next.delete(r.key); return next; });
        toast.success(`„${r.label}" gelöscht`);
      } else {
        toast.error("Fehler beim Löschen");
      }
    } finally {
      setDeletingKey(null);
    }
  }

  async function save() {
    if (!dirtyKeys.size) return;
    setSaving(true);
    try {
      const payload = rules
        .filter((r) => dirtyKeys.has(r.key))
        .map((r) => ({
          key: r.key,
          pushEnabled: r.pushEnabled,
          inAppEnabled: r.inAppEnabled,
          discordDmEnabled: r.discordDmEnabled,
          discordChanEnabled: r.discordChanEnabled,
          discordChannelId: r.discordChannelId?.trim() || null,
          titleTemplate: r.titleTemplate,
          bodyTemplate: r.bodyTemplate,
          urlTemplate: r.urlTemplate?.trim() || null,
          reminderHoursBefore: r.reminderHoursBefore,
        }));
      const res = await fetch("/api/admin/notification-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        toast.success("Benachrichtigungs-Regeln gespeichert");
        setDirtyKeys(new Set());
      } else {
        toast.error("Fehler beim Speichern");
      }
    } finally {
      setSaving(false);
    }
  }

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, rows: rules.filter((r) => r.category === cat) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Bell className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Benachrichtigungen</h1>
            <p className="text-xs text-gray-500">Push, In-App, Discord-DM und Discord-Kanal je Ereignis steuern</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving || dirtyKeys.size === 0}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Speichert…" : "Speichern"}
        </button>
      </div>

      {grouped.map(({ cat, rows }) => (
        <div key={cat} className="space-y-3">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">
            {CATEGORY_LABELS[cat] ?? cat}
          </h3>
          {rows.map((r) => (
            <div key={r.key} className="glass card-shine rounded-2xl overflow-hidden">
              <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-white/[0.05]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{r.label}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{r.description}</p>
                </div>
                <button
                  onClick={() => deleteRule(r)}
                  disabled={deletingKey === r.key}
                  title="Regel löschen"
                  className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-600 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 transition-colors shrink-0 disabled:opacity-40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="px-4 py-3 space-y-3">
                {/* Kanal-Toggles */}
                <div className="flex flex-wrap gap-1.5">
                  <Toggle on={r.pushEnabled} onClick={() => update(r.key, { pushEnabled: !r.pushEnabled })} label="Push" icon={Smartphone} />
                  <Toggle on={r.inAppEnabled} onClick={() => update(r.key, { inAppEnabled: !r.inAppEnabled })} label="In-App" icon={Bell} />
                  <Toggle on={r.discordDmEnabled} onClick={() => update(r.key, { discordDmEnabled: !r.discordDmEnabled })} label="Discord-DM" icon={Send} />
                  <Toggle on={r.discordChanEnabled} onClick={() => update(r.key, { discordChanEnabled: !r.discordChanEnabled })} label="Discord-Kanal" icon={MessageSquare} />
                </div>

                {/* Kanal-ID (nur wenn Discord-Kanal aktiv) */}
                {r.discordChanEnabled && (
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    <input
                      value={r.discordChannelId ?? ""}
                      onChange={(e) => update(r.key, { discordChannelId: e.target.value })}
                      placeholder={`Standard: News-Kanal${newsChannelId ? ` (${newsChannelId})` : ""}`}
                      className="flex-1 rounded-lg px-3 py-1.5 text-xs text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none transition-colors placeholder:text-gray-600"
                    />
                  </div>
                )}

                {/* Stunden vorher (nur event_reminder) */}
                {r.key === "event_reminder" && (
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-gray-500 shrink-0">Stunden vorher:</label>
                    <input
                      type="number"
                      min={1}
                      value={r.reminderHoursBefore ?? 24}
                      onChange={(e) => update(r.key, { reminderHoursBefore: Number(e.target.value) || 24 })}
                      className="w-20 rounded-lg px-3 py-1.5 text-xs text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none transition-colors"
                    />
                  </div>
                )}

                {/* Templates */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Titel</label>
                  <input
                    value={r.titleTemplate}
                    onChange={(e) => update(r.key, { titleTemplate: e.target.value })}
                    className="w-full rounded-xl px-3 py-2 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Text</label>
                  <textarea
                    value={r.bodyTemplate}
                    onChange={(e) => update(r.key, { bodyTemplate: e.target.value })}
                    rows={r.bodyTemplate.includes("\n") ? 3 : 2}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none resize-none transition-colors"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Ziel-Link (optional)</label>
                  <input
                    value={r.urlTemplate ?? ""}
                    onChange={(e) => update(r.key, { urlTemplate: e.target.value })}
                    placeholder="/events"
                    className="w-full rounded-xl px-3 py-2 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none transition-colors placeholder:text-gray-600"
                  />
                </div>

                <p className="text-[10px] text-gray-700">
                  Platzhalter wie {"{eventName}"} werden beim Senden automatisch ersetzt.
                </p>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
