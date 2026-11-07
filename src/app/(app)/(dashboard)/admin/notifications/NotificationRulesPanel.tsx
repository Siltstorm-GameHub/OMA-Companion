"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { Smartphone } from "@/components/icons";
import { UserCheck } from "@/components/icons";
import { Hash, Users } from "@/components/icons";
import { ChevronDown } from "@/components/icons";
import { Bell, Save, MessageSquare, Send, Trash2, Check, Smile, X, Link2, Calendar } from "@/components/icons";
import { PAGE_LINKS } from "@/lib/page-links";
import { DISCORD_COLORS } from "@/lib/discord-colors";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import DiscordChannelSelect, { useDiscordChannelName } from "@/components/DiscordChannelSelect";

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
  discordColor: number | null;
  titleTemplate: string;
  bodyTemplate: string;
  urlTemplate: string | null;
  reminderHoursBefore: number | null;
  isEventNotification: boolean;
  eventAudience: string;
};

interface DiscordEmoji { id: string; name: string; animated: boolean }

const CATEGORY_LABELS: Record<string, string> = {
  events:         "📅 Events",
  tournaments:    "⚔️ Turniere",
  quests:         "🎯 Quests",
  community_jobs: "🧑‍💼 Community-Jobs",
  clips:          "🎬 Clip des Monats",
  system:         "⚙️ System",
};

// Feste Reihenfolge; unbekannte Kategorien werden danach alphabetisch angehängt (nie ausgeblendet)
const CATEGORY_ORDER = ["events", "tournaments", "quests", "community_jobs", "clips", "system"];

type ChannelFilter = "all" | "push" | "inApp" | "dm" | "chan" | "off";
const CHANNEL_FILTERS: { id: ChannelFilter; label: string }[] = [
  { id: "all",   label: "Alle" },
  { id: "chan",  label: "Discord-Kanal" },
  { id: "dm",    label: "Discord-DM" },
  { id: "push",  label: "Push" },
  { id: "inApp", label: "In-App" },
  { id: "off",   label: "Komplett aus" },
];

function matchesChannel(r: NotificationRuleRow, f: ChannelFilter): boolean {
  switch (f) {
    case "push":  return r.pushEnabled;
    case "inApp": return r.inAppEnabled;
    case "dm":    return r.discordDmEnabled;
    case "chan":  return r.discordChanEnabled;
    case "off":   return !r.pushEnabled && !r.inAppEnabled && !r.discordDmEnabled && !r.discordChanEnabled;
    default:      return true;
  }
}

/** Platzhalter, die im Text stehen, aber (noch) nicht in PLACEHOLDERS dokumentiert sind. */
function tokensIn(...texts: string[]): string[] {
  const found = new Set<string>();
  for (const t of texts) for (const m of t.matchAll(/\{[a-zA-Z]+\}/g)) found.add(m[0]);
  return [...found];
}

// Welche Platzhalter pro Regel beim Versand ersetzt werden (siehe src/lib/notify-dispatch.ts Aufrufer)
const PLACEHOLDERS: Record<string, { key: string; description: string }[]> = {
  event_new: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{date}", description: "Startdatum & Uhrzeit" },
    { key: "{format}", description: "Turnier-Format (z.B. K.O.-System)" },
    { key: "{genre}", description: "Genre des Events" },
    { key: "{teilnehmer}", description: "Anzahl in-app angemeldeter Mitspieler" },
  ],
  event_reminder: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{date}", description: "Startdatum & Uhrzeit" },
    { key: "{format}", description: "Turnier-Format (z.B. K.O.-System)" },
    { key: "{genre}", description: "Genre des Events" },
    { key: "{teilnehmer}", description: "Anzahl in-app angemeldeter Mitspieler" },
    { key: "{registrations}", description: "Aktuelle Anmeldezahl" },
    { key: "{maxPlayers}", description: "Maximale Spielerzahl" },
    { key: "{points}", description: "Punktebelohnung bei Teilnahme" },
    { key: "{reminderHours}", description: "Konfigurierter Vorlauf in Stunden" },
  ],
  event_started: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{format}", description: "Turnier-Format (z.B. K.O.-System)" },
    { key: "{genre}", description: "Genre des Events" },
    { key: "{teilnehmer}", description: "Anzahl in-app angemeldeter Mitspieler" },
  ],
  event_ended: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{format}", description: "Turnier-Format (z.B. K.O.-System)" },
    { key: "{genre}", description: "Genre des Events" },
    { key: "{teilnehmer}", description: "Anzahl in-app angemeldeter Mitspieler" },
  ],
  event_poll_started: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{format}", description: "Turnier-Format (z.B. K.O.-System)" },
    { key: "{genre}", description: "Genre des Events" },
    { key: "{teilnehmer}", description: "Anzahl in-app angemeldeter Mitspieler" },
  ],
  quest_completed: [
    { key: "{questTitle}", description: "Titel der Quest" },
    { key: "{reward}", description: "Münzen-Belohnung" },
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
  clip_of_year_started: [
    { key: "{year}", description: "Jahr" },
    { key: "{nominationCount}", description: "Anzahl nominierter Clips" },
  ],
  clip_of_year_finished: [
    { key: "{year}", description: "Jahr" },
    { key: "{resultHeadline}", description: "Kurzer Ergebnis-Titel (z.B. \"Gewinner steht fest!\")" },
    { key: "{resultText}", description: "Ausführlicher Ergebnistext" },
  ],
  birthday: [
    { key: "{username}", description: "Discord-Erwähnung des Users" },
  ],
  server_approved: [{ key: "{serverName}", description: "Name des Servers" }],
  server_denied:   [{ key: "{serverName}", description: "Name des Servers" }],
  server_revoked:  [{ key: "{serverName}", description: "Name des Servers" }],
  event_tournament_started: [
    { key: "{eventName}", description: "Name des Events" },
    { key: "{game}", description: "Spielname" },
    { key: "{format}", description: "Turnier-Format" },
    { key: "{teilnehmer}", description: "Anzahl Turnier-Teilnehmer" },
  ],
  coach_training_posted: [
    { key: "{title}", description: "Titel des Termins" },
    { key: "{description}", description: "Beschreibung des Termins" },
    { key: "{date}", description: "Datum & Uhrzeit" },
  ],
  coach_available: [
    { key: "{coach}", description: "Name des Coaches" },
    { key: "{until}", description: "Verfügbar bis (Uhrzeit)" },
  ],
  job_report_posted: [
    { key: "{emoji}", description: "Emoji des Beitrags" },
    { key: "{title}", description: "Titel des Berichts" },
    { key: "{description}", description: "Inhalt / Vorschau" },
    { key: "{author}", description: "Autor" },
  ],
  job_idea_posted: [
    { key: "{emoji}", description: "Emoji des Beitrags" },
    { key: "{title}", description: "Titel der Idee" },
    { key: "{description}", description: "Inhalt / Vorschau" },
    { key: "{author}", description: "Autor" },
  ],
  job_ideas_digest: [
    { key: "{emoji}", description: "Emoji" },
    { key: "{title}", description: "Titel des Rückblicks" },
    { key: "{description}", description: "Liste der Top-Ideen" },
  ],
  admin_quests_late: [
    { key: "{month}", description: "Monatsname" },
    { key: "{year}", description: "Jahr" },
    { key: "{day}", description: "Tag der Erzeugung" },
  ],
};

/** Realistische Beispielwerte pro Regel, nur für die Live-Vorschau im Admin-Panel. */
const SAMPLE_VALUES: Record<string, Record<string, string>> = {
  event_new:       { "{eventName}": "CS2 Community Cup", "{game}": "Counter-Strike 2", "{date}": "Freitag, 20. Dezember um 20:00", "{format}": "K.O.-System", "{genre}": "Shooter", "{teilnehmer}": "8" },
  event_reminder:  { "{eventName}": "CS2 Community Cup", "{game}": "Counter-Strike 2", "{date}": "Freitag, 20. Dezember um 20:00", "{format}": "K.O.-System", "{genre}": "Shooter", "{teilnehmer}": "8", "{registrations}": "8", "{maxPlayers}": "16", "{points}": "50", "{reminderHours}": "24" },
  event_started:   { "{eventName}": "CS2 Community Cup", "{game}": "Counter-Strike 2", "{format}": "K.O.-System", "{genre}": "Shooter", "{teilnehmer}": "8" },
  event_ended:     { "{eventName}": "CS2 Community Cup", "{game}": "Counter-Strike 2", "{format}": "K.O.-System", "{genre}": "Shooter", "{teilnehmer}": "8" },
  event_poll_started: { "{eventName}": "CS2 Community Cup", "{game}": "Counter-Strike 2", "{format}": "K.O.-System", "{genre}": "Shooter", "{teilnehmer}": "8" },
  quest_completed: { "{questTitle}": "5 Matches gewinnen", "{reward}": "50" },
  quest_new:       { "{month}": "Dezember" },
  prediction_result: { "{result}": "richtig" },
  duel_challenge:  { "{challenger}": "MaxMustermann", "{wager}": "100" },
  duel_result:     { "{result}": "Du hast gegen MaxMustermann gewonnen und 100 Münzen erhalten!" },
  clip_started:    { "{month}": "Dezember", "{year}": "2026", "{nominationCount}": "12" },
  clip_finished:   { "{month}": "Dezember", "{year}": "2026", "{resultHeadline}": "Gewinner steht fest!", "{resultText}": "MaxMustermann gewinnt mit seinem Clip \"Ace Clutch\"." },
  clip_of_year_started:  { "{year}": "2026", "{nominationCount}": "12" },
  clip_of_year_finished: { "{year}": "2026", "{resultHeadline}": "Gewinner steht fest!", "{resultText}": "MaxMustermann gewinnt mit seinem Clip \"Ace Clutch\"." },
  birthday:        { "{username}": "@MaxMustermann" },
  server_approved: { "{serverName}": "Survival #1" },
  server_denied:   { "{serverName}": "Survival #1" },
  server_revoked:  { "{serverName}": "Survival #1" },
  event_tournament_started: { "{eventName}": "CS2 Community Cup", "{game}": "Counter-Strike 2", "{format}": "K.O.-System", "{teilnehmer}": "8" },
  coach_training_posted: { "{title}": "Aim-Training", "{description}": "Gemeinsam Aim verbessern.", "{date}": "Fr., 20.12. 19:00" },
  coach_available: { "{coach}": "MaxMustermann", "{until}": "21:00" },
  job_report_posted: { "{emoji}": "📰", "{title}": "Rückblick auf den Community Cup", "{description}": "Was für ein Abend!", "{author}": "ErikaBeispiel" },
  job_idea_posted: { "{emoji}": "💡", "{title}": "Monatliches Retro-Turnier", "{description}": "Jeden Monat ein Klassiker.", "{author}": "ErikaBeispiel" },
  job_ideas_digest: { "{emoji}": "🏆", "{title}": "Top-Ideen der Woche", "{description}": "1. Retro-Turnier (12 👍)\n2. Speedrun-Abend (8 👍)" },
  admin_quests_late: { "{month}": "Dezember", "{year}": "2026", "{day}": "5" },
};

/** Standard-Randfarbe je Regel, wenn keine eigene Farbe gesetzt ist — spiegelt die Aufrufer im Code. */
const DEFAULT_COLORS: Record<string, number> = {
  event_new: DISCORD_COLORS.eventNew,
  event_ended: DISCORD_COLORS.eventResult,
  event_poll_started: DISCORD_COLORS.eventPoll,
  event_tournament_started: 0xf43f5e,
  admin_quests_late: 0xf59e0b,
};
const defaultColor = (key: string) => DEFAULT_COLORS[key] ?? DISCORD_COLORS.default;
const toHex = (n: number) => `#${n.toString(16).padStart(6, "0")}`;

/** Zusätzliche Felder, die der Code bei bestimmten Kanal-Posts automatisch anhängt (nur Vorschau). */
const SAMPLE_FIELDS: Record<string, { name: string; value: string }[]> = {
  event_new: [
    { name: "🎮 Spiel", value: "Counter-Strike 2" },
    { name: "📆 Start", value: "Freitag, 20. Dezember um 20:00" },
    { name: "👥 Max. Spieler", value: "16" },
  ],
  event_ended: [
    { name: "🎮 Spiel", value: "Counter-Strike 2" },
    { name: "🥇 Sieger", value: "MaxMustermann" },
  ],
};
/** Text über dem Embed (Erwähnungen), den der Code bei bestimmten Posts mitschickt (nur Vorschau). */
const SAMPLE_CONTENT: Record<string, string> = {
  event_tournament_started: "@MaxMustermann @ErikaBeispiel @JohnDoe",
};

/** Sehr einfache Discord-Markdown-Darstellung: **fett**, *kursiv*, Server-Emojis, Zeilenumbrüche. */
function DiscordText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|<a?:\w+:\d+>)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (/^\*\*[^*]+\*\*$/.test(p)) return <strong key={i} className="font-semibold text-white">{p.slice(2, -2)}</strong>;
        if (/^\*[^*]+\*$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>;
        const emoji = p.match(/^<(a?):(\w+):(\d+)>$/);
        if (emoji) {
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={`https://cdn.discordapp.com/emojis/${emoji[3]}.${emoji[1] ? "gif" : "webp"}?size=32`} alt={`:${emoji[2]}:`} className="inline w-[1.2em] h-[1.2em] align-[-0.2em] object-contain" />
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

/** Nachbau einer Discord-Bot-Nachricht mit Embed — so sieht der Post im Kanal bzw. in der DM aus. */
function DiscordPreview({ rule, title, body }: { rule: NotificationRuleRow; title: string; body: string }) {
  const color = rule.discordColor ?? defaultColor(rule.key);
  const fields = rule.discordChanEnabled ? SAMPLE_FIELDS[rule.key] ?? [] : [];
  const content = SAMPLE_CONTENT[rule.key];
  return (
    <div className="rounded-xl px-3 py-3 bg-[#313338] border border-black/30 flex gap-3">
      <div className="w-9 h-9 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">OMA</div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] leading-tight">
          <span className="font-semibold text-white">OMA Companion</span>
          <span className="ml-1.5 px-1 py-px rounded bg-[#5865f2] text-white text-[9px] font-semibold align-middle">BOT</span>
          <span className="ml-1.5 text-[10px] text-[#949ba4]">Heute um 20:00</span>
        </p>
        {content && (
          <p className="text-[13px] mt-0.5">
            {content.split(" ").map((m, i) => (
              <span key={i} className="mr-1 px-0.5 rounded bg-[#5865f2]/30 text-[#c9cdfb]">{m}</span>
            ))}
          </p>
        )}
        <div className="mt-1 max-w-[440px] rounded bg-[#2b2d31] border-l-4 px-3 py-2.5" style={{ borderLeftColor: toHex(color) }}>
          {title && <p className="text-[14px] font-semibold text-white break-words"><DiscordText text={title} /></p>}
          {body && <p className="text-[13px] text-[#dbdee1] whitespace-pre-line break-words mt-1"><DiscordText text={body} /></p>}
          {fields.length > 0 && (
            <div className="grid grid-cols-3 gap-x-3 gap-y-2 mt-2">
              {fields.map((f) => (
                <div key={f.name} className="min-w-0">
                  <p className="text-[12px] font-semibold text-white">{f.name}</p>
                  <p className="text-[12px] text-[#dbdee1] break-words">{f.value}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-[#949ba4] mt-2">OMA Companion</p>
        </div>
      </div>
    </div>
  );
}

/** Push-/In-App-Darstellung: Titel und Text ohne Discord-Formatierung. */
function PushPreview({ title, body }: { title: string; body: string }) {
  const plain = (t: string) => t.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/<a?:(\w+):\d+>/g, ":$1:");
  return (
    <div className="rounded-xl px-3 py-2.5 bg-black/20 border border-white/[0.06] flex gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white text-[9px] font-bold shrink-0">OMA</div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white break-words">{plain(title) || "–"}</p>
        <p className="text-xs text-gray-400 whitespace-pre-line break-words mt-0.5 line-clamp-4">{plain(body) || "–"}</p>
      </div>
    </div>
  );
}

/** Ersetzt alle Platzhalter durch ihre Beispielwerte — identisch zur Server-Logik in notify-dispatch.ts. */
function fillSample(text: string, ruleKey: string): string {
  const values = SAMPLE_VALUES[ruleKey] ?? {};
  return Object.entries(values).reduce((t, [k, v]) => t.split(k).join(v), text);
}

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
  const [linkDropRect, setLinkDropRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const [pickerFor, setPickerFor] = useState<{ key: string; field: "title" | "body" } | null>(null);
  const [lastField, setLastField] = useState<Record<string, "title" | "body">>({});
  const { confirm, ConfirmDialogElement } = useConfirm();
  const newsChannelName = useDiscordChannelName(newsChannelId);
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [openRules, setOpenRules] = useState<Set<string>>(new Set());
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const fieldRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});
  const linkBtnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const linkDropRef = useRef<HTMLDivElement | null>(null);

  // Dropdown wird als Portal in <body> gerendert (siehe render unten), damit er nicht vom
  // "overflow-hidden" der Karte (nötig für den card-shine-Effekt) abgeschnitten wird.
  useEffect(() => {
    if (!linkDropFor) return;
    function close(e: MouseEvent) {
      const btn = linkBtnRefs.current[linkDropFor!];
      if (linkDropRef.current?.contains(e.target as Node)) return;
      if (btn?.contains(e.target as Node)) return;
      setLinkDropFor(null);
    }
    // Scroll INNERHALB der Dropdown-Liste selbst soll sie nicht schließen — nur Scrollen
    // außerhalb (z.B. die Seite dahinter), da sonst die Portal-Position nicht mehr stimmt.
    function closeOnScroll(e: Event) {
      if (linkDropRef.current && e.target instanceof Node && linkDropRef.current.contains(e.target)) return;
      setLinkDropFor(null);
    }
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [linkDropFor]);

  function toggleLinkDrop(key: string) {
    if (linkDropFor === key) { setLinkDropFor(null); return; }
    const rect = linkBtnRefs.current[key]?.getBoundingClientRect();
    if (rect) setLinkDropRect({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    setLinkDropFor(key);
  }

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
    if (!(await confirm({ title: "Benachrichtigung löschen", description: `„${r.label}" wirklich löschen? Diese Benachrichtigung wird dann auf keinem Kanal mehr gesendet.`, variant: "danger" }))) return;
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
          discordColor: r.discordColor,
          titleTemplate: r.titleTemplate,
          bodyTemplate: r.bodyTemplate,
          urlTemplate: r.urlTemplate?.trim() || null,
          reminderHoursBefore: r.reminderHoursBefore,
          isEventNotification: r.isEventNotification,
          eventAudience: r.eventAudience,
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

  const q = query.trim().toLowerCase();
  const visible = rules.filter((r) =>
    matchesChannel(r, channelFilter) &&
    (!q || [r.label, r.description, r.key, r.titleTemplate, r.bodyTemplate, CATEGORY_LABELS[r.category] ?? r.category]
      .some((t) => t.toLowerCase().includes(q))),
  );
  const extraCats = [...new Set(rules.map((r) => r.category))]
    .filter((c) => !CATEGORY_ORDER.includes(c))
    .sort((a, b) => a.localeCompare(b, "de"));
  const grouped = [...CATEGORY_ORDER, ...extraCats]
    .map((cat) => ({
      cat,
      rows: visible.filter((r) => r.category === cat).sort((a, b) => a.label.localeCompare(b.label, "de")),
      total: rules.filter((r) => r.category === cat).length,
    }))
    .filter((g) => g.rows.length > 0);
  // Bei aktiver Suche/Filter sind alle Treffer-Gruppen offen, damit nichts versteckt bleibt
  const filtering = !!q || channelFilter !== "all";

  function toggleSet(setter: typeof setOpenRules, key: string) {
    setter((s) => { const next = new Set(s); if (next.has(key)) next.delete(key); else next.add(key); return next; });
  }

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

      {/* Suche + Filter */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Suchen in ${rules.length} Benachrichtigungen (Name, Text, Schlüssel …)`}
            className="flex-1 min-w-0 rounded-xl px-3 py-2 text-sm text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none transition-colors placeholder:text-gray-600"
          />
          {query && (
            <button onClick={() => setQuery("")} title="Suche leeren" className="p-2 rounded-xl text-gray-500 hover:text-white border border-white/[0.06]">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CHANNEL_FILTERS.map((f) => {
            const count = rules.filter((r) => matchesChannel(r, f.id)).length;
            return (
              <button
                key={f.id}
                onClick={() => setChannelFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-colors ${
                  channelFilter === f.id
                    ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                    : "bg-white/[0.02] text-gray-500 border-white/[0.06] hover:border-white/[0.12]"
                }`}
              >
                {f.label} <span className="opacity-60">{count}</span>
              </button>
            );
          })}
          <span className="flex-1" />
          <button
            onClick={() => setOpenRules(new Set(visible.map((r) => r.key)))}
            className="text-[11px] text-gray-500 hover:text-gray-300 px-1"
          >
            Alle aufklappen
          </button>
          <button
            onClick={() => { setOpenRules(new Set()); setCollapsedCats(new Set()); }}
            className="text-[11px] text-gray-500 hover:text-gray-300 px-1"
          >
            Alle zuklappen
          </button>
        </div>
        {/* Sprungmarken zu den Kategorien */}
        {!filtering && grouped.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {grouped.map(({ cat, total }) => (
              <a
                key={cat}
                href={`#notif-cat-${cat}`}
                className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-[11px] text-gray-400 hover:text-white hover:border-white/[0.15] transition-colors"
              >
                {CATEGORY_LABELS[cat] ?? cat} <span className="opacity-50">{total}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      {grouped.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">Keine Benachrichtigung passt zu Suche/Filter.</p>
      )}

      {grouped.map(({ cat, rows, total }) => {
        const catOpen = filtering || !collapsedCats.has(cat);
        const dirtyInCat = rows.filter((r) => dirtyKeys.has(r.key)).length;
        return (
        <div key={cat} id={`notif-cat-${cat}`} className="space-y-2 scroll-mt-20">
          <button
            onClick={() => toggleSet(setCollapsedCats, cat)}
            className="w-full flex items-center gap-2 px-1 py-1 text-left group"
          >
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${catOpen ? "" : "-rotate-90"}`} />
            <h3 className="text-[11px] font-bold text-gray-400 group-hover:text-gray-200 uppercase tracking-widest">
              {CATEGORY_LABELS[cat] ?? cat}
            </h3>
            <span className="text-[10px] text-gray-600">
              {filtering ? `${rows.length} von ${total}` : total}
            </span>
            {dirtyInCat > 0 && <span className="text-[10px] text-amber-400">● {dirtyInCat} ungespeichert</span>}
            <span className="flex-1 h-px bg-white/[0.05] ml-2" />
          </button>
          {catOpen && rows.map((r) => {
            const selectedLink = PAGE_LINKS.find((p) => p.url === r.urlTemplate);
            const documented = PLACEHOLDERS[r.key] ?? [];
            const placeholders = [
              ...documented,
              ...tokensIn(r.titleTemplate, r.bodyTemplate)
                .filter((t) => !documented.some((d) => d.key === t))
                .map((t) => ({ key: t, description: "im Text verwendet" })),
            ];
            const activeField = lastField[r.key] ?? "body";
            const isOpen = openRules.has(r.key);
            const allOff = !r.pushEnabled && !r.inAppEnabled && !r.discordDmEnabled && !r.discordChanEnabled;
            const badges: { on: boolean; icon: typeof Bell; label: string }[] = [
              { on: r.pushEnabled, icon: Smartphone, label: "Push" },
              { on: r.inAppEnabled, icon: Bell, label: "In-App" },
              { on: r.discordDmEnabled, icon: Send, label: "Discord-DM" },
              { on: r.discordChanEnabled, icon: MessageSquare, label: "Discord-Kanal" },
            ];

            return (
              <div key={r.key} className={`glass card-shine rounded-2xl overflow-hidden ${allOff ? "opacity-60" : ""}`}>
                <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${isOpen ? "border-b border-white/[0.05]" : ""}`}>
                  <button onClick={() => toggleSet(setOpenRules, r.key)} className="min-w-0 flex-1 flex items-center gap-2.5 text-left">
                    <ChevronDown className={`w-3.5 h-3.5 text-gray-500 shrink-0 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {dirtyKeys.has(r.key) && <span className="text-amber-400 mr-1" title="Ungespeichert">●</span>}
                        {r.label}
                      </p>
                      <p className={`text-[11px] text-gray-500 mt-0.5 ${isOpen ? "" : "truncate"}`}>{r.description}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    {allOff ? (
                      <span className="text-[10px] text-gray-500 px-1.5 py-0.5 rounded-md border border-white/[0.06]">aus</span>
                    ) : badges.map((b) => (
                      <span
                        key={b.label}
                        title={`${b.label}: ${b.on ? "an" : "aus"}`}
                        className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                          b.on ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" : "text-gray-700 border-transparent"
                        }`}
                      >
                        <b.icon className="w-3 h-3" />
                      </span>
                    ))}
                    {isOpen && (
                      <button
                        onClick={() => deleteRule(r)}
                        disabled={deletingKey === r.key}
                        title="Regel löschen"
                        className="ml-1 flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg text-gray-600 hover:text-red-400 border border-white/[0.06] hover:border-red-500/20 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {isOpen && (
                <div className="px-4 py-3 space-y-3">
                  <p className="text-[10px] text-gray-600 font-mono">Schlüssel: {r.key}</p>
                  {/* Kanal-Toggles */}
                  <div className="flex flex-wrap gap-1.5">
                    <Toggle on={r.pushEnabled} onClick={() => update(r.key, { pushEnabled: !r.pushEnabled })} label="Push" icon={Smartphone} />
                    <Toggle on={r.inAppEnabled} onClick={() => update(r.key, { inAppEnabled: !r.inAppEnabled })} label="In-App" icon={Bell} />
                    <Toggle on={r.discordDmEnabled} onClick={() => update(r.key, { discordDmEnabled: !r.discordDmEnabled })} label="Discord-DM" icon={Send} />
                    <Toggle on={r.discordChanEnabled} onClick={() => update(r.key, { discordChanEnabled: !r.discordChanEnabled })} label="Discord-Kanal" icon={MessageSquare} />
                  </div>

                  {/* Event-Benachrichtigung + Empfängerkreis */}
                  <div className="space-y-2">
                    <Toggle
                      on={r.isEventNotification}
                      onClick={() => update(r.key, { isEventNotification: !r.isEventNotification })}
                      label="Event-Benachrichtigung"
                      icon={Calendar}
                    />
                    {r.isEventNotification && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        <button
                          onClick={() => update(r.key, { eventAudience: "all" })}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                            r.eventAudience === "all"
                              ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                              : "bg-white/[0.02] text-gray-600 border-white/[0.06] hover:border-white/[0.12]"
                          }`}
                        >
                          <Users className="w-3.5 h-3.5" />
                          Alle User
                        </button>
                        <button
                          onClick={() => update(r.key, { eventAudience: "participants" })}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-medium transition-colors ${
                            r.eventAudience === "participants"
                              ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                              : "bg-white/[0.02] text-gray-600 border-white/[0.06] hover:border-white/[0.12]"
                          }`}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          Nur angemeldete Teilnehmer
                        </button>
                        <p className="w-full text-[10px] text-gray-600 pl-0.5">
                          {r.eventAudience === "participants"
                            ? "Nur Mitspieler, Zuschauer und Streamer, die für das jeweilige Event angemeldet sind."
                            : "Geht an alle User, unabhängig von einer Event-Anmeldung."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Kanal-ID (nur wenn Discord-Kanal aktiv) */}
                  {r.discordChanEnabled && (
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <DiscordChannelSelect
                          value={r.discordChannelId}
                          onChange={(id) => update(r.key, { discordChannelId: id })}
                          emptyLabel={`Standard: News-Kanal${newsChannelName ? ` (${newsChannelName})` : ""}`}
                        />
                        {r.isEventNotification && (
                          <p className="text-[10px] text-gray-600 mt-1">Hat das Event oder seine Reihe einen eigenen Kanal, wird immer dieser genutzt.</p>
                        )}
                      </div>
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

                  {/* Vorschau: Titel + Text mit Beispielwerten statt Platzhaltern */}
                  {(r.discordChanEnabled || r.discordDmEnabled) && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                          Vorschau Discord{r.discordChanEnabled && r.discordDmEnabled ? " (Kanal & DM)" : r.discordDmEnabled ? " (DM)" : ""}
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-gray-600">Randfarbe</span>
                          <input
                            type="color"
                            value={toHex(r.discordColor ?? defaultColor(r.key))}
                            onChange={(e) => update(r.key, { discordColor: parseInt(e.target.value.slice(1), 16) })}
                            title="Farbe des Rands am Discord-Embed"
                            className="w-7 h-6 rounded cursor-pointer bg-transparent border border-white/[0.08]"
                          />
                          {r.discordColor != null ? (
                            <button onClick={() => update(r.key, { discordColor: null })} className="text-[10px] text-gray-500 hover:text-gray-300">
                              Standard
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-700">Standard</span>
                          )}
                        </div>
                      </div>
                      <DiscordPreview rule={r} title={fillSample(r.titleTemplate, r.key)} body={fillSample(r.bodyTemplate, r.key)} />
                    </div>
                  )}
                  {(r.pushEnabled || r.inAppEnabled) && (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                        Vorschau {r.pushEnabled && r.inAppEnabled ? "Push & In-App" : r.pushEnabled ? "Push" : "In-App"}
                      </label>
                      <PushPreview title={fillSample(r.titleTemplate, r.key)} body={fillSample(r.bodyTemplate, r.key)} />
                    </div>
                  )}

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

                  {/* Ziel-Link Dropdown (als Portal gerendert, s.u. — sonst schneidet card-shine's overflow-hidden die Liste ab) */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest">Ziel-Link (optional)</label>
                    <button
                      type="button"
                      ref={(el) => { linkBtnRefs.current[r.key] = el; }}
                      onClick={() => toggleLinkDrop(r.key)}
                      className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm bg-gray-800/80 border border-white/[0.06] hover:border-white/[0.12] transition-colors"
                    >
                      <span className={selectedLink ? "text-white" : "text-gray-600"}>
                        {selectedLink ? `${selectedLink.label} (${selectedLink.url})` : "Keine Verlinkung"}
                      </span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                    </button>
                    {r.isEventNotification && (
                      <p className="flex items-center gap-1 text-[10px] text-teal-400/80">
                        <Link2 className="w-3 h-3 shrink-0" />
                        Führt automatisch zum jeweiligen Event/Turnier — dieser Link ist nur ein Fallback, falls ausnahmsweise keine Zuordnung vorliegt.
                      </p>
                    )}
                  </div>
                </div>
                )}
              </div>
            );
          })}
        </div>
        );
      })}

      {linkDropFor && linkDropRect && typeof document !== "undefined" && createPortal(
        (() => {
          const activeRule = rules.find((x) => x.key === linkDropFor);
          if (!activeRule) return null;
          return (
            <div
              ref={linkDropRef}
              style={{ position: "fixed", top: linkDropRect.top, left: linkDropRect.left, width: linkDropRect.width }}
              className="z-[100] rounded-xl overflow-hidden shadow-xl bg-gray-900/98 border border-white/[0.08] max-h-56 overflow-y-auto"
            >
              <button
                type="button"
                onClick={() => { update(activeRule.key, { urlTemplate: null }); setLinkDropFor(null); }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-500 hover:bg-white/5 transition-colors"
              >
                <span>Keine Verlinkung</span>
                {!activeRule.urlTemplate && <Check className="w-3.5 h-3.5 text-indigo-400" />}
              </button>
              {PAGE_LINKS.map((p) => (
                <button
                  key={p.url}
                  type="button"
                  onClick={() => { update(activeRule.key, { urlTemplate: p.url }); setLinkDropFor(null); }}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-white/5 transition-colors ${activeRule.urlTemplate === p.url ? "text-indigo-300" : "text-gray-300"}`}
                >
                  <span>{p.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">{p.url}</span>
                    {activeRule.urlTemplate === p.url && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                  </span>
                </button>
              ))}
            </div>
          );
        })(),
        document.body,
      )}
      {ConfirmDialogElement}
    </div>
  );
}
