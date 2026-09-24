"use client";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { TrendingUp } from "@/components/icons";
import { ChevronDown } from "@/components/icons";
import { Camera, Copy, Images, Loader2, Search, Trash2, Upload, X } from "@/components/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatBerlinDate } from "@/lib/time";
import { isVideoUrl } from "@/lib/upload-limits";
import { loadImage, LOGO_URL, prepareUploadImage, renderCollageCanvas } from "@/lib/studio-templates";

/** Fotografen-Büro: Bildwünsche, Auswertung, Alben, Sammel-Upload, Monats-Collage und Mediathek-Suche. */

const LABEL = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest";
const FIELD = "bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";
const BULK_MAX = 20;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

function Section({ title, count, defaultOpen = false, children }: { title: string; count?: number; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="space-y-1.5">
      <button onClick={() => setOpen(v => !v)} aria-expanded={open} className="w-full flex items-center justify-between gap-2 text-left">
        <span className={LABEL}>{title}{count !== undefined && count > 0 ? ` (${count})` : ""}</span>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && children}
    </div>
  );
}

// ── Bildwünsche ──────────────────────────────────────────────────────────────

interface OpenRequest {
  id: string; description: string; createdAt: string; eventId: string | null; eventTitle: string | null;
  requester: { id: string; username: string | null; name: string | null };
}

export function PhotoRequestList({ onFulfill }: { onFulfill: (request: { id: string; eventId: string | null; description: string }) => void }) {
  const [items, setItems] = useState<OpenRequest[] | null>(null);

  useEffect(() => {
    fetch("/api/community-jobs/photo-requests?scope=open").then(r => (r.ok ? r.json() : { requests: [] }))
      .then((d: { requests: OpenRequest[] }) => setItems(d.requests)).catch(() => setItems([]));
  }, []);

  if (!items) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
        <Camera className="w-3 h-3" /> Bildwünsche von Journalisten{items.length > 0 ? ` (${items.length})` : ""}
      </p>
      {items.length === 0 && <p className="text-[11px] text-gray-600">Aktuell keine offenen Wünsche.</p>}
      {items.map(r => (
        <div key={r.id} className="rounded-lg bg-amber-500/[0.05] border border-amber-500/20 p-2.5 flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <p className="text-xs text-gray-200">{r.description}</p>
            <p className="text-[10px] text-gray-600">
              von {r.requester.username ?? r.requester.name}{r.eventTitle ? ` · ${r.eventTitle}` : ""} · {formatBerlinDate(r.createdAt)}
            </p>
          </div>
          <Button size="sm" variant="outline" className="shrink-0" onClick={() => onFulfill({ id: r.id, eventId: r.eventId, description: r.description })}>Bild hochladen</Button>
        </div>
      ))}
    </div>
  );
}

// ── Auswertung ───────────────────────────────────────────────────────────────

interface Stats {
  total: number; totalVotes: number; averageVotes: number; votesThisWeek: number; usesTotal: number; usedAssets: number;
  top: { id: string; caption: string; url: string; votes: number } | null;
  mostUsed: { id: string; caption: string; url: string; uses: number } | null;
  weekly: { weekStart: string; votes: number }[];
  types: { type: string; count: number }[];
}

const TYPE_LABEL: Record<string, string> = { CLIP: "Clips", COLLAGE: "Collagen", SCREENSHOT: "Screenshots", BANNER: "Banner", GRAPHIC: "Grafiken" };

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-white/[0.03] px-2.5 py-2">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="text-[10px] text-gray-600 truncate">{sub}</p>}
    </div>
  );
}

function Thumb({ url, className = "w-10 h-10" }: { url: string; className?: string }) {
  return isVideoUrl(url)
    ? <video src={url} muted preload="metadata" className={`${className} rounded object-cover shrink-0 bg-black/40`} />
    // eslint-disable-next-line @next/next/no-img-element -- Mediathek-Vorschau, beliebiger Blob-Host
    : <img src={url} alt="" className={`${className} rounded object-cover shrink-0 bg-black/40`} />;
}

export function FotografStatsBlock({ refreshKey }: { refreshKey?: number }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/community-jobs/media/stats").then(r => (r.ok ? r.json() : null)).then(setStats).catch(() => {});
  }, [refreshKey]);

  if (!stats) return null;
  const maxWeek = Math.max(1, ...stats.weekly.map(w => w.votes));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-gray-300 flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
          {stats.total} {stats.total === 1 ? "Bild/Clip" : "Bilder/Clips"} · {stats.totalVotes} 👍 · diese Woche {stats.votesThisWeek}
        </p>
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors flex items-center gap-1">
          Auswertung <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {open && (
        <div className="space-y-3 rounded-lg bg-white/[0.02] p-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <Tile label="Hochgeladen" value={String(stats.total)} />
            <Tile label="Ø Daumen/Bild" value={stats.averageVotes.toFixed(1)} />
            <Tile label="Nutzungen" value={String(stats.usesTotal)} sub="als Titelbild / im Post" />
            <Tile label="Genutzte Bilder" value={String(stats.usedAssets)} sub={stats.total > 0 ? `${Math.round((stats.usedAssets / stats.total) * 100)} %` : undefined} />
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {stats.top && (
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2 min-w-0">
                <Thumb url={stats.top.url} />
                <p className="text-[11px] text-gray-400 min-w-0"><span className="block text-gray-500">Beliebtestes ({stats.top.votes} 👍)</span><span className="block truncate text-gray-200">{stats.top.caption}</span></p>
              </div>
            )}
            {stats.mostUsed && (
              <div className="flex items-center gap-2 rounded-lg bg-white/[0.03] p-2 min-w-0">
                <Thumb url={stats.mostUsed.url} />
                <p className="text-[11px] text-gray-400 min-w-0"><span className="block text-gray-500">Am häufigsten genutzt ({stats.mostUsed.uses}×)</span><span className="block truncate text-gray-200">{stats.mostUsed.caption}</span></p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <p className={LABEL}>Daumen pro Woche</p>
            {stats.weekly.length === 0 ? (
              <p className="text-[11px] text-gray-600">Noch keine Bewertungen in den letzten 8 Wochen.</p>
            ) : (
              <div className="flex items-end gap-1.5 h-16">
                {stats.weekly.map(w => (
                  <div key={w.weekStart} className="flex-1 flex flex-col items-center justify-end gap-0.5 min-w-0" title={`${formatBerlinDate(w.weekStart)}: ${w.votes}`}>
                    <span className="text-[9px] text-gray-500">{w.votes}</span>
                    <div className="w-full rounded-t bg-teal-400/70" style={{ height: `${Math.max(4, (w.votes / maxWeek) * 36)}px` }} />
                    <span className="text-[9px] text-gray-600 truncate">{formatBerlinDate(w.weekStart, { day: "2-digit", month: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {stats.types.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {stats.types.map(t => (
                <span key={t.type} className="text-[10px] text-gray-400 bg-white/[0.05] rounded-full px-2 py-0.5">{TYPE_LABEL[t.type] ?? t.type}: {t.count}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Alben ────────────────────────────────────────────────────────────────────

export interface AlbumOption { id: string; title: string; _count?: { assets: number } }

export function useAlbums(refreshKey = 0) {
  const [albums, setAlbums] = useState<AlbumOption[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    api<{ albums: AlbumOption[] }>("/api/community-jobs/media/albums").then(d => setAlbums(d.albums)).catch(() => {});
  }, [refreshKey, tick]);
  return { albums, reload: () => setTick(t => t + 1) };
}

export function AlbumSelect({ albums, value, onChange }: { albums: AlbumOption[]; value: string; onChange: (id: string) => void }) {
  if (albums.length === 0) return null;
  return (
    <Select size="sm" value={value} onChange={e => onChange(e.target.value)} aria-label="Album">
      <option value="">Kein Album</option>
      {albums.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
    </Select>
  );
}

interface EventOption { id: string; title: string; startAt: string }

export function useRecentEvents() {
  const [events, setEvents] = useState<EventOption[]>([]);
  useEffect(() => {
    api<EventOption[]>("/api/events").then(all => {
      const limit = Date.now() + 86_400_000;
      setEvents(all.filter(e => new Date(e.startAt).getTime() <= limit).sort((a, b) => +new Date(b.startAt) - +new Date(a.startAt)).slice(0, 40));
    }).catch(() => {});
  }, []);
  return events;
}

export function AlbumsBlock({ onChanged }: { onChanged?: () => void }) {
  const { albums, reload } = useAlbums();
  const events = useRecentEvents();
  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await api("/api/community-jobs/media/albums", { method: "POST", body: JSON.stringify({ title, eventId: eventId || undefined }) });
      setTitle(""); setEventId(""); reload(); onChanged?.();
      toast.success("Album angelegt");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    if (!confirm("Album löschen? Die Bilder bleiben erhalten.")) return;
    try { await api(`/api/community-jobs/media/albums/${id}`, { method: "DELETE" }); reload(); onChanged?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  async function copyLink(id: string) {
    try { await navigator.clipboard.writeText(`${window.location.origin}/community-board/album/${id}`); toast.success("Link kopiert"); }
    catch { toast.error("Kopieren nicht möglich"); }
  }

  return (
    <Section title="Meine Alben" count={albums.length}>
      {albums.length === 0 && <p className="text-[11px] text-gray-600">Noch keine Alben. Ein Album fasst Bilder einer Serie zusammen und lässt sich als Ganzes verlinken.</p>}
      {albums.map(a => (
        <div key={a.id} className="flex items-center justify-between gap-2 text-xs">
          <a href={`/community-board/album/${a.id}`} className="min-w-0 truncate text-gray-200 hover:text-teal-400 transition-colors">
            <Images className="inline w-3 h-3 mr-1.5 text-teal-400" />{a.title} <span className="text-gray-600">({a._count?.assets ?? 0})</span>
          </a>
          <span className="flex items-center gap-1 shrink-0">
            <button onClick={() => copyLink(a.id)} title="Link kopieren" aria-label="Link kopieren" className="p-1 text-gray-500 hover:text-teal-400 transition-colors"><Copy className="w-3.5 h-3.5" /></button>
            <button onClick={() => remove(a.id)} title="Album löschen" aria-label="Album löschen" className="p-1 text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </span>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Neues Album, z.B. Grand Final 2026" className={`${FIELD} flex-1 min-w-[10rem]`} />
        <Select size="sm" value={eventId} onChange={e => setEventId(e.target.value)} aria-label="Event zum Album">
          <option value="">Ohne Event</option>
          {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
        </Select>
        <Button size="sm" variant="outline" loading={busy} disabled={!title.trim()} onClick={create}>Anlegen</Button>
      </div>
    </Section>
  );
}

// ── Mediathek-Suche ──────────────────────────────────────────────────────────

interface MediaItem {
  id: string; url: string; type: string; caption: string | null; createdAt: string;
  _count: { votes: number };
  author: { id: string; username: string | null; name: string | null };
  event: { id: string; title: string } | null;
  album: { id: string; title: string } | null;
}

const TYPE_OPTIONS = [
  { value: "", label: "Alle Typen" }, { value: "SCREENSHOT", label: "Screenshots" }, { value: "CLIP", label: "Clips" },
  { value: "COLLAGE", label: "Collagen" }, { value: "BANNER", label: "Banner" }, { value: "GRAPHIC", label: "Grafiken" },
];

/** Durchsuchbare Mediathek (Bildunterschrift, Event, Fotograf) — für alle Jobs, die Bilder brauchen. */
export function MediaLibraryBlock() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [sort, setSort] = useState("new");
  const [items, setItems] = useState<MediaItem[] | null>(null);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ sort, take: "60" });
      if (q.trim()) params.set("q", q.trim());
      if (type) params.set("type", type);
      api<{ assets: MediaItem[] }>(`/api/community-jobs/media?${params}`).then(d => setItems(d.assets)).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(handle);
  }, [q, type, sort]);

  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); toast.success("Bild-Link kopiert"); }
    catch { toast.error("Kopieren nicht möglich"); }
  }

  return (
    <Section title="Mediathek durchsuchen">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="relative flex-1 min-w-[10rem]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Suchen: Unterschrift, Event, Fotograf" className={`${FIELD} w-full pl-7`} />
        </span>
        <Select size="sm" value={type} onChange={e => setType(e.target.value)} aria-label="Typ">
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </Select>
        <Select size="sm" value={sort} onChange={e => setSort(e.target.value)} aria-label="Sortierung">
          <option value="new">Neueste</option>
          <option value="votes">Beliebteste</option>
        </Select>
      </div>
      {items === null && <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />}
      {items?.length === 0 && <p className="text-[11px] text-gray-600">Nichts gefunden.</p>}
      {items && items.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
          {items.map(a => (
            <div key={a.id} className="group relative rounded-lg overflow-hidden bg-black/30 aspect-square">
              <a href={a.url} target="_blank" rel="noreferrer" className="block w-full h-full">
                <Thumb url={a.url} className="w-full h-full" />
              </a>
              <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1.5 py-1 text-[9px] text-gray-200 leading-tight">
                <p className="truncate">{a.caption ?? a.event?.title ?? a.type}</p>
                <p className="truncate text-gray-400">{a.author.username ?? a.author.name} · {a._count.votes} 👍</p>
              </div>
              <button onClick={() => copy(a.url)} title="Link kopieren" aria-label="Bild-Link kopieren"
                className="absolute top-1 right-1 p-1 rounded bg-black/60 text-gray-300 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/** Alles Zusätzliche fürs Fotografen-Büro (unter Auswertung). */
export function FotografExtras() {
  return (
    <div className="space-y-3">
      <AlbumsBlock />
      <MediaLibraryBlock />
    </div>
  );
}

// ── Sammel-Upload ────────────────────────────────────────────────────────────

interface BulkFile { id: string; file: File; caption: string }

async function uploadBlob(blob: Blob, name: string): Promise<string> {
  const body = new FormData();
  body.append("file", blob, name);
  body.append("kind", "community-job-asset");
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");
  return data.url;
}

/** Mehrere Bilder eines Events auf einmal: verkleinert, optional mit Wasserzeichen, dann ein gemeinsamer Datensatz-Aufruf. */
export function BulkUploadForm({ eventId: initialEventId, onDone }: { eventId?: string; onDone: () => void }) {
  const { data: session } = useSession();
  const events = useRecentEvents();
  const { albums } = useAlbums();
  const [files, setFiles] = useState<BulkFile[]>([]);
  const [eventId, setEventId] = useState(initialEventId ?? "");
  const [albumId, setAlbumId] = useState("");
  const [watermark, setWatermark] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const authorName = session?.user?.name ?? "OMA";

  function addFiles(list: FileList | null) {
    if (!list) return;
    const images = [...list].filter(f => f.type.startsWith("image/"));
    if (images.length < list.length) toast.error("Nur Bilder werden akzeptiert (Clips einzeln hochladen)");
    setFiles(cur => [...cur, ...images.map(file => ({ id: crypto.randomUUID(), file, caption: "" }))].slice(0, BULK_MAX));
  }

  async function submit() {
    setProgress({ done: 0, total: files.length });
    const items: { url: string; caption: string }[] = [];
    let failed = 0;
    for (const f of files) {
      try {
        const blob = await prepareUploadImage(f.file, { watermark: watermark ? `© ${authorName} · OMA` : undefined });
        items.push({ url: await uploadBlob(blob, `${f.id}.jpg`), caption: f.caption });
      } catch { failed += 1; }
      setProgress(p => (p ? { ...p, done: p.done + 1 } : p));
    }
    try {
      if (items.length === 0) throw new Error("Kein Bild konnte hochgeladen werden");
      await api("/api/community-jobs/media/bulk", { method: "POST", body: JSON.stringify({ eventId: eventId || undefined, albumId: albumId || undefined, items }) });
      toast.success(`${items.length} ${items.length === 1 ? "Bild" : "Bilder"} hochgeladen${failed ? ` (${failed} fehlgeschlagen)` : ""}`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <div className="space-y-3">
      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/10 rounded-xl py-8 cursor-pointer hover:border-teal-500/30 transition-colors">
        <Upload className="w-5 h-5 text-gray-500" />
        <span className="text-xs text-gray-500">Bilder auswählen (bis zu {BULK_MAX})</span>
        <span className="text-[10px] text-gray-700">Werden automatisch auf max. 1920 px verkleinert</span>
        <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" disabled={busy}
          onChange={e => { addFiles(e.target.files); e.target.value = ""; }} />
      </label>

      {files.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <Select size="sm" value={eventId} onChange={e => setEventId(e.target.value)} aria-label="Event">
              <option value="">Ohne Event</option>
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </Select>
            <AlbumSelect albums={albums} value={albumId} onChange={setAlbumId} />
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              <input type="checkbox" checked={watermark} onChange={e => setWatermark(e.target.checked)} />
              Wasserzeichen
            </label>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {files.map(f => (
              <BulkRow key={f.id} file={f.file} caption={f.caption} disabled={busy}
                onCaption={caption => setFiles(cur => cur.map(x => (x.id === f.id ? { ...x, caption } : x)))}
                onRemove={() => setFiles(cur => cur.filter(x => x.id !== f.id))} />
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] text-gray-500">{progress ? `Lade hoch… ${progress.done}/${progress.total}` : `${files.length} ${files.length === 1 ? "Bild" : "Bilder"}`}</p>
            <Button loading={busy} onClick={submit}>Alle hochladen</Button>
          </div>
        </>
      )}
    </div>
  );
}

function BulkRow({ file, caption, disabled, onCaption, onRemove }: { file: File; caption: string; disabled: boolean; onCaption: (c: string) => void; onRemove: () => void }) {
  const preview = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => () => URL.revokeObjectURL(preview), [preview]);
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale Vorschau (blob:) */}
      <img src={preview} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
      <input value={caption} onChange={e => onCaption(e.target.value)} disabled={disabled} maxLength={300} placeholder="Bildunterschrift (optional)" className={`${FIELD} flex-1 min-w-0`} />
      <button onClick={onRemove} disabled={disabled} title="Entfernen" aria-label="Entfernen" className="p-1 text-gray-500 hover:text-red-400 transition-colors"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

// ── Monats-Collage ───────────────────────────────────────────────────────────

const CAPTION_PREFIX = "Bilder des Monats";

function monthLabel(): string {
  // In den ersten Tagen eines Monats geht es um den Vormonat.
  const now = new Date();
  const ref = now.getDate() <= 3 ? new Date(now.getTime() - 4 * 86_400_000) : now;
  return ref.toLocaleDateString("de-DE", { month: "long", year: "numeric" });
}

/** Collage aus den beliebtesten Bildern der letzten Wochen — clientseitig auf Canvas gerendert. */
export function MonthCollageBuilder({ onExported }: { onExported: (url: string, caption: string) => void }) {
  const [count, setCount] = useState(6);
  const [sources, setSources] = useState<MediaItem[] | null>(null);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const [exporting, setExporting] = useState(false);
  const label = useMemo(monthLabel, []);

  useEffect(() => { loadImage(LOGO_URL).then(setLogo).catch(() => {}); }, []);
  useEffect(() => {
    api<{ assets: MediaItem[] }>("/api/community-jobs/media?sort=votes&sinceDays=31&take=40")
      .then(d => setSources(d.assets.filter(a => !isVideoUrl(a.url) && a.type !== "COLLAGE"))).catch(() => setSources([]));
  }, []);

  const picked = useMemo(() => (sources ?? []).slice(0, count), [sources, count]);
  useEffect(() => {
    let cancelled = false;
    Promise.allSettled(picked.map(p => loadImage(p.url))).then(r => {
      if (!cancelled) setImages(r.flatMap(x => (x.status === "fulfilled" ? [x.value] : [])));
    });
    return () => { cancelled = true; };
  }, [picked]);

  const authors = useMemo(() => [...new Set(picked.map(p => p.author.username ?? p.author.name).filter(Boolean))].slice(0, 4).join(", "), [picked]);
  const title = `${CAPTION_PREFIX} · ${label}`;

  useEffect(() => {
    if (!canvasEl || images.length === 0) return;
    renderCollageCanvas(canvasEl, images, title, authors ? `Fotos von ${authors}` : "Community-Mediathek", logo);
  }, [canvasEl, images, title, authors, logo]);

  async function exportCollage() {
    if (!canvasEl) return;
    setExporting(true);
    try {
      const blob = await new Promise<Blob | null>(resolve => canvasEl.toBlob(resolve, "image/jpeg", 0.9));
      if (!blob) throw new Error("Export fehlgeschlagen");
      onExported(await uploadBlob(blob, "collage.jpg"), `${CAPTION_PREFIX} ${label}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setExporting(false);
    }
  }

  if (sources === null) return <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />;
  if (sources.length < 2) return <p className="text-xs text-gray-500">In den letzten Wochen gibt es noch nicht genug Bilder für eine Collage (mindestens 2).</p>;

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500">Die beliebtesten Bilder der letzten 30 Tage, automatisch zu einer Collage zusammengestellt.</p>
      <div className="rounded-xl overflow-hidden border border-white/10">
        <canvas ref={setCanvasEl} width={1280} height={720} className="w-full h-auto block" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Select size="sm" value={String(count)} onChange={e => setCount(Number(e.target.value))} aria-label="Anzahl Bilder">
          {[2, 4, 6, 9].filter(n => n <= sources.length || n === 2).map(n => <option key={n} value={n}>{n} Bilder</option>)}
        </Select>
        <Button loading={exporting} disabled={images.length < 2} onClick={exportCollage}>Übernehmen</Button>
      </div>
    </div>
  );
}
