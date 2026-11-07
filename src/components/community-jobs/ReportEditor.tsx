"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import GameCoverPicker, { type PickedGameCover } from "./GameCoverPicker";
import { isGameCoverUrl } from "@/lib/game-cover-url";
import { toast } from "sonner";
import { Bold, Italic, Heading2, Quote } from "@/components/icons";
import { ImagePlus, Wand2 } from "@/components/icons";
import { List, Link2, Eye, Pencil, X, Smile, AtSign, LayoutTemplate, History, Camera } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import MarkdownLite from "@/components/community-jobs/MarkdownLite";
import EmojiPanel from "@/components/community-jobs/EmojiPicker";
import { REPORT_CATEGORIES, REPORT_TITLE_MAX, REPORT_BODY_MAX } from "@/lib/report-categories";
import { readingMinutes, wordCount } from "@/lib/report-text";
import { mentionToken } from "@/lib/report-mentions";
import { isVideoUrl } from "@/lib/upload-limits";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/time";
import type { EventFacts } from "@/lib/report-event-facts";
import PostMediaEditor, { type EditorMedia } from "./PostMediaEditor";
import { Megaphone, Copy } from "@/components/icons";
import {
  MARKETING_TEMPLATES, buildMarketingText, isMarketingTemplate, withEventLink, type MarketingEventFacts, type MarketingTemplateId,
} from "@/lib/marketing-templates";

/**
 * Editor für Beiträge (Content Creator) — ein Beitrag kann Werbung, Fotos & Clips oder ein Bericht sein,
 * wie es der User mag: Titel (optional), Text mit Formatierung/Vorschau, Emojis, @-Erwähnungen, Bausteine
 * (Ergebnis-Tabelle, Rangliste, Interview, Rückblick), Bilder & Clips (Upload, Studio, Collage), Titelbild aus
 * der Mediathek oder Spiel-Cover, Werbe-Vorlagen mit Anmelde-Link, Kategorie, Reihe, Event-Bezug, Bildwunsch,
 * Versionsverlauf mit Korrekturhinweis, Entwurf speichern oder veröffentlichen.
 */

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  // Offene Community-Jobs: Beitrag über dem Tageslimit — veröffentlicht, zählt aber nicht fürs Gehalt.
  if (typeof data?.notice === "string" && data.notice) toast.warning(data.notice);
  return data as T;
}

export interface ReportEditorInitial {
  title: string; bodyMarkdown: string; category: string | null; eventId: string | null;
  coverAssetId: string | null; referencedMarketingPostId: string | null; seriesId?: string | null; isDraft: boolean;
  gameCoverUrl?: string | null; gameCoverName?: string | null;
  media?: { id: string; url: string; caption: string | null; type: string }[];
  template?: string | null; campaignId?: string | null; trainingSessionId?: string | null;
}

/** Vorbelegung beim Start aus Empfehlungen, Anfragen, Kampagnen oder Spiele-Angeboten. */
export interface PostEditorPrefill {
  title?: string; body?: string; link?: string; linkLabel?: string; imageUrl?: string;
  /** Mediathek-Bild als Titelbild. */
  assetId?: string;
  template?: string; campaignId?: string; trainingSessionId?: string;
  /** Bildwunsch, den dieser Beitrag erfüllen soll. */
  photoRequestId?: string;
  /** Direkt die Monats-Collage öffnen. */
  collage?: boolean;
}

interface EventOption { id: string; title: string; startAt: string }
interface AssetOption { id: string; url: string; caption: string | null; type: string }
interface SeriesOption { id: string; title: string }
interface Revision { id: string; title: string; bodyMarkdown: string; note: string | null; savedAt: string }
interface FoundUser { id: string; username: string | null; name: string | null }
interface InterviewOption { id: string; status: string; interviewee: { username: string | null; name: string | null }; markdown: string | null }

const INPUT = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";
const SMALL_INPUT = "bg-white/[0.04] border border-white/10 rounded-md px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";

function appendLink(text: string, link?: string): string {
  if (!link || text.includes(link)) return text;
  return `${text.trim()}\n\n${link}`;
}

/** Vorlage aus den Event-Fakten — der Journalist füllt nur noch die "…" aus. */
function buildEventTemplate(f: EventFacts): string {
  const date = formatBerlinDate(f.startAt, { day: "2-digit", month: "long", year: "numeric" });
  const lines: string[] = [];
  lines.push("## Kurzfassung");
  lines.push(`${f.title}${f.game ? ` (${f.game})` : ""} fand am ${date} statt${f.participantsCount > 0 ? ` — ${f.participantsCount} ${f.participantsCount === 1 ? "Spieler war" : "Spieler waren"} dabei` : ""}. …`);
  if (f.summary?.trim()) lines.push("", `> ${f.summary.trim().replace(/\n+/g, " ")}`);
  lines.push("", "## Ergebnis");
  if (f.ranking.length > 0) {
    f.ranking.forEach(r => lines.push(`${r.place}. ${r.name}`));
  } else {
    lines.push("Die Platzierungen: …");
  }
  if (f.mvp) lines.push("", `**MVP:** ${f.mvp}`);
  if (f.participants.length > 0) {
    lines.push("", `**Mit dabei:** ${f.participants.join(", ")}${f.participantsCount > f.participants.length ? " u.a." : ""}`);
  }
  lines.push("", "## Highlights", "- …", "- …", "", "## Stimmen aus der Community", "> …", "", "## Fazit", "…", "", `Alle Details zum Event: ${typeof window !== "undefined" ? window.location.origin : ""}${f.url}`);
  return lines.join("\n");
}

const cell = (s: string) => s.replace(/\|/g, "/");

export default function ReportEditor({
  reportId, initial, eventId: presetEventId, presetCoverAssetId, presetPostId, recap, prefill, onDone,
}: {
  reportId?: string;
  initial?: ReportEditorInitial;
  /** Vom Event aus gestartet (Empfehlung): Event vorwählen und Vorlage automatisch füllen. */
  eventId?: string;
  /** Vom Foto/Werbe-Post im Board aus gestartet: Titelbild bzw. Werbe-Post vorwählen. */
  presetCoverAssetId?: string;
  presetPostId?: string;
  /** Rückblick-Vorlage (Woche/Monat) automatisch einsetzen. */
  recap?: "week" | "month";
  prefill?: PostEditorPrefill;
  onDone: () => void;
}) {
  const trainingSessionId = initial?.trainingSessionId ?? prefill?.trainingSessionId;
  const campaignId = initial?.campaignId ?? prefill?.campaignId;
  const photoRequestId = prefill?.photoRequestId;
  const [title, setTitle] = useState(initial?.title ?? prefill?.title ?? "");
  const [body, setBody] = useState(initial?.bodyMarkdown ?? prefill?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [eventId, setEventId] = useState(initial?.eventId ?? presetEventId ?? "");
  const [coverAssetId, setCoverAssetIdRaw] = useState(initial?.coverAssetId ?? presetCoverAssetId ?? prefill?.assetId ?? "");
  // Titelbild: Fotograf-Bild ODER Spiel-Cover — das eine ersetzt das andere.
  const [gameCover, setGameCoverRaw] = useState<PickedGameCover | null>(
    initial?.gameCoverUrl ? { name: initial.gameCoverName ?? "", url: initial.gameCoverUrl }
      : prefill?.imageUrl && isGameCoverUrl(prefill.imageUrl) ? { name: prefill.linkLabel ?? "", url: prefill.imageUrl } : null,
  );
  const [coverPickerOpen, setCoverPickerOpen] = useState(!!gameCover);
  const setCoverAssetId = (id: string) => { setCoverAssetIdRaw(id); if (id) { setGameCoverRaw(null); setCoverPickerOpen(false); } };
  const setGameCover = (v: PickedGameCover | null) => { setGameCoverRaw(v); if (v) setCoverAssetIdRaw(""); };
  // Früher: "Über diesen Werbe-Post berichten" — bleibt beim Bearbeiten erhalten, wird aber nicht mehr neu gesetzt.
  const refPostId = initial?.referencedMarketingPostId ?? presetPostId ?? "";
  const [media, setMedia] = useState<EditorMedia[]>(() => {
    if (initial?.media) return initial.media.map(m => ({ id: m.id, url: m.url, caption: m.caption ?? "", type: m.type }));
    // Eigenes Bild aus einem Spiele-Angebot o.ä. (kein Spiel-Cover) als erstes Medium übernehmen.
    if (prefill?.imageUrl && !isGameCoverUrl(prefill.imageUrl)) return [{ url: prefill.imageUrl, caption: "", type: "GRAPHIC" }];
    return [];
  });
  const [albumId, setAlbumId] = useState("");
  // Werbung: Vorlage, Event-/Trainings-Fakten und Anmelde-Link.
  const initialTemplate = initial?.template ?? prefill?.template;
  const [template, setTemplate] = useState<MarketingTemplateId>(
    isMarketingTemplate(initialTemplate) ? initialTemplate : trainingSessionId ? "training" : "announce",
  );
  const [usedTemplate, setUsedTemplate] = useState<string | null>(isMarketingTemplate(initialTemplate) ? initialTemplate : null);
  const [loadedFacts, setFacts] = useState<MarketingEventFacts | null>(null);
  // Fakten gelten nur, solange ein Event bzw. Trainings-Termin gewählt ist.
  const facts = eventId || trainingSessionId ? loadedFacts : null;
  const [includeLink, setIncludeLink] = useState(false);
  const [marketingOpen, setMarketingOpen] = useState(!!trainingSessionId || !!campaignId || isMarketingTemplate(initialTemplate));
  const [seriesId, setSeriesId] = useState(initial?.seriesId ?? "");
  const [editNote, setEditNote] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"draft" | "publish" | "save" | null>(null);
  const [filling, setFilling] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [assetQuery, setAssetQuery] = useState("");
  const [seriesList, setSeriesList] = useState<SeriesOption[]>([]);
  const [newSeries, setNewSeries] = useState("");
  const [insertAssetId, setInsertAssetId] = useState("");
  const [panel, setPanel] = useState<null | "emoji" | "mention" | "blocks">(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<FoundUser[]>([]);
  const [interviews, setInterviews] = useState<InterviewOption[] | null>(null);
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoText, setPhotoText] = useState("");
  const [photoBusy, setPhotoBusy] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const autoFilled = useRef(false);
  const searchSeq = useRef(0);

  const isDraftEdit = !!reportId && initial?.isDraft === true;
  const isPublishedEdit = !!reportId && initial?.isDraft === false;

  // Mediathek fürs Titelbild — mit Suche (Bildunterschrift, Event, Fotograf), leicht verzögert.
  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams();
      if (assetQuery.trim()) params.set("q", assetQuery.trim());
      api<{ assets: AssetOption[] }>(`/api/community-jobs/media?${params}`).then(d => setAssets(d.assets.filter(a => !isVideoUrl(a.url)))).catch(() => {});
    }, assetQuery ? 250 : 0);
    return () => clearTimeout(handle);
  }, [assetQuery]);

  useEffect(() => {
    api<EventOption[]>("/api/events").then(all => setEvents([...all].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()).slice(0, 80))).catch(() => {});
    api<{ series: SeriesOption[] }>("/api/community-jobs/reports/series").then(d => setSeriesList(d.series)).catch(() => {});
  }, []);

  // ── Vorlagen ──────────────────────────────────────────────────────────────
  async function fillFromEvent(targetEventId: string, silent = false) {
    if (!targetEventId) return;
    if (!silent && body.trim() && !window.confirm("Der bisherige Text wird durch die Event-Vorlage ersetzt. Fortfahren?")) return;
    setFilling(true);
    try {
      const facts = await api<EventFacts>(`/api/community-jobs/reports/event-facts?eventId=${encodeURIComponent(targetEventId)}`);
      setBody(buildEventTemplate(facts));
      setTitle(t => t || `Rückblick: ${facts.title}`);
      setCategory(c => c || "turnierbericht");
      setEventId(targetEventId);
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Event-Daten konnten nicht geladen werden");
    } finally {
      setFilling(false);
    }
  }

  async function fillRecap(period: "week" | "month", silent = false) {
    if (!silent && body.trim() && !window.confirm("Der bisherige Text wird durch die Rückblick-Vorlage ersetzt. Fortfahren?")) return;
    setFilling(true);
    try {
      const r = await api<{ title: string; body: string; category: string }>(`/api/community-jobs/reports/recap?period=${period}`);
      setBody(r.body);
      setTitle(t => t || r.title);
      setCategory(c => c || r.category);
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : "Rückblick konnte nicht erstellt werden");
    } finally {
      setFilling(false);
    }
  }

  // Vom Rückblick-Hinweis aus gestartet und noch leer → Rückblick-Vorlage direkt einsetzen (einmalig).
  useEffect(() => {
    if (autoFilled.current || reportId || body.trim()) return;
    if (recap) { autoFilled.current = true; fillRecap(recap, true); }
  }, [recap]); // eslint-disable-line react-hooks/exhaustive-deps -- nur beim Öffnen

  // Event-/Trainings-Fakten (Datum, Spiel, Anmeldungen, Link) — Grundlage für Werbe-Vorlagen und Anmelde-Link.
  useEffect(() => {
    if (!eventId && !trainingSessionId) return; // ohne Event/Termin: activeFacts ist dann null
    let cancelled = false;
    const query = trainingSessionId ? `trainingSessionId=${encodeURIComponent(trainingSessionId)}` : `eventId=${encodeURIComponent(eventId)}`;
    api<MarketingEventFacts>(`/api/community-jobs/marketing-posts/facts?${query}`)
      .then(f => {
        if (cancelled) return;
        setFacts(f);
        // Vom Event/Training aus gestartet und noch leer: kommendes Event → Werbe-Text, vergangenes → Bericht-Vorlage.
        if (!autoFilled.current && !reportId && !body.trim() && (presetEventId || trainingSessionId)) {
          autoFilled.current = true;
          const upcoming = f.training || new Date(f.startAt).getTime() > Date.now();
          if (upcoming) {
            setBody(buildMarketingText(template, f));
            setUsedTemplate(template);
            setIncludeLink(!f.training);
            setMarketingOpen(true);
          } else if (presetEventId) {
            fillFromEvent(presetEventId, true);
          }
        }
      })
      .catch(() => { if (!cancelled) setFacts(null); });
    return () => { cancelled = true; };
  }, [eventId, trainingSessionId]); // eslint-disable-line react-hooks/exhaustive-deps -- nur auf Event-/Terminwechsel

  function applyTemplate() {
    if (!facts) return;
    if (body.trim() && !window.confirm("Den bisherigen Text durch die Werbe-Vorlage ersetzen?")) return;
    setBody(buildMarketingText(template, facts));
    setUsedTemplate(template);
  }
  function finalText(): string {
    const withSignup = facts && includeLink ? withEventLink(body, facts, true) : body;
    return appendLink(withSignup, prefill?.link);
  }
  function copyText() {
    navigator.clipboard?.writeText(finalText())
      .then(() => toast.success("Text kopiert — z.B. für Instagram oder Discord"))
      .catch(() => toast.error("Kopieren nicht möglich"));
  }

  // ── Einfügen ──────────────────────────────────────────────────────────────
  function wrap(prefix: string, suffix: string, placeholder: string) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    const selected = body.slice(start, end) || placeholder;
    setBody(body.slice(0, start) + prefix + selected + suffix + body.slice(end));
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }
  function linePrefix(prefix: string) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? body.length;
    const lineStart = body.lastIndexOf("\n", start - 1) + 1;
    setBody(body.slice(0, lineStart) + prefix + body.slice(lineStart));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + prefix.length, start + prefix.length); });
  }
  /** Text an der Cursorposition einfügen und den Cursor dahinter setzen. */
  function insertText(text: string) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? body.length;
    const end = el?.selectionEnd ?? body.length;
    setBody(body.slice(0, start) + text + body.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + text.length, start + text.length); });
  }
  function insertBlock(markdown: string) { insertText(`\n\n${markdown}\n\n`); }
  function insertImage() {
    const asset = assets.find(a => a.id === insertAssetId);
    if (!asset) return;
    insertBlock(`![${(asset.caption ?? "Bild").replace(/[\[\]]/g, "")}](${asset.url})`);
    setInsertAssetId("");
  }

  // @-Erwähnung: Spieler suchen
  useEffect(() => {
    if (panel !== "mention" || mentionQuery.trim().length < 2) { setMentionResults([]); return; }
    const seq = ++searchSeq.current;
    const timer = setTimeout(() => {
      api<FoundUser[]>(`/api/users/search?q=${encodeURIComponent(mentionQuery.trim())}`)
        .then(r => { if (seq === searchSeq.current) setMentionResults(r); }).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [mentionQuery, panel]);

  // Bausteine
  async function blockResults() {
    if (!eventId) return;
    try {
      const f = await api<EventFacts>(`/api/community-jobs/reports/event-facts?eventId=${encodeURIComponent(eventId)}`);
      if (f.ranking.length === 0) { toast.error("Für dieses Event gibt es noch keine Platzierungen"); return; }
      insertBlock(["| Platz | Spieler |", "| --- | --- |", ...f.ranking.map(r => `| ${r.place} | ${cell(r.name)} |`)].join("\n"));
      setPanel(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function blockParticipants() {
    if (!eventId) return;
    try {
      const f = await api<EventFacts>(`/api/community-jobs/reports/event-facts?eventId=${encodeURIComponent(eventId)}`);
      insertBlock(`**Teilnehmer (${f.participantsCount}):** ${f.participants.join(", ")}${f.participantsCount > f.participants.length ? " u.a." : ""}`);
      setPanel(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function blockLeaderboard() {
    try {
      const r = await api<{ markdown: string }>("/api/community-jobs/reports/blocks?type=leaderboard");
      insertBlock(`**Rangliste — Top 10**\n\n${r.markdown}`);
      setPanel(null);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function loadInterviews() {
    if (interviews !== null) return;
    try {
      const r = await api<{ interviews: InterviewOption[] }>("/api/community-jobs/interviews");
      setInterviews(r.interviews.filter(i => i.markdown));
    } catch { setInterviews([]); }
  }
  function togglePanel(next: "emoji" | "mention" | "blocks") {
    setPanel(cur => (cur === next ? null : next));
    if (next === "blocks") loadInterviews();
  }

  // ── Reihen / Versionen / Bildwunsch ───────────────────────────────────────
  async function createSeries() {
    if (!newSeries.trim()) return;
    try {
      const r = await api<{ seriesId: string }>("/api/community-jobs/reports/series", { method: "POST", body: JSON.stringify({ title: newSeries }) });
      setSeriesList(list => [{ id: r.seriesId, title: newSeries.trim() }, ...list]);
      setSeriesId(r.seriesId);
      setNewSeries("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Reihe konnte nicht angelegt werden"); }
  }
  async function toggleRevisions() {
    if (showRevisions) { setShowRevisions(false); return; }
    setShowRevisions(true);
    if (revisions === null && reportId) {
      try { setRevisions((await api<{ revisions: Revision[] }>(`/api/community-jobs/reports/${reportId}/revisions`)).revisions); }
      catch { setRevisions([]); }
    }
  }
  async function sendPhotoRequest() {
    setPhotoBusy(true);
    try {
      await api("/api/community-jobs/photo-requests", { method: "POST", body: JSON.stringify({ eventId: eventId || undefined, description: photoText, requesterJob: "content_creator" }) });
      toast.success("Bildwunsch gesendet");
      setPhotoOpen(false); setPhotoText("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Bildwunsch fehlgeschlagen"); }
    finally { setPhotoBusy(false); }
  }

  // ── Speichern ─────────────────────────────────────────────────────────────
  async function submit(mode: "draft" | "publish" | "save") {
    setBusy(mode);
    try {
      const payload = {
        title, bodyMarkdown: finalText(),
        category: category || null, eventId: eventId || null, seriesId: seriesId || null,
        coverAssetId: gameCover ? null : coverAssetId || null, referencedMarketingPostId: refPostId || null,
        gameCoverUrl: gameCover?.url ?? null, gameCoverName: gameCover?.name ?? null,
        media: media.map(m => ({ id: m.id, url: m.url, caption: m.caption, type: m.type })),
        albumId: albumId || null,
        template: usedTemplate, campaignId: campaignId ?? null, trainingSessionId: trainingSessionId ?? null,
        photoRequestId: photoRequestId ?? null,
      };
      if (reportId) {
        await api(`/api/community-jobs/reports/${reportId}`, { method: "PATCH", body: JSON.stringify({ ...payload, editNote: isPublishedEdit ? editNote : undefined }) });
        if (mode === "publish") await api(`/api/community-jobs/reports/${reportId}/publish`, { method: "POST" });
      } else {
        await api("/api/community-jobs/reports", { method: "POST", body: JSON.stringify({ ...payload, draft: mode === "draft" }) });
      }
      toast.success(mode === "draft" ? "Entwurf gespeichert" : mode === "publish" ? "Veröffentlicht" : "Gespeichert");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(null);
    }
  }

  const words = useMemo(() => wordCount(body), [body]);
  const minutes = useMemo(() => readingMinutes(body), [body]);
  const cover = assets.find(a => a.id === coverAssetId);
  // Ein Beitrag braucht Text ODER ein Bild/einen Clip — der Titel ist optional.
  const canSubmit = (body.trim().length > 0 || media.length > 0 || !!coverAssetId || !!gameCover) && body.length <= REPORT_BODY_MAX;
  const selectedEventTitle = events.find(e => e.id === eventId)?.title;

  const toolbar: { icon: typeof Bold; label: string; run: () => void }[] = [
    { icon: Bold, label: "Fett", run: () => wrap("**", "**", "fett") },
    { icon: Italic, label: "Kursiv", run: () => wrap("*", "*", "kursiv") },
    { icon: Heading2, label: "Überschrift", run: () => linePrefix("## ") },
    { icon: List, label: "Liste", run: () => linePrefix("- ") },
    { icon: Quote, label: "Zitat", run: () => linePrefix("> ") },
    { icon: Link2, label: "Link", run: () => wrap("[", "](https://)", "Linktext") },
  ];
  const panelButtons: { key: "emoji" | "mention" | "blocks"; icon: typeof Smile; label: string }[] = [
    { key: "emoji", icon: Smile, label: "Emoji einfügen" },
    { key: "mention", icon: AtSign, label: "Spieler erwähnen" },
    { key: "blocks", icon: LayoutTemplate, label: "Bausteine" },
  ];

  return (
    <div className="space-y-3">
      {trainingSessionId && (
        <p className="text-xs text-gray-300 rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">🎓 Werbung für den Trainings-Termin{facts ? `: ${facts.title}` : ""}</p>
      )}
      {photoRequestId && (
        <p className="text-xs text-gray-300 rounded-lg bg-white/[0.03] border border-white/10 px-3 py-2">📸 Du erfüllst einen Bildwunsch{prefill?.title ? `: „${prefill.title}“` : ""} — füge mindestens ein Bild hinzu.</p>
      )}
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={REPORT_TITLE_MAX} placeholder="Titel (optional)" className={INPUT} />

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="space-y-1 text-[11px] text-gray-500">
          Kategorie
          <Select value={category} className="w-full" onChange={e => setCategory(e.target.value)}>
            <option value="">Keine Kategorie</option>
            {REPORT_CATEGORIES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
        </label>
        <label className="space-y-1 text-[11px] text-gray-500">
          Event
          <Select value={eventId} className="w-full" onChange={e => setEventId(e.target.value)}>
            <option value="">Kein Event</option>
            {events.map(ev => <option key={ev.id} value={ev.id}>{ev.title} — {formatBerlinDate(ev.startAt)}</option>)}
          </Select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {eventId && (
          <Button size="sm" variant="outline" loading={filling} icon={<Wand2 className="w-3.5 h-3.5" />} onClick={() => fillFromEvent(eventId)}>
            Aus Event vorbefüllen
          </Button>
        )}
      </div>

      {/* Reihe */}
      <div className="space-y-1">
        <p className="text-[11px] text-gray-500">Reihe (z.B. „Turnier-Rückblick“, optional)</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <Select value={seriesId} onChange={e => setSeriesId(e.target.value)}>
            <option value="">Keine Reihe</option>
            {seriesList.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
          </Select>
          <input value={newSeries} onChange={e => setNewSeries(e.target.value)} maxLength={100} placeholder="Neue Reihe…" className={`w-40 ${SMALL_INPUT}`}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); createSeries(); } }} />
          <Button size="sm" variant="ghost" disabled={!newSeries.trim()} onClick={createSeries}>Anlegen</Button>
        </div>
      </div>

      {/* Titelbild */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] text-gray-500">Titelbild aus der Mediathek (optional, auch Bilder anderer)</p>
          <button onClick={() => setPhotoOpen(v => !v)} className="text-[11px] text-gray-500 hover:text-teal-300 transition-colors inline-flex items-center gap-1">
            <Camera className="w-3 h-3" /> Bild bei anderen anfragen
          </button>
        </div>
        {photoOpen && (
          <div className="rounded-lg bg-white/[0.03] p-2 space-y-1.5">
            <textarea value={photoText} onChange={e => setPhotoText(e.target.value)} rows={2} maxLength={300}
              placeholder={selectedEventTitle ? `Welches Bild brauchst du zu „${selectedEventTitle}“?` : "Welches Bild brauchst du?"} className={`w-full resize-none ${SMALL_INPUT}`} />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setPhotoOpen(false)}>Abbrechen</Button>
              <Button size="sm" loading={photoBusy} disabled={!photoText.trim()} onClick={sendPhotoRequest}>Anfragen</Button>
            </div>
          </div>
        )}
        <input value={assetQuery} onChange={e => setAssetQuery(e.target.value)} placeholder="Mediathek durchsuchen (Unterschrift, Event, Fotograf)" className={`w-full ${SMALL_INPUT}`} />
        {assets.length === 0 ? (
          <p className="text-[11px] text-gray-600">{assetQuery ? "Nichts gefunden." : "Noch keine Bilder in der Mediathek."}</p>
        ) : (
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            <button onClick={() => setCoverAssetId("")} aria-pressed={coverAssetId === ""}
              className={`shrink-0 w-16 h-12 rounded-lg border text-[10px] ${coverAssetId === "" ? "border-teal-400 text-teal-300" : "border-white/10 text-gray-500 hover:text-white"}`}>
              Keins
            </button>
            {assets.map(a => (
              <button key={a.id} onClick={() => setCoverAssetId(a.id)} aria-pressed={coverAssetId === a.id} title={a.caption ?? a.type}
                className={`shrink-0 rounded-lg overflow-hidden border-2 ${coverAssetId === a.id ? "border-teal-400" : "border-transparent hover:border-white/20"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element -- Mediathek-Vorschau, beliebiger Blob-Host */}
                <img src={a.url} alt="" className="w-16 h-12 object-cover" />
              </button>
            ))}
          </div>
        )}
        {coverAssetId && <p className="text-[10px] text-gray-600">Gewählt: {cover ? (cover.caption ?? cover.type) : "Bild aus der Mediathek"}</p>}
        <button type="button" onClick={() => setCoverPickerOpen(v => !v)} aria-expanded={coverPickerOpen}
          className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors">
          {coverPickerOpen ? "Spiel-Cover ausblenden" : "Oder ein Spiel-Cover als Titelbild wählen"}
        </button>
        {coverPickerOpen && <GameCoverPicker value={gameCover} onChange={setGameCover} />}
      </div>

      {/* Editor / Vorschau */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-0.5" role="toolbar" aria-label="Formatierung">
            {toolbar.map(t => (
              <button key={t.label} onClick={t.run} disabled={preview} title={t.label} aria-label={t.label}
                className="p-1.5 rounded text-gray-400 hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors">
                <t.icon className="w-3.5 h-3.5" />
              </button>
            ))}
            {panelButtons.map(b => (
              <button key={b.key} onClick={() => togglePanel(b.key)} disabled={preview} title={b.label} aria-label={b.label} aria-expanded={panel === b.key}
                className={`p-1.5 rounded hover:text-white hover:bg-white/[0.06] disabled:opacity-30 transition-colors ${panel === b.key ? "text-teal-300" : "text-gray-400"}`}>
                <b.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-white/10 overflow-hidden text-[11px] font-semibold" role="tablist">
            <button role="tab" aria-selected={!preview} onClick={() => setPreview(false)}
              className={`px-2.5 py-1 flex items-center gap-1 ${!preview ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}><Pencil className="w-3 h-3" /> Schreiben</button>
            <button role="tab" aria-selected={preview} onClick={() => setPreview(true)}
              className={`px-2.5 py-1 flex items-center gap-1 ${preview ? "bg-white/10 text-white" : "text-gray-500 hover:text-gray-300"}`}><Eye className="w-3 h-3" /> Vorschau</button>
          </div>
        </div>

        {panel === "emoji" && !preview && <EmojiPanel onPick={insertText} onClose={() => setPanel(null)} />}

        {panel === "mention" && !preview && (
          <div className="rounded-lg border border-white/10 bg-gray-900/95 p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <input value={mentionQuery} onChange={e => setMentionQuery(e.target.value)} autoFocus placeholder="Spieler suchen (mind. 2 Zeichen)…" aria-label="Spieler suchen" className={`flex-1 ${SMALL_INPUT}`} />
              <button onClick={() => setPanel(null)} aria-label="Schließen" className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
            </div>
            {mentionResults.map(u => (
              <button key={u.id} onClick={() => { insertText(`${mentionToken(u.username ?? u.name ?? "Spieler", u.id)} `); setPanel(null); setMentionQuery(""); }}
                className="w-full text-left text-xs text-gray-300 hover:bg-white/[0.06] rounded px-2 py-1">@{u.username ?? u.name}</button>
            ))}
            <p className="text-[10px] text-gray-600">Genannte Spieler bekommen beim Veröffentlichen eine Benachrichtigung.</p>
          </div>
        )}

        {panel === "blocks" && !preview && (
          <div className="rounded-lg border border-white/10 bg-gray-900/95 p-2 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-300">Bausteine einfügen</p>
              <button onClick={() => setPanel(null)} aria-label="Schließen" className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="outline" disabled={!eventId} title={eventId ? undefined : "Wähle zuerst ein Event"} onClick={blockResults}>Ergebnis-Tabelle</Button>
              <Button size="sm" variant="outline" disabled={!eventId} title={eventId ? undefined : "Wähle zuerst ein Event"} onClick={blockParticipants}>Teilnehmerliste</Button>
              <Button size="sm" variant="outline" onClick={blockLeaderboard}>Rangliste Top 10</Button>
              <Button size="sm" variant="outline" onClick={() => { setPanel(null); fillRecap("week"); }}>Wochenrückblick</Button>
              <Button size="sm" variant="outline" onClick={() => { setPanel(null); fillRecap("month"); }}>Monatsrückblick</Button>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-gray-500">Interview einfügen</p>
              {interviews === null && <p className="text-[10px] text-gray-600">Lädt…</p>}
              {interviews !== null && interviews.length === 0 && <p className="text-[10px] text-gray-600">Keine beantworteten Interviews vorhanden.</p>}
              {interviews?.map(i => (
                <button key={i.id} onClick={() => { insertBlock(i.markdown!); setPanel(null); }}
                  className="block w-full text-left text-xs text-gray-300 hover:bg-white/[0.06] rounded px-2 py-1">Interview mit {i.interviewee.username ?? i.interviewee.name}</button>
              ))}
            </div>
          </div>
        )}

        {preview ? (
          <div className="rounded-lg bg-white/[0.03] border border-white/10 p-3 min-h-[12rem] space-y-3">
            {title.trim() && <h3 className="text-base font-bold text-white">{title}</h3>}
            {body.trim() ? <MarkdownLite text={body} /> : <p className="text-xs text-gray-600">Noch kein Text.</p>}
          </div>
        ) : (
          <textarea ref={areaRef} value={body} onChange={e => setBody(e.target.value)} rows={12}
            placeholder="Dein Beitrag — Werbetext, ein paar Worte zu deinen Bildern oder ein ganzer Bericht. Formatierung über die Leiste oder als Markdown (**fett**, ## Überschrift, - Liste)."
            className={`${INPUT} resize-y font-mono text-[13px] leading-relaxed`} />
        )}

        <div className="flex items-center justify-between gap-2 text-[10px] text-gray-600 flex-wrap">
          <span className={body.length > REPORT_BODY_MAX ? "text-red-400" : ""}>{body.length.toLocaleString("de-DE")}/{REPORT_BODY_MAX.toLocaleString("de-DE")} Zeichen · {words} Wörter · ca. {minutes} Min. Lesezeit</span>
          {assets.length > 0 && !preview && (
            <span className="flex items-center gap-1.5">
              <Select value={insertAssetId} onChange={e => setInsertAssetId(e.target.value)}>
                <option value="">Bild einfügen…</option>
                {assets.map(a => <option key={a.id} value={a.id}>{a.caption ?? a.type}</option>)}
              </Select>
              <Button size="sm" variant="ghost" disabled={!insertAssetId} icon={<ImagePlus className="w-3.5 h-3.5" />} onClick={insertImage}>Einfügen</Button>
            </span>
          )}
        </div>
      </div>

      {/* Bilder & Clips */}
      <PostMediaEditor media={media} onChange={setMedia} albumId={albumId} onAlbumChange={setAlbumId} startMode={prefill?.collage ? "collage" : undefined} />

      {/* Werbung */}
      <div className="rounded-lg border border-white/10 bg-white/[0.02]">
        <button type="button" onClick={() => setMarketingOpen(v => !v)} aria-expanded={marketingOpen}
          className="w-full px-3 py-2 flex items-center justify-between text-left text-[11px] text-gray-400 hover:text-white">
          <span className="inline-flex items-center gap-1.5"><Megaphone className="w-3.5 h-3.5" /> Werbung für ein Event oder Training</span>
          <span>{marketingOpen ? "−" : "+"}</span>
        </button>
        {marketingOpen && (
          <div className="px-3 pb-3 space-y-2">
            {!facts && <p className="text-[11px] text-gray-600">Wähle oben ein Event, dann füllt die Vorlage Datum, Spiel und Anmeldungen automatisch ein.</p>}
            <div className="flex flex-wrap items-center gap-1.5">
              <Select size="sm" value={template} onChange={e => setTemplate(e.target.value as MarketingTemplateId)} aria-label="Werbe-Vorlage">
                {MARKETING_TEMPLATES.filter(t => (t.id === "training") === !!trainingSessionId).map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </Select>
              <Button size="sm" variant="outline" disabled={!facts} onClick={applyTemplate}>Text aus Vorlage</Button>
              <label className="flex items-center gap-1.5 text-xs text-gray-400" title="Hängt „Jetzt anmelden“ mit dem Link zur Event-Seite an">
                <input type="checkbox" checked={includeLink} disabled={!facts} onChange={e => setIncludeLink(e.target.checked)} /> Anmelde-Link
              </label>
              <Button size="sm" variant="ghost" icon={<Copy className="w-3.5 h-3.5" />} disabled={!body.trim()} onClick={copyText}>Text kopieren</Button>
            </div>
          </div>
        )}
      </div>

      {prefill?.link && <p className="text-[11px] text-gray-500">Link zu {prefill.linkLabel ?? "dem Spiel"} wird automatisch angehängt.</p>}

      {/* Korrekturhinweis + Versionsverlauf (nur bei veröffentlichten Berichten) */}
      {isPublishedEdit && (
        <div className="space-y-1.5">
          <input value={editNote} onChange={e => setEditNote(e.target.value)} maxLength={200}
            placeholder="Korrekturhinweis (öffentlich, optional — z.B. „Tippfehler im Ergebnis korrigiert“)" className={INPUT} />
          <button onClick={toggleRevisions} className="text-[11px] text-gray-500 hover:text-teal-300 transition-colors inline-flex items-center gap-1" aria-expanded={showRevisions}>
            <History className="w-3 h-3" /> Frühere Versionen {revisions ? `(${revisions.length})` : ""}
          </button>
          {showRevisions && (
            <div className="rounded-lg bg-white/[0.03] p-2 space-y-1 max-h-40 overflow-y-auto">
              {revisions === null && <p className="text-[11px] text-gray-600">Lädt…</p>}
              {revisions !== null && revisions.length === 0 && <p className="text-[11px] text-gray-600">Noch keine früheren Versionen.</p>}
              {revisions?.map(r => (
                <div key={r.id} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-gray-400 truncate">{formatBerlinDateTime(r.savedAt, { dateStyle: "short", timeStyle: "short" })} · {r.title}{r.note ? ` — ${r.note}` : ""}</span>
                  <Button size="sm" variant="ghost" onClick={() => {
                    if (body.trim() && !window.confirm("Aktuellen Text durch diese Version ersetzen? (Erst mit „Speichern“ wird es übernommen.)")) return;
                    setTitle(r.title); setBody(r.bodyMarkdown);
                  }}>In Editor laden</Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-end gap-2 flex-wrap">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        {(!reportId || isDraftEdit) && (
          <Button variant="outline" loading={busy === "draft"} disabled={!canSubmit || busy !== null} onClick={() => submit("draft")}>Entwurf speichern</Button>
        )}
        {reportId && !isDraftEdit ? (
          <Button loading={busy === "save"} disabled={!canSubmit || busy !== null} onClick={() => submit("save")}>Speichern</Button>
        ) : (
          <Button loading={busy === "publish"} disabled={!canSubmit || busy !== null} onClick={() => submit("publish")}>Veröffentlichen</Button>
        )}
      </div>
    </div>
  );
}
