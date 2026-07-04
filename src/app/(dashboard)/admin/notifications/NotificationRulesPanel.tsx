"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Bell, Save, Smartphone, MessageSquare, Send, Hash, Trash2, ChevronDown, Check, Smile, X } from "lucide-react";
import { PAGE_LINKS } from "@/lib/page-links";

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

interface DiscordEmoji { id: string; name: string; animated: boolean }

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

// Welche Platzhalter pro Regel beim Versand ersetzt werden (siehe src/lib/notify-dispatch.ts Aufrufer)
const PLACEHOLDERS: Record<string, { key: string; description: string }[]> = {
  event_new: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{date}", description: "Startdatum & Uhrzeit" },
  ],
  event_reminder: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{date}", description: "Startdatum & Uhrzeit" },
    { key: "{registrations}", description: "Aktuelle Anmeldezahl" },
    { key: "{maxPlayers}", description: "Maximale Spielerzahl" },
    { key: "{points}", description: "Punktebelohnung bei Teilnahme" },
    { key: "{reminderHours}", description: "Konfigurierter Vorlauf in Stunden" },
  ],
  event_started: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
  ],
  event_ended: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{attendeeCount}", description: "Anzahl der Teilnehmer" },
  ],
  tournament_started: [
    { key: "{eventName}", description: "Name des Turniers" },
  ],
  tournament_result: [
    { key: "{eventName}", description: "Name des Events/Turniers" },
    { key: "{game}", description: "Spielname" },
    { key: "{winner}", description: "Discord-Erwähnung des Erstplatzierten" },
  ],
  quest_completed: [
    { key: "{questTitle}", description: "Titel der Quest" },
    { key: "{reward}", description: "Münzen-Belohnung" },
  ],
  badge_earned: [
    { key: "{badgeIcon}", description: "Icon des Abzeichens" },
    { key: "{badgeName}", description: "Name des Abzeichens" },
    { key: "{badgeDesc}", description: "Beschreibung des Abzeichens" },
  ],
  badge_awarded: [
    { key: "{badgeIcon}", description: "Icon des Abzeichens" },
    { key: "{badgeName}", description: "Name des Abzeichens" },
    { key: "{badgeDesc}", description: "Beschreibung des Abzeichens" },
  ],
  clip_started: [
    { key: "{month}", description: "Monatsname" },
    { key: "{year}", description: "Jahr" },
    { key: "{nominationCount}", description: "Anzahl nominierter Clips" },
  ],
  clip_finished: [
    { key: "{month}", description: "Monatsname" },
    { key: "{year}", description: "Jahr" },
    { key: "{resultHeadline}", description: "Kurzer Ergebnis-Titel (z.B. \"Gewinner steht fest!\")" },
    { key: "{resultText}", description: "Ausführlicher Ergebnistext" },
  ],
  rank_up: [
    { key: "{username}", description: "Discord-Erwähnung des Users" },
    { key: "{rank}", description: "Name des neuen Rangs" },
    { key: "{rankEmoji}", description: "Emoji des neuen Rangs" },
  ],
  leaderboard: [
    { key: "{month}", description: "Monatsname des Vormonats" },
    { key: "{lines}", description: "Fertig formatierte Ranglisten-Zeilen" },
  ],
  birthday: [
    { key: "{username}", description: "Discord-Erwähnung des Users" },
  ],
  lul_suggest: [
    { key: "{username}", description: "Name des Vorschlagenden" },
    { key: "{game}", description: "Vorgeschlagenes Spiel" },
    { key: "{note}", description: "Optionale Notiz (leer wenn keine)" },
  ],
  server_approved: [{ key: "{serverName}", description: "Name des Servers" }],
  server_denied:   [{ key: "{serverName}", description: "Name des Servers" }],
  server_revoked:  [{ key: "{serverName}", description: "Name des Servers" }],
};

type Props = {
  initial: NotificationRuleRow[];
  newsChannelId: string | null;
  emojis: DiscordEmoji[];
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

export default function NotificationRulesPanel({ initial, newsChannelId, emojis }: Props) {
  const [rules, setRules] = useState<NotificationRuleRow[]>(initial);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [linkDropFor, setLinkDropFor] = useState<string | null>(null);
  const [pickerFor, setPickerFor] = useState<{ key: string; field: "title" | "body" } | null>(null);
  const [lastField, setLastField] = useState<Record<string, "title" | "body">>({});

  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  function update(key: string, patch: Partial<NotificationRuleRow>) {
    setRules((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
    setDirtyKeys((s) => new Set(s).add(key));
  }

  function insertAtCursor(ruleKey: string, field: "title" | "body", text: string) {
    const rule = rules.find((r) => r.key === ruleKey);
    if (!rule) return;
    const current = field === "title" ? rule.titleTemplate : rule.bodyTemplate;
    const ref = fieldRefs.current[`${ruleKey}:${field}`];
    const start = ref?.selectionStart ?? current.length;
    const end   = ref?.selectionEnd ?? current.length;
    const next  = current.slice(0, start) + text + current.slice(end);
    update(ruleKey, field === "title" ? { titleTemplate: next } : { bodyTemplate: next });
    requestAnimationFrame(() => {
      ref?.focus();
      const pos = start + text.length;
      ref?.setSelectionRange(pos, pos);
    });
  }

  function insertEmoji(ruleKey: string, field: "title" | "body", emoji: DiscordEmoji) {
    const code = emoji.animated ? `<a:${emoji.name}:${emoji.id}>` : `<:${emoji.name}:${emoji.id}>`;
    insertAtCursor(ruleKey, field, code);
    setPickerFor(null);
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
          {saving ? "Speichert…" : dirtyKeys.size > 0 ? `Speichern (${dirtyKeys.size})` : "Gespeichert"}
        </button>
      </div>
      {dirtyKeys.size > 0 && (
        <p className="text-[11px] text-amber-400/80 -mt-4">
          Ungespeicherte Änderungen — erst mit &bdquo;Speichern&ldquo; oben werden sie wirksam.
        </p>
      )}

      {grouped.map(({ cat, rows }) => (
        <div key={cat} className="space-y-3">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest px-1">
            {CATEGORY_LABELS[cat] ?? cat}
          </h3>
          {rows.map((r) => {
            const selectedLink = PAGE_LINKS.find((p) => p.url === r.urlTemplate);
            const placeholders = PLACEHOLDERS[r.key] ?? [];
            const activeField = lastField[r.key] ?? "body";

            return (
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

                  {/* Titel */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Titel</label>
                    <input
                      ref={(el) => { fieldRefs.current[`${r.key}:title`] = el; }}
                      value={r.titleTemplate}
                      onChange={(e) => update(r.key, { titleTemplate: e.target.value })}
                      onFocus={() => setLastField((s) => ({ ...s, [r.key]: "title" }))}
                      className="w-full rounded-xl px-3 py-2 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none transition-colors"
                    />
                  </div>

                  {/* Text */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Text</label>
                    <textarea
                      ref={(el) => { fieldRefs.current[`${r.key}:body`] = el; }}
                      value={r.bodyTemplate}
                      onChange={(e) => update(r.key, { bodyTemplate: e.target.value })}
                      onFocus={() => setLastField((s) => ({ ...s, [r.key]: "body" }))}
                      rows={r.bodyTemplate.includes("\n") ? 3 : 2}
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Toolbar: Emoji-Picker + Platzhalter-Legende */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                        Platzhalter (fügt in &bdquo;{activeField === "title" ? "Titel" : "Text"}&ldquo; ein)
                      </label>
                      {emojis.length > 0 && (
                        <button
                          onClick={() => setPickerFor(pickerFor?.key === r.key ? null : { key: r.key, field: activeField })}
                          className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg transition-colors ${
                            pickerFor?.key === r.key
                              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                              : "text-gray-600 hover:text-gray-400 border border-transparent"
                          }`}
                          title="Server-Emojis einfügen"
                        >
                          <Smile className="w-3 h-3" />
                          Emoji
                        </button>
                      )}
                    </div>

                    {pickerFor?.key === r.key && (
                      <div className="rounded-xl border border-white/[0.08] bg-gray-900/80 p-2">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">
                            Server-Emojis ({emojis.length})
                          </span>
                          <button onClick={() => setPickerFor(null)} className="text-gray-600 hover:text-gray-400 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto pr-1">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji.id}
                              onClick={() => insertEmoji(r.key, pickerFor.field, emoji)}
                              title={`:${emoji.name}:`}
                              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0"
                            >
                              <img
                                src={`https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? "gif" : "webp"}?size=32`}
                                alt={emoji.name}
                                className="w-6 h-6 object-contain"
                                loading="lazy"
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {placeholders.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {placeholders.map((ph) => (
                          <button
                            key={ph.key}
                            onClick={() => insertAtCursor(r.key, activeField, ph.key)}
                            title={`${ph.description} – Klicken zum Einfügen in „${activeField === "title" ? "Titel" : "Text"}"`}
                            className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 text-[11px] font-mono transition-colors"
                          >
                            {ph.key}
                            <span className="text-[9px] text-indigo-500 font-sans non-mono ml-0.5 hidden sm:inline">
                              {ph.description}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ziel-Link Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Ziel-Link (optional)</label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setLinkDropFor(linkDropFor === r.key ? null : r.key)}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm bg-gray-800/80 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                      >
                        <span className={selectedLink ? "text-white" : "text-gray-600"}>
                          {selectedLink ? `${selectedLink.label} (${selectedLink.url})` : "Keine Verlinkung"}
                        </span>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      </button>
                      {linkDropFor === r.key && (
                        <div className="absolute z-50 left-0 right-0 mt-1 rounded-xl overflow-hidden shadow-xl bg-gray-900/98 border border-white/[0.08] max-h-56 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => { update(r.key, { urlTemplate: null }); setLinkDropFor(null); }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-500 hover:bg-white/5 transition-colors"
                          >
                            <span>Keine Verlinkung</span>
                            {!r.urlTemplate && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                          </button>
                          {PAGE_LINKS.map((p) => (
                            <button
                              key={p.url}
                              type="button"
                              onClick={() => { update(r.key, { urlTemplate: p.url }); setLinkDropFor(null); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors ${r.urlTemplate === p.url ? "text-indigo-300" : "text-gray-300"}`}
                            >
                              <span>{p.label}</span>
                              <span className="flex items-center gap-2">
                                <span className="text-xs text-gray-600">{p.url}</span>
                                {r.urlTemplate === p.url && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
