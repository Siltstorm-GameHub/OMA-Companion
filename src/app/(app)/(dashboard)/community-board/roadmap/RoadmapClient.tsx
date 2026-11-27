"use client";
// ============================================
// Roadmap als Board: In Prüfung · Wird umgesetzt · Umgesetzt, Filter nach Kategorie, "Neu umgesetzt" als
// Änderungsliste, Abgelehnte eingeklappt mit Begründung. Jeder Punkt hat aufklappbare Infos mit Screenshots.
// Das Team (Mods/Admins) legt eigene Punkte an, setzt sie auf umgesetzt und postet Infos.
// ============================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatFixed } from "@/lib/format-number";
import { formatBerlinDate } from "@/lib/time";
import { IDEA_CATEGORIES, ideaCategoryLabel } from "@/lib/idea-lifecycle";
import type { RoadmapColumn, RoadmapEntry } from "@/lib/roadmap-service";
import { buttonClasses } from "@/components/ui/button-styles";
import MarkdownLite from "@/components/community-jobs/MarkdownLite";
import { Bell, ChevronDown, ImagePlus, Loader2, Plus, Star, Trash2, Trophy, Upload, X } from "@/components/icons";
import { markRoadmapVisit, readRoadmapVisit } from "@/components/community/RoadmapNewDot";

interface TopIdea { id: string; title: string; author: string; votes: number; average: number }
interface Update { id: string; bodyMarkdown: string; imageUrls: string[]; createdAt: string; author: { id: string; name: string; image: string | null } }

const COLUMNS: { key: Exclude<RoadmapColumn, "REJECTED">; label: string; short: string; hint: string; tone: string }[] = [
  { key: "REVIEW", label: "In Prüfung", short: "Prüfung", hint: "Das Team schaut sich das an", tone: "bg-primary" },
  { key: "PLANNED", label: "Wird umgesetzt", short: "In Arbeit", hint: "Daran wird gearbeitet", tone: "bg-warning" },
  { key: "DONE", label: "Umgesetzt", short: "Umgesetzt", hint: "Schon da", tone: "bg-success" },
];
const FIELD = "w-full rounded-control border border-line bg-surface-2 px-3 py-2 text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none";
const MAX_IMAGES = 6;
const RECENT_DAYS = 30;

async function api<T = unknown>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  body.append("kind", "community-job-asset");
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");
  return data.url;
}

export default function RoadmapClient({ entries, topWeek, topMonth, isTeam }: {
  entries: RoadmapEntry[]; topWeek: TopIdea[]; topMonth: TopIdea[]; isTeam: boolean;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const [now] = useState(() => Date.now());
  // Am Handy eine Spalte nach der anderen (Reiter), ab lg alle drei nebeneinander
  const [mobileCol, setMobileCol] = useState<Exclude<RoadmapColumn, "REJECTED">>("PLANNED");
  // "Neu seit deinem letzten Besuch": alten Besuch merken, dann den jetzigen speichern
  const [lastVisit, setLastVisit] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage gibt es erst im Browser
    setLastVisit(readRoadmapVisit());
    markRoadmapVisit();
  }, []);
  const isNew = (e: RoadmapEntry) => lastVisit !== null && lastVisit > 0 &&
    [e.at, e.lastUpdateAt].some(t => t && new Date(t).getTime() > lastVisit);
  const visible = category ? entries.filter(e => e.category === category) : entries;
  const usedCategories = IDEA_CATEGORIES.filter(c => entries.some(e => e.category === c.id));
  const recent = entries
    .filter(e => e.column === "DONE" && e.at && now - new Date(e.at).getTime() < RECENT_DAYS * 86_400_000)
    .slice(0, 5);
  const rejected = visible.filter(e => e.column === "REJECTED");

  return (
    <div className="space-y-6">
      {isTeam && <NewItemForm />}

      {recent.length > 0 && (
        <section aria-labelledby="recent-title" className="rounded-card border border-success/30 bg-success-soft p-4">
          <h2 id="recent-title" className="text-xs font-semibold uppercase tracking-widest text-success">Neu umgesetzt</h2>
          <ul className="mt-2 space-y-1.5">
            {recent.map(e => (
              <li key={`${e.type}-${e.id}`} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                {isNew(e) && <span className="rounded-full bg-primary px-1.5 text-xs font-bold text-primary-ink">Neu</span>}
                <span className="tabular-nums text-xs text-subtle">{e.at ? formatBerlinDate(e.at, { day: "2-digit", month: "2-digit" }) : ""}</span>
                <a href={`#${e.type}-${e.id}`} className="font-semibold text-fg hover:text-primary-fg">{e.title}</a>
                {e.author && <span className="text-xs text-muted">Idee von {e.author}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {usedCategories.length > 1 && (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Nach Kategorie filtern">
          {[{ id: null, label: "Alle" } as { id: string | null; label: string }, ...usedCategories].map(c => (
            <button key={c.id ?? "all"} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${
                category === c.id ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:text-fg"
              }`}>{c.label}</button>
          ))}
        </div>
      )}

      {/* Handy: Reiter statt drei langer Spalten untereinander */}
      <div role="tablist" aria-label="Spalte" className="grid grid-cols-3 gap-1 rounded-control border border-line bg-surface-2 p-1 lg:hidden">
        {COLUMNS.map(col => {
          const n = visible.filter(e => e.column === col.key).length;
          return (
            <button key={col.key} type="button" role="tab" aria-selected={mobileCol === col.key} onClick={() => setMobileCol(col.key)}
              className={`flex min-h-10 items-center justify-center gap-1.5 rounded-control text-sm font-semibold transition-colors ${
                mobileCol === col.key ? "bg-surface-3 text-fg shadow-card" : "text-muted"
              }`}>
              <span className={`size-2 rounded-full ${col.tone}`} /> {col.short} <span className="text-xs text-subtle tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {COLUMNS.map(col => {
          const items = visible.filter(e => e.column === col.key);
          return (
            <section key={col.key} aria-label={col.label} className={`space-y-2.5 ${mobileCol === col.key ? "" : "max-lg:hidden"}`}>
              <header className="flex items-center gap-2 px-1 max-lg:hidden">
                <span className={`size-2 rounded-full ${col.tone}`} />
                <h2 className="text-sm font-bold text-fg">{col.label}</h2>
                <span className="text-xs text-subtle tabular-nums">{items.length}</span>
                <span className="ml-auto text-xs text-subtle">{col.hint}</span>
              </header>
              {items.length === 0
                ? <p className="rounded-card border border-dashed border-line p-4 text-center text-xs text-subtle">Noch nichts</p>
                : items.map(e => <EntryCard key={`${e.type}-${e.id}`} entry={e} isTeam={isTeam} isNew={isNew(e)} />)}
            </section>
          );
        })}
      </div>

      {rejected.length > 0 && (
        <details className="group rounded-card border border-line bg-surface p-4">
          <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted">
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" /> Abgelehnt ({rejected.length}) — mit Begründung
          </summary>
          <ul className="mt-3 space-y-2">
            {rejected.map(e => (
              <li key={e.id} className="text-sm">
                {e.href ? <Link href={e.href} className="font-semibold text-fg hover:text-primary-fg">{e.title}</Link> : <span className="font-semibold text-fg">{e.title}</span>}
                {e.note && <span className="block text-xs text-muted">Team: {e.note}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {[{ title: "Top-Ideen dieser Woche", items: topWeek }, { title: "Top-Ideen dieses Monats", items: topMonth }].map(block => (
          <section key={block.title} className="rounded-card border border-line bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-subtle"><Trophy className="size-3.5 text-coin" /> {block.title}</h2>
            {block.items.length === 0 ? <p className="mt-2 text-xs text-subtle">Noch keine Bewertungen.</p> : (
              <ol className="mt-2 space-y-1.5">
                {block.items.map((t, i) => (
                  <li key={t.id}>
                    <Link href={`/community-board/idea/${t.id}`} className="block truncate text-sm text-fg hover:text-primary-fg">
                      <span className="mr-2 tabular-nums text-subtle">{i + 1}.</span>{t.title}
                    </Link>
                    <span className="block pl-5 text-xs text-subtle">Ø {formatFixed(t.average, 1)} ★ · {t.votes} Stimmen · {t.author}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

// ── Ein Punkt der Roadmap ──────────────────────────────────────────────────────

function EntryCard({ entry: e, isTeam, isNew }: { entry: RoadmapEntry; isTeam: boolean; isNew: boolean }) {
  const anchor = `${e.type}-${e.id}`;
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const category = ideaCategoryLabel(e.category);

  // Link aus einer Benachrichtigung (#idea-…): Punkt aufklappen
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Hash gibt es erst im Browser
    if (window.location.hash === `#${anchor}`) setOpen(true);
  }, [anchor]);

  async function setItemStatus(status: "PLANNED" | "DONE") {
    setBusy(true);
    try { await api(`/api/roadmap/items/${e.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  async function removeItem() {
    if (!window.confirm(`„${e.title}“ samt Infos von der Roadmap löschen?`)) return;
    try { await api(`/api/roadmap/items/${e.id}`, { method: "DELETE" }); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  return (
    <article id={anchor} className="scroll-mt-24 rounded-card border border-line bg-surface p-3.5 shadow-card">
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        {category && <span className="rounded-full bg-surface-3 px-2 py-0.5 text-muted">{category}</span>}
        {e.type === "item" && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary-fg">Team</span>}
        {isNew && <span className="rounded-full bg-primary px-2 py-0.5 font-bold text-primary-ink">Neu</span>}
        {e.at && <span className="ml-auto tabular-nums text-subtle">{formatBerlinDate(e.at, { day: "2-digit", month: "2-digit", year: "2-digit" })}</span>}
      </div>
      <h3 className="mt-1.5 text-sm font-bold leading-snug text-fg">
        {e.href ? <Link href={e.href} className="hover:text-primary-fg">{e.title}</Link> : e.title}
      </h3>
      {e.description && <p className="mt-1 line-clamp-3 text-sm text-muted">{e.description}</p>}
      {e.note && <p className="mt-1.5 rounded-control bg-surface-2 px-2.5 py-1.5 text-xs text-fg/90">Team: {e.note}</p>}
      {e.type === "item" && (e.linkedIdeas?.length ?? 0) > 0 && (
        <div className="mt-2 space-y-1 rounded-control bg-surface-2 p-2">
          <p className="text-xs font-semibold text-subtle">Aus Ideen der Community</p>
          {e.linkedIdeas!.map(i => (
            <div key={i.id} className="flex items-center gap-2 text-xs">
              <Link href={`/community-board/idea/${i.id}`} className="min-w-0 flex-1 truncate text-fg hover:text-primary-fg">{i.title}</Link>
              <span className="shrink-0 text-subtle">{i.author ? `von ${i.author}` : ""}</span>
              {isTeam && <UnlinkButton itemId={e.id} ideaId={i.id} />}
            </div>
          ))}
        </div>
      )}
      {isTeam && e.type === "item" && <LinkIdeas itemId={e.id} />}
      <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-subtle">
        {e.author && <span>Idee von {e.author}</span>}
        {e.supporters > 0 && <span>{e.supporters} Unterstützer</span>}
        {e.stars && <span className="inline-flex items-center gap-0.5">Ø {formatFixed(e.stars.average, 1)}<Star className="size-3 text-coin" /></span>}
      </p>

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="inline-flex min-h-9 items-center gap-1 rounded-control px-2 text-xs font-semibold text-primary-fg hover:bg-surface-2">
          <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
          {e.updates > 0 ? `Infos (${e.updates})` : isTeam ? "Infos hinzufügen" : "Keine Infos"}
        </button>
        {e.type === "item" && <FollowButton itemId={e.id} following={!!e.following} />}
        {isTeam && e.type === "item" && (
          <>
            {e.column === "PLANNED"
              ? <button type="button" disabled={busy} onClick={() => setItemStatus("DONE")} className={buttonClasses("ghost", "sm")}>Als umgesetzt markieren</button>
              : <button type="button" disabled={busy} onClick={() => setItemStatus("PLANNED")} className={buttonClasses("ghost", "sm")}>Zurück auf „in Arbeit“</button>}
            <button type="button" onClick={removeItem} aria-label="Punkt löschen" className="ml-auto grid size-9 place-items-center rounded-control text-subtle hover:text-danger"><Trash2 className="size-4" /></button>
          </>
        )}
        {isTeam && e.type === "idea" && e.href && <Link href={e.href} className={buttonClasses("ghost", "sm", "ml-auto")}>Status ändern</Link>}
      </div>

      {open && <Updates type={e.type} id={e.id} isTeam={isTeam} />}
    </article>
  );
}

// ── Infos mit Screenshots ──────────────────────────────────────────────────────

function Updates({ type, id, isTeam }: { type: "idea" | "item"; id: string; isTeam: boolean }) {
  const [items, setItems] = useState<Update[] | null>(null);
  const [viewer, setViewer] = useState<string | null>(null);
  const router = useRouter();

  const load = () => api<{ updates: Update[] }>(`/api/roadmap/updates?type=${type}&id=${id}`).then(d => setItems(d.updates)).catch(() => setItems([]));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- einmal beim Aufklappen laden
  useEffect(() => { load(); }, []);

  async function remove(updateId: string) {
    if (!window.confirm("Diese Info löschen?")) return;
    try { await api(`/api/roadmap/updates/${updateId}`, { method: "DELETE" }); await load(); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  return (
    <div className="mt-2 space-y-3 border-t border-line pt-3">
      {isTeam && <UpdateForm type={type} id={id} onDone={() => { load(); router.refresh(); }} />}
      {items === null ? (
        <div className="flex justify-center py-2"><Loader2 className="size-4 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        !isTeam && <p className="text-xs text-subtle">Noch keine Infos.</p>
      ) : (
        <ol className="space-y-3">
          {items.map(u => (
            <li key={u.id} className="space-y-1.5">
              <p className="flex items-center gap-2 text-xs text-subtle">
                <span className="font-semibold text-fg">{u.author.name}</span>
                <span>{formatBerlinDate(u.createdAt, { day: "2-digit", month: "2-digit", year: "numeric" })}</span>
                {isTeam && (
                  <button type="button" onClick={() => remove(u.id)} aria-label="Info löschen" className="ml-auto text-subtle hover:text-danger"><Trash2 className="size-3.5" /></button>
                )}
              </p>
              {u.bodyMarkdown && <MarkdownLite text={u.bodyMarkdown} className="text-sm text-fg/90" />}
              {u.imageUrls.length > 0 && (
                <div className="grid grid-cols-2 gap-1.5">
                  {u.imageUrls.map(url => (
                    <button key={url} type="button" onClick={() => setViewer(url)} className="block overflow-hidden rounded-control border border-line" aria-label="Screenshot vergrößern">
                      {/* eslint-disable-next-line @next/next/no-img-element -- Blob-Upload */}
                      <img src={url} alt="" loading="lazy" className="aspect-video w-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
      {viewer && (
        <div role="dialog" aria-modal="true" aria-label="Screenshot" onClick={() => setViewer(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-canvas/95 p-4">
          <button type="button" onClick={() => setViewer(null)} aria-label="Schließen" className="absolute right-3 top-3 grid size-11 place-items-center rounded-control text-muted hover:text-fg"><X className="size-5" /></button>
          {/* eslint-disable-next-line @next/next/no-img-element -- Blob-Upload */}
          <img src={viewer} alt="" className="max-h-full max-w-full rounded-control object-contain" />
        </div>
      )}
    </div>
  );
}

function UpdateForm({ type, id, onDone }: { type: "idea" | "item"; id: string; onDone: () => void }) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);

  async function add(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    try {
      for (const f of Array.from(files).slice(0, MAX_IMAGES - images.length)) {
        const url = await uploadImage(f);
        setImages(cur => [...cur, url].slice(0, MAX_IMAGES));
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen"); }
    finally { setUploading(false); }
  }
  async function submit() {
    setBusy(true);
    try {
      await api("/api/roadmap/updates", { method: "POST", body: JSON.stringify({ type, id, body: text, imageUrls: images }) });
      setText(""); setImages([]);
      toast.success("Info veröffentlicht");
      onDone();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-2 rounded-control border border-line bg-surface-2 p-2.5">
      <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={4000}
        placeholder="Stand der Arbeit oder Details zum Feature (Markdown: **fett**, - Liste)" className={`${FIELD} resize-y bg-surface`} />
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map(url => (
            <span key={url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- Blob-Upload */}
              <img src={url} alt="" className="h-16 w-24 rounded-[0.5rem] object-cover" />
              <button type="button" onClick={() => setImages(cur => cur.filter(u => u !== url))} aria-label="Screenshot entfernen"
                className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-full bg-canvas text-muted hover:text-fg"><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {images.length < MAX_IMAGES && (
          <label className={`${buttonClasses("secondary", "sm")} cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
            {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Screenshots
            <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={ev => { add(ev.target.files); ev.target.value = ""; }} />
          </label>
        )}
        <span className="text-xs text-subtle">{images.length}/{MAX_IMAGES}</span>
        <button type="button" disabled={busy || uploading || (!text.trim() && images.length === 0)} onClick={submit}
          className={buttonClasses("primary", "sm", "ml-auto")}>{busy ? "Speichert …" : "Info posten"}</button>
      </div>
    </div>
  );
}

// ── Team: eigenen Punkt anlegen ────────────────────────────────────────────────

function NewItemForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("app");
  const [status, setStatus] = useState<"PLANNED" | "DONE">("PLANNED");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    try {
      await api("/api/roadmap/items", { method: "POST", body: JSON.stringify({ title, description, category, status }) });
      setTitle(""); setDescription(""); setOpen(false);
      toast.success("Punkt auf der Roadmap");
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClasses("secondary", "md")}>
        <Plus className="size-4" /> Team: Punkt hinzufügen
      </button>
    );
  }
  return (
    <section aria-label="Punkt hinzufügen" className="space-y-2.5 rounded-card border border-primary/40 bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-fg"><ImagePlus className="size-4 text-primary-fg" /> Woran arbeitet das Team? Was ist neu?</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="grid size-9 place-items-center rounded-control text-muted hover:text-fg"><X className="size-4" /></button>
      </div>
      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="Titel, z. B. „Neue Eventliste“" className={FIELD} />
      <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={2000} placeholder="Kurz beschreiben (optional) — Details und Screenshots danach unter „Infos“" className={`${FIELD} resize-y`} />
      <div className="flex flex-wrap items-center gap-2">
        <select value={category} onChange={e => setCategory(e.target.value)} className={`${FIELD} w-auto`} aria-label="Kategorie">
          {IDEA_CATEGORIES.filter(c => c.id !== "event").map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value as "PLANNED" | "DONE")} className={`${FIELD} w-auto`} aria-label="Status">
          <option value="PLANNED">Wird umgesetzt</option>
          <option value="DONE">Umgesetzt</option>
        </select>
        <button type="button" disabled={busy || !title.trim()} onClick={submit} className={buttonClasses("primary", "md", "ml-auto")}>Hinzufügen</button>
      </div>
    </section>
  );
}

// ── Folgen ("Auf dem Laufenden bleiben") ───────────────────────────────────────

function FollowButton({ itemId, following }: { itemId: string; following: boolean }) {
  const [on, setOn] = useState(following);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    const next = !on;
    setOn(next); setBusy(true);
    try {
      await api(`/api/roadmap/items/${itemId}/follow`, { method: "POST", body: JSON.stringify({ on: next }) });
      toast.success(next ? "Du bekommst Bescheid, wenn es Neues gibt" : "Du folgst dem Punkt nicht mehr");
    } catch (err) { setOn(!next); toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
      title={on ? "Nicht mehr folgen" : "Auf dem Laufenden bleiben: neue Infos und die Umsetzung als Benachrichtigung"}
      className={`inline-flex min-h-9 items-center gap-1 rounded-control px-2 text-xs font-semibold transition-colors ${on ? "text-primary-fg" : "text-muted hover:bg-surface-2 hover:text-fg"}`}>
      <Bell className="size-3.5" /> {on ? "Folgst du" : "Folgen"}
    </button>
  );
}

// ── Team: Ideen mit einem Punkt verknüpfen ─────────────────────────────────────

function LinkIdeas({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; title: string; lifecycle: string; supporters: number }[]>([]);
  const router = useRouter();
  useEffect(() => {
    if (!open || q.trim().length < 2) return;
    const t = setTimeout(() => {
      api<{ ideas: typeof results }>(`/api/roadmap/ideas?q=${encodeURIComponent(q.trim())}`).then(d => setResults(d.ideas)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);
  async function link(ideaId: string) {
    try {
      await api(`/api/roadmap/items/${itemId}/ideas`, { method: "POST", body: JSON.stringify({ ideaId }) });
      toast.success("Idee verknüpft — sie wandert jetzt mit diesem Punkt");
      setQ(""); setResults([]); setOpen(false);
      router.refresh();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-1.5 inline-flex min-h-8 items-center gap-1 text-xs font-semibold text-subtle hover:text-fg">
        <Plus className="size-3.5" /> Idee verknüpfen
      </button>
    );
  }
  return (
    <div className="mt-2 space-y-1.5 rounded-control border border-line bg-surface-2 p-2">
      <div className="flex items-center gap-1.5">
        <input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="Idee suchen (Titel)…" className={`${FIELD} min-h-9 py-1`} />
        <button type="button" onClick={() => setOpen(false)} aria-label="Schließen" className="grid size-9 shrink-0 place-items-center text-muted hover:text-fg"><X className="size-4" /></button>
      </div>
      {q.trim().length >= 2 && results.map(r => (
        <button key={r.id} type="button" onClick={() => link(r.id)}
          className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-left text-xs hover:bg-surface-3">
          <span className="min-w-0 flex-1 truncate text-fg">{r.title}</span>
          <span className="shrink-0 text-subtle">{r.supporters} Unterst.</span>
        </button>
      ))}
    </div>
  );
}

function UnlinkButton({ itemId, ideaId }: { itemId: string; ideaId: string }) {
  const router = useRouter();
  async function unlink() {
    try { await api(`/api/roadmap/items/${itemId}/ideas?ideaId=${ideaId}`, { method: "DELETE" }); router.refresh(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  return (
    <button type="button" onClick={unlink} aria-label="Verknüpfung lösen" title="Verknüpfung lösen" className="shrink-0 text-subtle hover:text-danger"><X className="size-3.5" /></button>
  );
}
