"use client";
// ============================================
// Community-Board als Feed: Verfassen-Feld oben (alle Werkzeuge: Beitrag, Idee, Anleitung), darunter der Feed
// (Neu · Beliebt · Meine, Filter nach Art, endloses Scrollen) und rechts das Büro in kurz (OfficeSidebar).
// Das volle Büro liegt unter /community-board/buero.
// ============================================

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import RankedAvatar from "@/components/RankedAvatar";
import ReportEditor, { type ReportEditorTool } from "@/components/community-jobs/ReportEditor";
import IdeaForm from "@/components/community-jobs/IdeaForm";
import GuideForm from "@/components/community-jobs/GuideForm";
import { BookOpen, BarChart2, CalendarDays, Clapperboard, FileText, ImagePlus, Lightbulb, Loader2, Pencil, Plus, X } from "@/components/icons";
import { FeedCard, type FeedEntry } from "./CommunityBoardClient";
import OfficeSidebar from "./OfficeSidebar";
import { composeFromParams, takeCompose, type ComposeKind, type ComposeRequest } from "./compose";

export interface BoardMe { id: string; name: string; image: string | null }

type Sort = "new" | "top" | "mine";
type KindFilter = "post" | "media" | "idea" | "guide";

const SORTS: { key: Sort; label: string }[] = [
  { key: "new", label: "Neu" },
  { key: "top", label: "Beliebt" },
  { key: "mine", label: "Meine" },
];
const KINDS: { key: KindFilter; label: string }[] = [
  { key: "post", label: "Beiträge" },
  { key: "media", label: "Fotos & Clips" },
  { key: "idea", label: "Ideen" },
  { key: "guide", label: "Anleitungen" },
];
const PAGE = 15;

const CHIP = "inline-flex min-h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors";
const CHIP_ON = "border-primary/40 bg-primary-soft text-primary-fg";
const CHIP_OFF = "border-line bg-surface text-muted hover:border-line-strong hover:text-fg";

export default function BoardClient({ me, coachCard }: { me: BoardMe; coachCard?: React.ReactNode }) {
  const [compose, setCompose] = useState<ComposeRequest | null>(null);
  const [composeKey, setComposeKey] = useState(0);
  const [feedKey, setFeedKey] = useState(0);
  const [justPublished, setJustPublished] = useState(false);
  const [drafts, setDrafts] = useState(0);

  // Zahl der eigenen Entwürfe für "Entwürfe" im Verfassen-Feld (neu nach jedem Veröffentlichen)
  useEffect(() => {
    let cancelled = false;
    fetch("/api/community-jobs/reports").then(r => (r.ok ? r.json() : null)).then(d => {
      if (!cancelled && d?.reports) setDrafts((d.reports as { isDraft: boolean }[]).filter(r => r.isDraft).length);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [feedKey]);
  const composerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useSearchParams();

  const open = useCallback((req: ComposeRequest) => {
    setCompose(req);
    setComposeKey(k => k + 1);
    requestAnimationFrame(() => composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  // Übergabe aus dem Büro (sessionStorage) oder per Link (?neu=beitrag&event=…)
  useEffect(() => {
    const req = (params.get("neu") === "1" ? takeCompose() : null) ?? composeFromParams(params);
    if (req) {
      // Übergabe kommt aus sessionStorage/URL, also erst nach dem Mounten bekannt
      // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalige Übernahme beim Öffnen der Seite
      open(req);
      router.replace("/community-board", { scroll: false });
    }
  }, [params, open, router]);

  function published() {
    setCompose(null);
    setJustPublished(true);
    setFeedKey(k => k + 1); // Feed neu laden: der neue Beitrag steht oben
    window.scrollTo({ top: 0, behavior: "smooth" });
    fetch("/api/community-jobs").then(r => (r.ok ? r.json() : null)).then(d => {
      const daily = d?.dailyContributions as { used: number; limit: number; remaining: number } | undefined;
      if (!daily) return;
      if (daily.used <= daily.limit) toast.info(`Zählt für deine Woche · heute ${daily.used}/${daily.limit}`);
      else toast.info(`Tageslimit erreicht (${daily.limit}) — der Beitrag ist online, zählt heute aber nicht mehr fürs Gehalt`);
    }).catch(() => {});
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-4">
        <div ref={composerRef} className="scroll-mt-24">
          <Composer me={me} req={compose} editorKey={composeKey} drafts={drafts} onOpen={open} onClose={() => setCompose(null)} onPublished={published} />
        </div>
        <Feed key={feedKey} meId={me.id} highlightMine={justPublished} coachCard={coachCard} />
      </div>
      <aside className="hidden lg:block lg:sticky lg:top-[5.5rem]">
        <OfficeSidebar onCompose={open} />
      </aside>

      {/* Handy: schwebender Button öffnet das Verfassen-Feld */}
      {!compose && (
        <button type="button" onClick={() => open({ kind: "post" })} aria-label="Neuer Beitrag"
          className="sm:hidden fixed right-4 bottom-24 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-ink shadow-pop transition-transform hover:bg-primary-hover active:scale-95">
          <Plus className="size-6" />
        </button>
      )}
    </div>
  );
}

// ── Verfassen-Feld ────────────────────────────────────────────────────────────────

const TOOLS: { label: string; icon: typeof ImagePlus; tone: string; req: ComposeRequest }[] = [
  { label: "Bild", icon: ImagePlus, tone: "text-success", req: { kind: "post", tool: "photo" } },
  { label: "Clip", icon: Clapperboard, tone: "text-danger", req: { kind: "post", tool: "clip" } },
  { label: "Umfrage", icon: BarChart2, tone: "text-coin", req: { kind: "post", tool: "poll" } },
  { label: "Event", icon: CalendarDays, tone: "text-primary-fg", req: { kind: "post", tool: "event" } },
  { label: "Idee", icon: Lightbulb, tone: "text-coin", req: { kind: "idea" } },
  { label: "Anleitung", icon: BookOpen, tone: "text-violet-300", req: { kind: "guide" } },
];

const KIND_TABS: { key: ComposeKind; label: string; icon: typeof Pencil }[] = [
  { key: "post", label: "Beitrag", icon: Pencil },
  { key: "idea", label: "Idee", icon: Lightbulb },
  { key: "guide", label: "Anleitung", icon: BookOpen },
];

function Composer({ me, req, editorKey, drafts, onOpen, onClose, onPublished }: {
  me: BoardMe; req: ComposeRequest | null; editorKey: number; drafts: number;
  onOpen: (r: ComposeRequest) => void; onClose: () => void; onPublished: () => void;
}) {
  const first = me.name.split(" ")[0];

  if (!req) {
    return (
      <section aria-label="Neuer Beitrag" className="rounded-card border border-line bg-surface p-3 shadow-card sm:p-4">
        <div className="flex items-center gap-3">
          <RankedAvatar userId={me.id} src={me.image} alt={me.name} size={36} />
          <button type="button" onClick={() => onOpen({ kind: "post" })}
            className="min-h-11 flex-1 rounded-full border border-line bg-surface-2 px-4 text-left text-sm text-subtle transition-colors hover:border-line-strong hover:text-muted">
            Was gibt&apos;s Neues, {first}?
          </button>
        </div>
        <div className="mt-2.5 flex items-center gap-0.5 overflow-x-auto scrollbar-none">
          {TOOLS.map(t => (
            <button key={t.label} type="button" onClick={() => onOpen(t.req)}
              className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg">
              <t.icon className={`size-4 ${t.tone}`} /> {t.label}
            </button>
          ))}
          <Link href="/community-board/buero#beitraege"
            className="ml-auto inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control px-2.5 text-sm font-medium text-subtle transition-colors hover:bg-surface-2 hover:text-fg">
            <FileText className="size-4" /> Entwürfe
            {drafts > 0 && <span className="min-w-5 rounded-full bg-surface-3 px-1.5 text-center text-xs font-bold leading-5 tabular-nums text-fg">{drafts}</span>}
          </Link>
        </div>
      </section>
    );
  }

  return (
    // Am Handy als Vollbild, am Desktop an Ort und Stelle aufgeklappt
    <section aria-label="Neuer Beitrag"
      className="rounded-card border border-primary/40 bg-surface p-3 shadow-card sm:p-4 max-sm:fixed max-sm:inset-0 max-sm:z-50 max-sm:overflow-y-auto max-sm:rounded-none max-sm:border-0 max-sm:bg-canvas max-sm:pb-24">
      <div className="mb-3 flex items-center gap-2">
        <div role="tablist" aria-label="Art" className="grid flex-1 grid-cols-3 gap-1 rounded-control border border-line bg-surface-2 p-1 sm:max-w-sm">
          {KIND_TABS.map(k => (
            <button key={k.key} type="button" role="tab" aria-selected={req.kind === k.key}
              onClick={() => req.kind !== k.key && onOpen({ kind: k.key, eventId: req.eventId })}
              className={`flex min-h-9 items-center justify-center gap-1.5 rounded-control text-sm font-semibold transition-colors ${
                req.kind === k.key ? "bg-surface-3 text-fg shadow-card" : "text-muted hover:text-fg"
              }`}>
              <k.icon className="size-4" /> {k.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Schließen"
          className="ml-auto grid size-10 shrink-0 place-items-center rounded-control text-muted transition-colors hover:bg-surface-2 hover:text-fg">
          <X className="size-5" />
        </button>
      </div>
      {req.kind === "post" && (
        <ReportEditor key={editorKey} eventId={req.eventId} recap={req.prefill?.recap} prefill={req.prefill}
          startTool={req.tool as ReportEditorTool | undefined} onDone={onPublished} />
      )}
      {req.kind === "idea" && (
        <IdeaForm key={editorKey} prefill={{
          title: req.prefill?.title, body: req.prefill?.body, link: req.prefill?.link, linkLabel: req.prefill?.linkLabel,
          imageUrl: req.prefill?.imageUrl, eventId: req.eventId, reportId: req.prefill?.reportId,
        }} onDone={onPublished} />
      )}
      {req.kind === "guide" && <GuideForm key={editorKey} onDone={onPublished} />}
    </section>
  );
}

// ── Feed ──────────────────────────────────────────────────────────────────────────

async function fetchFeed(sort: Sort, kind: KindFilter | null, cursor: string | null, limit = PAGE) {
  const q = new URLSearchParams({ limit: String(limit) });
  if (sort === "top") q.set("sort", "top");
  if (sort === "mine") q.set("mine", "1");
  if (kind) q.set("kind", kind);
  if (cursor) q.set(sort === "top" ? "offset" : "before", cursor);
  const res = await fetch(`/api/community-board?${q.toString()}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Community-Board konnte nicht geladen werden");
  return data as { feed: FeedEntry[]; nextCursor: string | null };
}

const INTRO_KEY = "oma.board.intro.v1";
const POLL_MS = 60_000;

function Feed({ meId, highlightMine, coachCard }: { meId: string; highlightMine: boolean; coachCard?: React.ReactNode }) {
  const [fresh, setFresh] = useState<FeedEntry[] | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  useEffect(() => {
    // Einstieg nur beim ersten Besuch (bis weggeklickt) — localStorage gibt es erst im Browser
    // eslint-disable-next-line react-hooks/set-state-in-effect -- einmalig nach dem Mounten
    try { setShowIntro(window.localStorage.getItem(INTRO_KEY) !== "1"); } catch { /* ohne Speicher: nicht zeigen */ }
  }, []);
  function closeIntro() {
    setShowIntro(false);
    try { window.localStorage.setItem(INTRO_KEY, "1"); } catch { /* egal */ }
  }
  const [sort, setSort] = useState<Sort>("new");
  const [kind, setKind] = useState<KindFilter | null>(null);
  const [items, setItems] = useState<FeedEntry[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  // Erste Seite bei Reiter-/Filterwechsel
  useEffect(() => {
    let cancelled = false;
    fetchFeed(sort, kind, null)
      .then(d => {
        if (cancelled) return;
        setItems(d.feed); setCursor(d.nextCursor);
        // Gerade veröffentlicht: der neueste eigene Eintrag oben leuchtet kurz auf
        if (highlightMine) {
          const own = d.feed.find(e => e.author.id === meId);
          if (own) { setHighlightId(`${own.kind}-${own.id}`); setTimeout(() => setHighlightId(null), 4000); }
        }
      })
      .catch(err => { if (!cancelled) { setItems([]); toast.error(err.message); } });
    return () => { cancelled = true; };
  }, [sort, kind]); // eslint-disable-line react-hooks/exhaustive-deps -- highlightMine/meId gelten nur für den ersten Abruf

  // Neue Einträge anderer: alle 60 s nachsehen und als Pille oben anbieten (nur in "Neu", ohne Filter)
  useEffect(() => {
    if (sort !== "new" || kind || !items || items.length === 0) return;
    const top = new Date(items[0].publishedAt).getTime();
    const known = new Set(items.map(e => `${e.kind}-${e.id}`));
    const timer = setInterval(() => {
      if (document.hidden) return;
      fetchFeed("new", null, null, PAGE).then(d => {
        const newer = d.feed.filter(e => !known.has(`${e.kind}-${e.id}`) && new Date(e.publishedAt).getTime() > top);
        setFresh(newer.length > 0 ? d.feed : null);
      }).catch(() => {});
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [sort, kind, items]);
  const freshCount = fresh && items ? fresh.filter(e => !items.some(i => i.kind === e.kind && i.id === e.id) && new Date(e.publishedAt).getTime() > new Date(items[0]?.publishedAt ?? 0).getTime()).length : 0;
  function showFresh() {
    if (!fresh) return;
    setItems(fresh);
    setFresh(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const loadMore = useCallback(async () => {
    if (!cursor || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const d = await fetchFeed(sort, kind, cursor);
      setItems(prev => {
        const seen = new Set((prev ?? []).map(e => `${e.kind}-${e.id}`));
        return [...(prev ?? []), ...d.feed.filter(e => !seen.has(`${e.kind}-${e.id}`))];
      });
      setCursor(d.nextCursor);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Laden fehlgeschlagen");
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [cursor, sort, kind]);

  // Endloses Scrollen: kurz vor dem Ende die nächste Seite holen
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !cursor) return;
    const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) loadMore(); }, { rootMargin: "600px" });
    io.observe(el);
    return () => io.disconnect();
  }, [cursor, loadMore]);

  /** Nach Daumen, Kommentar, Ergänzung: geladene Einträge neu holen, ohne die Liste zurückzusetzen */
  const refresh = useCallback(async () => {
    const n = Math.min(50, Math.max(PAGE, items?.length ?? PAGE));
    try {
      const d = await fetchFeed(sort, kind, null, n);
      setItems(d.feed);
      setCursor(d.nextCursor);
    } catch { /* still: alter Stand bleibt stehen */ }
  }, [items?.length, sort, kind]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {SORTS.map(s => (
          <button key={s.key} type="button" aria-pressed={sort === s.key} onClick={() => { setItems(null); setSort(s.key); }}
            className={`${CHIP} ${sort === s.key ? CHIP_ON : CHIP_OFF}`}>{s.label}</button>
        ))}
        <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line-strong" />
        {KINDS.map(k => (
          <button key={k.key} type="button" aria-pressed={kind === k.key} onClick={() => { setItems(null); setKind(kind === k.key ? null : k.key); }}
            className={`${CHIP} ${kind === k.key ? CHIP_ON : CHIP_OFF}`}>{k.label}</button>
        ))}
      </div>

      {freshCount > 0 && (
        <div className="sticky top-20 z-20 flex justify-center">
          <button type="button" onClick={showFresh}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-bold text-primary-ink shadow-pop hover:bg-primary-hover">
            ↑ {freshCount} {freshCount === 1 ? "neuer Beitrag" : "neue Beiträge"}
          </button>
        </div>
      )}

      {showIntro && sort === "new" && !kind && (
        <section aria-label="So funktioniert das Board" className="relative rounded-card border border-primary/30 bg-primary-soft p-4">
          <button type="button" onClick={closeIntro} aria-label="Hinweis schließen"
            className="absolute right-2 top-2 grid size-10 place-items-center rounded-control text-muted hover:text-fg"><X className="size-4" /></button>
          <h2 className="pr-10 text-sm font-bold text-fg">So funktioniert das Community-Board</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-fg/90">
            <li><b className="text-primary-fg">Teilen:</b> Bilder, Clips, Berichte, Werbung für Events, Ideen und Anleitungen — alles oben im Verfassen-Feld.</li>
            <li><b className="text-primary-fg">Bewerten:</b> Daumen für Beiträge und Anleitungen, Sterne für Ideen. Wer selbst bewertet, bekommt einen höheren Gehalts-Bonus.</li>
            <li><b className="text-primary-fg">Verdienen:</b> Je mehr Daumen deine Beiträge in der Woche bekommen, desto mehr Münzen gibt es montags — Stand im Büro.</li>
          </ul>
        </section>
      )}

      {/* Coach-Bewertung als Karte im Feed (erscheint nur, wenn es etwas zu bewerten gibt) */}
      {sort === "new" && !kind && coachCard}

      {items === null ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-8 text-center shadow-card">
          <p className="font-semibold text-fg">{sort === "mine" ? "Du hast noch nichts geteilt" : sort === "top" ? "Diese Woche noch nichts Beliebtes" : "Hier ist noch nichts"}</p>
          <p className="mt-1 text-sm text-muted">Teil oben ein Bild, eine Idee oder erzähl, was in der Community los war.</p>
        </div>
      ) : (
        <>
          {sort === "top" && <p className="text-xs text-subtle">Die beliebtesten Einträge der letzten 7 Tage</p>}
          <div className="space-y-4">
            {items.map(entry => (
              <FeedCard key={`${entry.kind}-${entry.id}`} entry={entry} currentUserId={meId} isJournalist onChanged={refresh}
                highlight={highlightId === `${entry.kind}-${entry.id}`} />
            ))}
          </div>
          <div ref={sentinel} aria-hidden className="h-1" />
          {loadingMore && <div className="flex justify-center py-4"><Loader2 className="size-5 animate-spin text-primary" /></div>}
          {!cursor && items.length > 3 && <p className="py-4 text-center text-xs text-subtle">Du bist auf dem neuesten Stand.</p>}
        </>
      )}
    </div>
  );
}
