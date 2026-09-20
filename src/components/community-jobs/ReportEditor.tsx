"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Bold, Italic, Heading2, List, Quote, Link2, ImagePlus, Wand2, Eye, Pencil, X, Smile, AtSign, LayoutTemplate, History, Camera,
} from "lucide-react";
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

/**
 * Editor für Journalisten-Berichte: Titel, Kategorie, Reihe, Event-Bezug ("Aus Event vorbefüllen"), Titelbild und
 * verknüpfter Werbe-Post aus der Mediathek, Markdown-Formatierung mit Vorschau, Emojis, @-Erwähnungen, Bausteine
 * (Ergebnis-Tabelle, Rangliste, Interview, Rückblick), Bildwunsch an die Fotografen, Versionsverlauf mit
 * Korrekturhinweis, Zeichen-/Lesezeit-Anzeige, Entwurf speichern oder veröffentlichen.
 */

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

export interface ReportEditorInitial {
  title: string; bodyMarkdown: string; category: string | null; eventId: string | null;
  coverAssetId: string | null; referencedMarketingPostId: string | null; seriesId?: string | null; isDraft: boolean;
}

interface EventOption { id: string; title: string; startAt: string }
interface AssetOption { id: string; url: string; caption: string | null; type: string }
interface PostOption { id: string; caption: string; event?: { id: string; title: string } | null }
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
  prefill?: { title?: string; body?: string; link?: string; linkLabel?: string };
  onDone: () => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? prefill?.title ?? "");
  const [body, setBody] = useState(initial?.bodyMarkdown ?? prefill?.body ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [eventId, setEventId] = useState(initial?.eventId ?? presetEventId ?? "");
  const [coverAssetId, setCoverAssetId] = useState(initial?.coverAssetId ?? presetCoverAssetId ?? "");
  const [refPostId, setRefPostId] = useState(initial?.referencedMarketingPostId ?? presetPostId ?? "");
  const [seriesId, setSeriesId] = useState(initial?.seriesId ?? "");
  const [editNote, setEditNote] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState<"draft" | "publish" | "save" | null>(null);
  const [filling, setFilling] = useState(false);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [posts, setPosts] = useState<PostOption[]>([]);
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

  useEffect(() => {
    api<EventOption[]>("/api/events").then(all => setEvents([...all].sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime()).slice(0, 80))).catch(() => {});
    api<{ assets: AssetOption[] }>("/api/community-jobs/media").then(d => setAssets(d.assets.filter(a => !isVideoUrl(a.url)))).catch(() => {});
    api<{ feed: (PostOption & { kind: string })[] }>("/api/community-board?limit=50")
      .then(d => setPosts(d.feed.filter(e => e.kind === "marketing_post"))).catch(() => {});
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

  // Vom Event bzw. Rückblick-Empfehlung aus gestartet und noch leer → Vorlage direkt einsetzen (einmalig).
  useEffect(() => {
    if (autoFilled.current || reportId || body.trim()) return;
    if (recap) { autoFilled.current = true; fillRecap(recap, true); }
    else if (presetEventId) { autoFilled.current = true; fillFromEvent(presetEventId, true); }
  }, [presetEventId, recap]); // eslint-disable-line react-hooks/exhaustive-deps -- nur beim Öffnen

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
      await api("/api/community-jobs/photo-requests", { method: "POST", body: JSON.stringify({ eventId: eventId || undefined, description: photoText }) });
      toast.success("Bildwunsch an die Fotografen gesendet");
      setPhotoOpen(false); setPhotoText("");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Bildwunsch fehlgeschlagen"); }
    finally { setPhotoBusy(false); }
  }

  // ── Speichern ─────────────────────────────────────────────────────────────
  async function submit(mode: "draft" | "publish" | "save") {
    setBusy(mode);
    try {
      const payload = {
        title, bodyMarkdown: appendLink(body, prefill?.link),
        category: category || null, eventId: eventId || null, seriesId: seriesId || null,
        coverAssetId: coverAssetId || null, referencedMarketingPostId: refPostId || null,
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
  const visiblePosts = eventId && posts.some(p => p.event?.id === eventId) ? posts.filter(p => p.event?.id === eventId) : posts;
  const cover = assets.find(a => a.id === coverAssetId);
  const canSubmit = title.trim().length > 0 && body.trim().length > 0 && body.length <= REPORT_BODY_MAX;
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
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={REPORT_TITLE_MAX} placeholder="Titel" className={INPUT} />

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
          <p className="text-[11px] text-gray-500">Titelbild aus der Mediathek (optional)</p>
          <button onClick={() => setPhotoOpen(v => !v)} className="text-[11px] text-gray-500 hover:text-teal-300 transition-colors inline-flex items-center gap-1">
            <Camera className="w-3 h-3" /> Bild beim Fotografen anfragen
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
        {assets.length === 0 ? (
          <p className="text-[11px] text-gray-600">Noch keine Bilder in der Mediathek.</p>
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
            placeholder="Dein Bericht… Formatierung über die Leiste oder direkt als Markdown (**fett**, ## Überschrift, - Liste)."
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

      {/* Werbe-Post */}
      {(visiblePosts.length > 0 || refPostId) && (
        <label className="space-y-1 text-[11px] text-gray-500 block">
          Über diesen Werbe-Post berichten (optional)
          <div className="flex items-center gap-1.5">
            <Select value={refPostId} className="flex-1" onChange={e => setRefPostId(e.target.value)}>
              <option value="">Keiner</option>
              {refPostId && !visiblePosts.some(p => p.id === refPostId) && <option value={refPostId}>Gewählter Werbe-Post</option>}
              {visiblePosts.map(p => <option key={p.id} value={p.id}>{p.event?.title ? `${p.event.title}: ` : ""}{p.caption.slice(0, 60)}</option>)}
            </Select>
            {refPostId && <button onClick={() => setRefPostId("")} aria-label="Verknüpfung entfernen" className="text-gray-600 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>}
          </div>
        </label>
      )}

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
