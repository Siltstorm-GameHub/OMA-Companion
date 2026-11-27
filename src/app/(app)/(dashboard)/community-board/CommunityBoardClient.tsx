"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ThumbsUp, Loader2, Star, Flag, MessageCircle, Send, Trash2, BookOpen, CalendarDays, Clock, Smile, ChevronLeft, ChevronRight, X, Share, Lightbulb, Plus, Pencil } from "@/components/icons";
import { useRouter } from "next/navigation";
import { stashCompose } from "./compose";
import { buttonClasses } from "@/components/ui/button-styles";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import DisputeVotesModal, { type DisputeKind } from "@/components/community-jobs/DisputeVotesModal";
import RankedAvatar from "@/components/RankedAvatar";
import StyledUserName, { StyledUserTitle } from "@/components/cosmetics/StyledUserName";
import { isVideoUrl } from "@/lib/upload-limits";
import MarkdownLite, { EmojiText } from "@/components/community-jobs/MarkdownLite";
import { plainExcerpt } from "@/lib/report-text";
import GameCover from "@/components/GameCover";
import EmojiPanel from "@/components/community-jobs/EmojiPicker";
import IdeaBody from "@/components/community-jobs/IdeaCard";
import { reportCategoryLabel } from "@/lib/report-categories";
import { formatBerlinDate } from "@/lib/time";
import TrimmedVideo from "@/components/community-jobs/TrimmedVideo";
import PostPollCard from "@/components/community-jobs/PostPollCard";
import type { PollView } from "@/lib/post-poll";

interface Author { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number }
interface SubEntity { id: string; author: Author; upvotes: number; url?: string; caption?: string }
export interface FeedEntry {
  kind: "report" | "asset" | "marketing_post" | "idea" | "guide" | "proposal";
  id: string;
  publishedAt: string;
  title?: string;
  caption?: string;
  description?: string;
  game?: string | null;
  category?: string | null;
  series?: { id: string; title: string } | null;
  seriesParts?: { id: string; title: string }[];
  editedAt?: string | null;
  lastEditNote?: string | null;
  event?: {
    id: string; title: string; startAt?: string | Date; status?: string; game?: string | null;
    coverImageUrl?: string | null; maxPlayers?: number | null; registrations?: number;
  } | null;
  /** Kommentarzahl und die zwei neuesten Kommentare (Vorschau unter der Karte) */
  commentCount?: number;
  latestComments?: { id: string; bodyMarkdown: string; createdAt: string | Date; author: Author }[];
  eventId?: string | null;
  excerpt?: string;
  readingMinutes?: number;
  type?: string;
  url?: string;
  status?: string;
  author: Author;
  upvotes?: number;
  voteCount?: number;
  votedByMe: boolean;
  coverAsset?: SubEntity | null;
  gameCover?: { url: string; name: string | null } | null;
  contributions?: { id: string; bodyMarkdown: string; author: Author; upvotes: number }[];
  adminConfirmedPosted?: boolean;
  lifecycle?: string;
  lifecycleNote?: string | null;
  votingEndsAt?: string | null;
  sourceEventId?: string | null;
  sourceReportId?: string | null;
  avgStars?: number;
  distribution?: number[];
  canRevote?: boolean;
  imageUrls?: string[];
  version?: number;
  gameAppId?: number | null;
  gameName?: string | null;
  supporters?: number;
  supportedByMe?: boolean;
  /** Event-Vorschlag */
  preferredTime?: string | null;
  proposalStatus?: string;
  organizer?: { id: string; name: string } | null;
  interested?: number;
  interestedPeople?: { id: string; name: string; image: string | null }[];
  interestedByMe?: boolean;
  interestHelp?: number;
  myInterests?: string[];
  imageUrl?: string | null;
  asset?: { url: string } | null;
  /** Beitrag: Bilder/Clips in Reihenfolge. */
  media?: { id: string; url: string; caption: string | null; type: string; clipStart?: number | null; clipEnd?: number | null; posterUrl?: string | null }[];
  /** Beitrag: Umfrage (richtige Antwort erst nach der Auflösung). */
  poll?: PollView | null;
  hasOwnTitle?: boolean;
  template?: string | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  // Offene Community-Jobs: Beitrag über dem Tageslimit — veröffentlicht, zählt aber nicht fürs Gehalt.
  if (typeof data?.notice === "string" && data.notice) toast.warning(data.notice);
  return data as T;
}

/** Art des Eintrags für den Kartenkopf ("Beitrag", "Idee", "Anleitung") */
function kindLabel(e: FeedEntry): string {
  if (e.kind === "idea") return "Idee";
  if (e.kind === "guide") return "Anleitung";
  if (e.kind === "proposal") return "Event-Vorschlag";
  return reportCategoryLabel(e.category) ?? "Beitrag";
}

function authorLabel(a: Author): string {
  return a.username ?? a.name ?? "Unbekannt";
}

/** Bericht im Board: Auszug + "Bericht lesen" (lädt den vollen Text nach), Bewertungen, Ergänzungen (schreiben/bearbeiten/löschen). */
/** Bilder/Clips eines Beitrags: eins groß, mehrere als Raster (Klick öffnet das Original). */
function MediaGallery({ media }: { media: NonNullable<FeedEntry["media"]> }) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (media.length === 0) return null;
  const images = media.filter(m => !isVideoUrl(m.url));
  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;
  const single = media.length === 1;
  const openAt = (url: string) => setViewer(Math.max(0, images.findIndex(i => i.url === url)));
  return (
    <>
      <div className={single ? "" : `grid gap-1 overflow-hidden rounded-control ${shown.length === 2 ? "grid-cols-2" : "grid-cols-2"}`}>
        {shown.map((m, i) => {
          const wide = shown.length === 3 && i === 0; // drei Medien: erstes über die volle Breite
          return (
            <figure key={m.id} className={`relative ${wide ? "col-span-2" : ""}`}>
              {isVideoUrl(m.url) ? (
                <TrimmedVideo url={m.url} clipStart={m.clipStart} clipEnd={m.clipEnd} posterUrl={m.posterUrl}
                  className={`w-full bg-black/30 ${single ? "h-auto rounded-control" : wide ? "aspect-video object-cover" : "aspect-square object-cover"}`} />
              ) : (
                <button type="button" onClick={() => openAt(m.url)} className="block w-full" aria-label={m.caption ? `Bild öffnen: ${m.caption}` : "Bild öffnen"}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host */}
                  <img src={m.url} alt={m.caption ?? ""} loading="lazy"
                    className={`w-full bg-black/30 ${single ? "h-auto max-h-[32rem] object-contain rounded-control" : wide ? "aspect-video object-cover" : "aspect-square object-cover"}`} />
                </button>
              )}
              {i === shown.length - 1 && extra > 0 && (
                <button type="button" onClick={() => openAt(images[Math.min(images.length - 1, 4)]?.url ?? m.url)}
                  className="absolute inset-0 grid place-items-center bg-canvas/70 text-2xl font-extrabold text-fg">+{extra}</button>
              )}
              {single && m.caption && <figcaption className="mt-1 text-xs text-subtle">{m.caption}</figcaption>}
            </figure>
          );
        })}
      </div>
      {viewer !== null && images.length > 0 && <Lightbox images={images} start={viewer} onClose={() => setViewer(null)} />}
    </>
  );
}

/** Bildergalerie im Vollbild: Pfeile/Wischen zum Blättern, Esc oder Tippen daneben schließt. */
function Lightbox({ images, start, onClose }: { images: { id: string; url: string; caption: string | null }[]; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const touchX = useRef<number | null>(null);
  const go = (d: number) => setI(v => (v + d + images.length) % images.length);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setI(v => (v + 1) % images.length);
      else if (e.key === "ArrowLeft") setI(v => (v - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [images.length, onClose]);
  const img = images[i];
  return (
    <div role="dialog" aria-modal="true" aria-label="Bilder" className="fixed inset-0 z-[60] flex flex-col bg-canvas/95"
      onClick={onClose}
      onTouchStart={e => { touchX.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        touchX.current = null;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}>
      <div className="flex items-center justify-between p-3 text-sm text-muted">
        <span className="tabular-nums">{i + 1} / {images.length}</span>
        <button type="button" onClick={onClose} aria-label="Schließen" className="grid size-11 place-items-center rounded-control hover:bg-surface-2 hover:text-fg">
          <X className="size-5" />
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2" onClick={e => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host */}
        <img src={img.url} alt={img.caption ?? ""} className="max-h-full max-w-full rounded-control object-contain" />
        {images.length > 1 && (
          <>
            <button type="button" onClick={() => go(-1)} aria-label="Vorheriges Bild"
              className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-fg max-sm:hidden"><ChevronLeft className="size-5" /></button>
            <button type="button" onClick={() => go(1)} aria-label="Nächstes Bild"
              className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-fg max-sm:hidden"><ChevronRight className="size-5" /></button>
          </>
        )}
      </div>
      <p className="min-h-10 p-3 text-center text-sm text-muted">{img.caption}</p>
    </div>
  );
}

function ReportBody({ entry, currentUserId, onChanged, onReportPage, contributing, onContributeEnd }: {
  entry: FeedEntry; currentUserId: string | undefined; onChanged: () => void; onReportPage: boolean;
  /** "Ergänzen" aus dem Menü der Karte gewählt */
  contributing: boolean; onContributeEnd: () => void;
}) {
  const [full, setFull] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auf der eigenen Bericht-Seite direkt den vollen Text laden.
  useEffect(() => {
    if (onReportPage) toggleRead();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- nur beim Öffnen


  async function toggleRead() {
    if (open) { setOpen(false); return; }
    if (full === null) {
      setLoading(true);
      try {
        const data = await api<{ report: { bodyMarkdown: string } }>(`/api/community-jobs/reports/${entry.id}`);
        setFull(data.report.bodyMarkdown);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Bericht konnte nicht geladen werden");
        setLoading(false);
        return;
      }
      setLoading(false);
    }
    setOpen(true);
  }

  const categoryLabel = reportCategoryLabel(entry.category);
  return (
    <>
      {entry.hasOwnTitle !== false && (onReportPage
        ? <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg">{entry.title}</h1>
        : <a href={`/community-board/report/${entry.id}`} className="block text-base font-extrabold leading-snug text-fg hover:text-primary-fg transition-colors">{entry.title}</a>)}
      {(categoryLabel || entry.series || (entry.event && !entry.event.startAt) || entry.readingMinutes) && (
        <div className="flex items-center gap-2 flex-wrap text-xs text-subtle">
          {categoryLabel && <Badge tone="info">{categoryLabel}</Badge>}
          {entry.series && <Badge tone="neutral"><BookOpen className="w-2.5 h-2.5" /> Reihe: {entry.series.title}</Badge>}
          {entry.event && !entry.event.startAt && (
            <a href={`/tournament/${entry.event.id}`} className="inline-flex items-center gap-1 hover:text-primary-fg transition-colors">
              <CalendarDays className="w-3 h-3" /> {entry.event.title}
            </a>
          )}
          {entry.readingMinutes ? <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {entry.readingMinutes} Min. Lesezeit</span> : null}
        </div>
      )}
      {entry.editedAt && (
        <p className="text-xs text-subtle">Korrigiert am {formatBerlinDate(entry.editedAt)}{entry.lastEditNote ? ` — ${entry.lastEditNote}` : ""}</p>
      )}
      {entry.coverAsset && (
        // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host
        <img src={entry.coverAsset.url} alt="" className="w-full aspect-video object-cover rounded-control" />
      )}
      {!entry.coverAsset && entry.gameCover && (
        // eslint-disable-next-line @next/next/no-img-element -- Spiel-Cover (bekannte Cover-Hosts)
        <img src={entry.gameCover.url} alt={entry.gameCover.name ? `Cover: ${entry.gameCover.name}` : ""} className="w-full aspect-video object-cover rounded-control" />
      )}

      {open && full !== null
        ? <MarkdownLite text={full} className="text-xs" />
        : entry.excerpt ? <p className="text-xs text-muted whitespace-pre-line"><EmojiText text={entry.excerpt} /></p> : null}
      {entry.media && <MediaGallery media={entry.media} />}
      {entry.poll && <PostPollCard key={entry.poll.id} poll={entry.poll} isAuthor={entry.author.id === currentUserId} canVote={!!currentUserId} />}
      <div>
        {/* Kurze Texte stehen schon vollständig im Auszug — "weiterlesen" nur bei längeren. */}
        {(onReportPage || (entry.excerpt?.length ?? 0) >= 300) && (
          <button onClick={toggleRead} disabled={loading} aria-expanded={open}
            className="mr-3 text-xs text-primary hover:text-primary-fg transition-colors inline-flex items-center gap-1">
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            {open ? "Einklappen" : "Ganzen Beitrag lesen"}
          </button>
        )}
      </div>

      {entry.seriesParts && entry.seriesParts.length > 1 && (
        <div className="rounded-lg bg-surface-2 p-2.5 space-y-1">
          <p className="text-xs font-semibold text-subtle uppercase tracking-widest">Reihe: {entry.series?.title}</p>
          <ol className="list-decimal pl-5 text-xs space-y-0.5">
            {entry.seriesParts.map(part => (
              <li key={part.id} className={part.id === entry.id ? "text-fg font-medium" : "text-muted"}>
                {part.id === entry.id ? part.title : <a href={`/community-board/report/${part.id}`} className="hover:text-primary-fg transition-colors">{part.title}</a>}
              </li>
            ))}
          </ol>
        </div>
      )}

      {entry.contributions && entry.contributions.length > 0 && (
        <div className="pl-3 border-l-2 border-line-strong space-y-3">
          {entry.contributions.map(c => (
            <ContributionItem key={c.id} reportId={entry.id} contribution={c} currentUserId={currentUserId} onChanged={onChanged} />
          ))}
        </div>
      )}
      {contributing && <ContributionForm reportId={entry.id} onDone={() => { onContributeEnd(); onChanged(); }} onCancel={onContributeEnd} />}
    </>
  );
}

function ContributionItem({ reportId, contribution: c, currentUserId, onChanged }: {
  reportId: string; contribution: NonNullable<FeedEntry["contributions"]>[number]; currentUserId: string | undefined; onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(c.bodyMarkdown);
  const [busy, setBusy] = useState(false);
  const mine = c.author.id === currentUserId;

  async function save() {
    setBusy(true);
    try {
      await api(`/api/community-jobs/reports/${reportId}/contributions/${c.id}`, { method: "PATCH", body: JSON.stringify({ bodyMarkdown: draft }) });
      setEditing(false);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (!window.confirm("Ergänzung wirklich löschen?")) return;
    try {
      await api(`/api/community-jobs/reports/${reportId}/contributions/${c.id}`, { method: "DELETE" });
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="space-y-1">
      <p className="text-xs text-subtle">Ergänzung von {authorLabel(c.author)}</p>
      {editing ? (
        <div className="space-y-1.5">
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} maxLength={5000}
            className="w-full bg-surface-2 border border-line rounded-control px-3 py-2 text-xs text-fg focus:outline-none focus:border-primary resize-y" />
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(c.bodyMarkdown); }}>Abbrechen</Button>
            <Button size="sm" loading={busy} disabled={!draft.trim()} onClick={save}>Speichern</Button>
          </div>
        </div>
      ) : (
        <MarkdownLite text={c.bodyMarkdown} className="text-xs" />
      )}
      <div className="flex items-center gap-2">
        <UpvoteButton votedByMe={false} upvotes={c.upvotes}
          onVote={added => api(`/api/community-jobs/reports/${reportId}/contributions/${c.id}/vote`, { method: added ? "POST" : "DELETE" })}
          onDone={onChanged} label="Ergänzung" />
        {mine && (
          <>
            <DisputeTrigger kind="jobReportContributionVote" fetchUrl={`/api/community-jobs/reports/${reportId}/contributions/${c.id}/votes`} listKey="votes" />
            {!editing && (
              <>
                <button onClick={() => setEditing(true)} className="text-xs text-subtle hover:text-primary transition-colors">Bearbeiten</button>
                <button onClick={remove} aria-label="Ergänzung löschen" className="text-subtle hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Jeder eingeloggte User darf jeden Bericht ergänzen — ohne Freigabe des Autors. */
function ContributionForm({ reportId, onDone, onCancel }: { reportId: string; onDone: () => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  function insertEmoji(emoji: string) {
    const el = areaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? text.length;
    setText(text.slice(0, start) + emoji + text.slice(end));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + emoji.length, start + emoji.length); });
  }

  async function submit() {
    setBusy(true);
    try {
      await api(`/api/community-jobs/reports/${reportId}/contributions`, { method: "POST", body: JSON.stringify({ bodyMarkdown: text }) });
      toast.success("Ergänzung veröffentlicht");
      setText("");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ergänzung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-muted">Beitrag ergänzen</p>
      <textarea ref={areaRef} value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={5000} autoFocus
        placeholder="Deine Ergänzung (Markdown möglich: **fett**, - Liste, [Link](https://…))"
        className="w-full bg-surface-2 border border-line rounded-control px-3 py-2 text-xs text-fg placeholder:text-subtle focus:outline-none focus:border-primary resize-y" />
      {emojiOpen && <EmojiPanel onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
      <div className="flex items-center justify-between gap-1.5">
        <button onClick={() => setEmojiOpen(v => !v)} title="Emoji einfügen" aria-label="Emoji einfügen" aria-expanded={emojiOpen}
          className={`p-1.5 rounded hover:text-fg hover:bg-line transition-colors ${emojiOpen ? "text-primary-fg" : "text-muted"}`}>
          <Smile className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => { setText(""); setEmojiOpen(false); onCancel(); }}>Abbrechen</Button>
          <Button size="sm" loading={busy} disabled={!text.trim()} icon={<Send className="w-3.5 h-3.5" />} onClick={submit}>Veröffentlichen</Button>
        </div>
      </div>
    </div>
  );
}

export function FeedCard({ entry, currentUserId, isJournalist, onChanged, expandReport = false, highlight = false }: {
  entry: FeedEntry; currentUserId: string | undefined; isJournalist: boolean; onChanged: () => void; expandReport?: boolean;
  /** Gerade selbst veröffentlicht: kurz hervorheben */
  highlight?: boolean;
}) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(entry.commentCount ?? 0);
  const [contributing, setContributing] = useState(false);
  const mine = entry.author.id === currentUserId;
  const loggedIn = !!currentUserId && isJournalist;

  return (
    <article id={`${entry.kind}-${entry.id}`}
      className={`scroll-mt-24 rounded-card border bg-surface p-4 sm:p-5 space-y-3 shadow-card transition-colors duration-700 ${highlight ? "border-primary/60 ring-2 ring-primary/30" : "border-line"}`}>
      <div className="flex items-center justify-between gap-2">
        <a href={`/profile/${entry.author.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
          <RankedAvatar userId={entry.author.id} src={entry.author.image} alt={authorLabel(entry.author)} size={32} />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 min-w-0"><StyledUserName userId={entry.author.id} name={authorLabel(entry.author)} className="text-sm font-bold text-fg truncate" /><StyledUserTitle userId={entry.author.id} className="shrink-0" /></span>
            <span className="block truncate text-xs text-subtle">{kindLabel(entry)} · {formatBerlinDate(entry.publishedAt)}{entry.event && !entry.event.startAt ? ` · zu ${entry.event.title}` : ""}</span>
          </div>
        </a>
        {entry.kind === "report" && entry.adminConfirmedPosted && <Badge tone="success">Extern gepostet</Badge>}
        {entry.kind === "guide" && <Badge tone="info"><BookOpen className="w-2.5 h-2.5" /> Anleitung{entry.game ? ` · ${entry.game}` : ""}</Badge>}
      </div>

      {entry.kind === "report" && (
        <ReportBody entry={entry} currentUserId={currentUserId} onChanged={onChanged} onReportPage={expandReport}
          contributing={contributing} onContributeEnd={() => setContributing(false)} />
      )}
      {entry.kind === "idea" && <IdeaBody entry={entry} currentUserId={currentUserId} onChanged={onChanged} onIdeaPage={expandReport} actions={null} bare />}
      {entry.kind === "guide" && <GuideBody entry={entry} />}
      {entry.kind === "proposal" && <ProposalBody entry={entry} currentUserId={currentUserId} onChanged={onChanged} />}

      {(entry.kind === "report" || entry.kind === "proposal") && entry.event?.startAt && <EventMiniCard event={entry.event} />}

      {/* Aktionsleiste: gleich für alle Arten */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
        {entry.kind === "report" && (
          <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
            onVote={added => api(`/api/community-jobs/reports/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
            onDone={onChanged} label="Beitrag" />
        )}
        {entry.kind === "guide" && (
          <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
            onVote={added => api(`/api/community-jobs/coach/guides/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
            onDone={onChanged} label="Anleitung" />
        )}
        {entry.kind === "idea" && (
          <>
            <SupportButton ideaId={entry.id} supported={!!entry.supportedByMe} count={entry.supporters ?? 0} disabled={mine || !loggedIn} onDone={onChanged} />
            {!mine && (
              <IdeaVoteButton ideaId={entry.id} votedByMe={entry.votedByMe} canRevote={entry.canRevote} voteCount={entry.voteCount ?? 0}
                avgStars={entry.avgStars} onDone={onChanged} />
            )}
          </>
        )}
        {entry.kind === "proposal" && (
          <InterestButton proposalId={entry.id} on={!!entry.interestedByMe} count={entry.interested ?? 0} disabled={!loggedIn || entry.proposalStatus === "SCHEDULED"} onDone={onChanged} />
        )}
        <button type="button" onClick={() => setCommentsOpen(o => !o)} aria-expanded={commentsOpen}
          className={`${ACTION} ${commentsOpen ? "text-fg bg-surface-2" : ""}`}>
          <MessageCircle className="size-4" /> <span className="tabular-nums">{commentCount}</span>
          <span className="max-sm:sr-only">{commentCount === 1 ? "Kommentar" : "Kommentare"}</span>
        </button>
        <ShareButton entry={entry} />
        <CardMenu entry={entry} mine={mine} loggedIn={loggedIn} onContribute={() => setContributing(true)} onRemoved={onChanged} />
      </div>

      <CommentSection entityType={entry.kind} entityId={entry.id} currentUserId={currentUserId}
        open={commentsOpen} onOpen={() => setCommentsOpen(true)} count={commentCount} onCountChange={setCommentCount}
        preview={entry.latestComments ?? []} />
    </article>
  );
}

const ACTION = "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-fg";
const MENU_ITEM = "flex w-full min-h-10 items-center gap-2.5 rounded-control px-3 text-left text-sm text-fg hover:bg-surface-3";

/** Link zum Eintrag: Beitrag und Idee haben eigene Seiten, Anleitungen springen im Board an ihre Karte. */
function entryUrl(e: FeedEntry): string {
  if (e.kind === "report") return `/community-board/report/${e.id}`;
  if (e.kind === "idea") return `/community-board/idea/${e.id}`;
  return `/community-board#${e.kind}-${e.id}`;
}

function ShareButton({ entry }: { entry: FeedEntry }) {
  async function share() {
    const url = `${window.location.origin}${entryUrl(entry)}`;
    // Handy: System-Teilen (WhatsApp, Discord …), sonst Link kopieren
    if (typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches) {
      try { await navigator.share({ title: entry.title ?? "Community-Board", url }); return; } catch { /* abgebrochen */ return; }
    }
    try { await navigator.clipboard.writeText(url); toast.success("Link kopiert"); }
    catch { toast.error("Link konnte nicht kopiert werden"); }
  }
  return (
    <button type="button" onClick={share} className={ACTION}>
      <Share className="size-4" /> <span className="max-sm:sr-only">Teilen</span>
    </button>
  );
}

/** "⋯"-Menü: Idee dazu, Ergänzen, Bearbeiten, Bewertungen ansehen */
function CardMenu({ entry, mine, loggedIn, onContribute, onRemoved }: { entry: FeedEntry; mine: boolean; loggedIn: boolean; onContribute: () => void; onRemoved?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const dispute = entry.kind === "report"
    ? { kind: "jobReportVote" as const, url: `/api/community-jobs/reports/${entry.id}/votes` }
    : entry.kind === "guide"
    ? { kind: "coachGuideVote" as const, url: `/api/community-jobs/coach/guides/${entry.id}/votes` }
    : { kind: "communityIdeaVote" as const, url: `/api/community-jobs/ideas/${entry.id}/votes` };
  const items = [
    entry.kind === "report" && loggedIn,
    entry.kind === "report" && mine,
    mine,
  ].some(Boolean);

  async function removeProposal() {
    setOpen(false);
    if (!window.confirm("Event-Vorschlag löschen?")) return;
    try { await api(`/api/event-proposals/${entry.id}`, { method: "DELETE" }); onRemoved?.(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }
  if (!items) return null;

  function ideaFrom() {
    setOpen(false);
    stashCompose({ kind: "idea", prefill: { title: `Idee zu \u201e${entry.title ?? "Beitrag"}\u201c`, reportId: entry.id } });
    router.push("/community-board?neu=1");
  }

  return (
    <div ref={ref} className="relative ml-auto">
      <button type="button" onClick={() => setOpen(o => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Weitere Aktionen"
        className="grid size-10 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-fg">
        <span aria-hidden className="text-xl leading-none tracking-tighter">⋯</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 bottom-full z-20 mb-1 w-56 rounded-card border border-line-strong bg-surface-2 p-1 shadow-pop">
          {entry.kind === "report" && loggedIn && (
            <>
              <button type="button" role="menuitem" onClick={ideaFrom} className={MENU_ITEM}><Lightbulb className="size-4" /> Idee dazu</button>
              <button type="button" role="menuitem" onClick={() => { setOpen(false); onContribute(); }} className={MENU_ITEM}><Plus className="size-4" /> Ergänzen</button>
            </>
          )}
          {entry.kind === "report" && mine && (
            <a role="menuitem" href="/community-board/buero#beitraege" className={MENU_ITEM}><Pencil className="size-4" /> Bearbeiten (im Büro)</a>
          )}
          {mine && entry.kind !== "proposal" && <DisputeTrigger kind={dispute.kind} fetchUrl={dispute.url} listKey="votes" label="Bewertungen ansehen" />}
          {mine && entry.kind === "proposal" && (
            <button type="button" role="menuitem" onClick={removeProposal} className={`${MENU_ITEM} text-danger`}><Trash2 className="size-4" /> Vorschlag löschen</button>
          )}
        </div>
      )}
    </div>
  );
}

/** Event-Bezug eines Beitrags als Mini-Karte: Cover, Datum, Plätze und der Weg zur Anmeldung. */
function EventMiniCard({ event }: { event: NonNullable<FeedEntry["event"]> }) {
  const [now] = useState(() => Date.now());
  const start = event.startAt ? new Date(event.startAt) : null;
  const upcoming = !!start && start.getTime() > now && event.status !== "completed" && event.status !== "cancelled";
  const full = event.maxPlayers != null && (event.registrations ?? 0) >= event.maxPlayers;
  return (
    <a href={`/tournament/${event.id}`}
      className="group flex items-center gap-3 rounded-control border border-line bg-surface-2 p-2 transition-colors hover:border-line-strong">
      {event.coverImageUrl
        // eslint-disable-next-line @next/next/no-img-element -- Event-Cover (Blob)
        ? <img src={event.coverImageUrl} alt="" className="h-12 w-20 shrink-0 rounded-[0.5rem] object-cover" />
        : <GameCover game={event.game ?? null} className="h-12 w-20 shrink-0" rounded="rounded-[0.5rem]" fallbackVariant="plain" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{event.title}</span>
        <span className="block truncate text-xs text-subtle">
          {start ? formatBerlinDate(start, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
          {event.registrations != null ? ` · ${event.registrations}${event.maxPlayers ? `/${event.maxPlayers}` : ""} angemeldet` : ""}
        </span>
      </span>
      <span className={`shrink-0 rounded-control px-3 py-2 text-xs font-bold ${upcoming && !full ? "bg-primary text-primary-ink group-hover:bg-primary-hover" : "border border-line-strong text-muted group-hover:text-fg"}`}>
        {upcoming ? (full ? "Warteliste" : "Anmelden") : "Ansehen"}
      </span>
    </a>
  );
}

interface CommentEntry {
  id: string; bodyMarkdown: string; createdAt: string; author: Author; upvotes: number; votedByMe: boolean;
}

/**
 * Generische Kommentarfunktion für alle vier Community-Board-Eintragstypen —
 * Bewertungen auf eigene Kommentare wirken sich zusätzlich positiv auf das
 * Gehalt des aktuellen Community-Jobs des Kommentators aus (siehe
 * community-board-comment-service.ts).
 */
function CommentSection({
  entityType, entityId, currentUserId, open, onOpen, count, onCountChange, preview,
}: {
  entityType: FeedEntry["kind"]; entityId: string; currentUserId: string | undefined;
  open: boolean; onOpen: () => void; count: number; onCountChange: (n: number) => void;
  preview: NonNullable<FeedEntry["latestComments"]>;
}) {
  const [comments, setComments] = useState<CommentEntry[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api<{ comments: CommentEntry[] }>(`/api/community-board/comments?entityType=${entityType}&entityId=${entityId}`);
      setComments(data.comments);
      onCountChange(data.comments.length);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kommentare konnten nicht geladen werden");
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten Aufklappen laden
  useEffect(() => { if (open && comments === null) load(); }, [open]);

  async function submit() {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      await api("/api/community-board/comments", {
        method: "POST", body: JSON.stringify({ entityType, entityId, bodyMarkdown: draft }),
      });
      setDraft("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kommentar fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function remove(commentId: string) {
    try {
      await api(`/api/community-board/comments/${commentId}`, { method: "DELETE" });
      setComments(prev => {
        const next = prev?.filter(c => c.id !== commentId) ?? prev;
        if (next) onCountChange(next.length);
        return next;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    }
  }

  // Eingeklappt: die zwei neuesten Kommentare als Vorschau + "Alle anzeigen"
  if (!open) {
    if (preview.length === 0) return null;
    return (
      <div className="space-y-1.5">
        {preview.map(c => (
          <p key={c.id} className="line-clamp-2 text-sm text-fg/90">
            <a href={`/profile/${c.author.id}`} className="mr-1.5 font-semibold text-fg hover:text-primary-fg">{authorLabel(c.author)}</a>
            {c.bodyMarkdown}
          </p>
        ))}
        <button type="button" onClick={onOpen} className="text-sm font-medium text-subtle hover:text-fg">
          {count > preview.length ? `Alle ${count} Kommentare anzeigen` : "Antworten"}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {comments === null ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 text-primary animate-spin" /></div>
      ) : (
        comments.map(c => (
          <div key={c.id} className="bg-surface-2 rounded-control p-2.5 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <a href={`/profile/${c.author.id}`} className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity">
                <RankedAvatar userId={c.author.id} src={c.author.image} alt={authorLabel(c.author)} size={20} />
                <StyledUserName userId={c.author.id} name={authorLabel(c.author)} className="text-sm font-semibold text-fg truncate" />
              </a>
              <span className="text-xs text-subtle shrink-0">{formatBerlinDate(c.createdAt)}</span>
            </div>
            <p className="text-sm text-fg/90 whitespace-pre-wrap">{c.bodyMarkdown}</p>
            <div className="flex items-center gap-2">
              <UpvoteButton votedByMe={c.votedByMe} upvotes={c.upvotes}
                onVote={added => api(`/api/community-board/comments/${c.id}/vote`, { method: added ? "POST" : "DELETE" })}
                onDone={load} label="Kommentar" />
              {c.author.id === currentUserId && (
                <>
                  <DisputeTrigger kind="communityBoardCommentVote" fetchUrl={`/api/community-board/comments/${c.id}/votes`} listKey="votes" />
                  <button onClick={() => remove(c.id)} title="Kommentar löschen" aria-label="Kommentar löschen"
                    className="inline-flex items-center gap-1 text-xs text-subtle hover:text-danger transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))
      )}

      {currentUserId && (
        <div className="flex items-center gap-2">
          <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Kommentar schreiben…" autoFocus
            onKeyDown={e => { if (e.key === "Enter") submit(); }}
            className="flex-1 min-w-0 min-h-10 bg-surface-2 border border-line rounded-control px-3 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary" />
          <Button size="sm" loading={busy} disabled={!draft.trim()} icon={<Send className="w-3.5 h-3.5" />} onClick={submit}>Senden</Button>
        </div>
      )}
    </div>
  );
}

const GUIDE_PREVIEW_CHARS = 420;

/** Coach-Anleitung: Text bei Länge eingeklappt, Daumen-hoch wie bei Berichten, Anfechten für den Autor. */
function GuideBody({ entry }: { entry: FeedEntry }) {
  const [expanded, setExpanded] = useState(false);
  const text = entry.description ?? "";
  const long = text.length > GUIDE_PREVIEW_CHARS;
  return (
    <>
      {entry.game && <GameCover game={entry.game} className="w-full h-32" rounded="rounded-lg" fallbackVariant="plain" />}
      <p className="text-sm font-semibold text-fg">{entry.title}</p>
      {long && !expanded
        ? <p className="text-xs text-muted whitespace-pre-line">{plainExcerpt(text, GUIDE_PREVIEW_CHARS)}</p>
        : <MarkdownLite text={text} className="text-xs text-muted" />}
      {long && (
        <button onClick={() => setExpanded(v => !v)} className="text-xs text-primary hover:text-primary-fg transition-colors">
          {expanded ? "Weniger anzeigen" : "Ganze Anleitung lesen"}
        </button>
      )}
    </>
  );
}

function DisputeTrigger({ kind, fetchUrl, listKey, label }: { kind: DisputeKind; fetchUrl: string; listKey: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {label ? (
        <button type="button" role="menuitem" onClick={() => setOpen(true)} className={MENU_ITEM}>
          <Flag className="size-4" /> {label}
        </button>
      ) : (
        <button onClick={() => setOpen(true)} title="Bewertungen ansehen/anfechten"
          className="inline-flex items-center gap-1 text-xs text-subtle hover:text-coin transition-colors">
          <Flag className="w-3 h-3" />
        </button>
      )}
      <DisputeVotesModal open={open} onClose={() => setOpen(false)} kind={kind} fetchUrl={fetchUrl} listKey={listKey} />
    </>
  );
}

// Daumen-hoch: deutlich als Knopf erkennbar (Teal-Rand + Teal-Text), nach dem Klick gefüllt.
const THUMB_ON = "bg-primary border-primary text-primary-ink";
const THUMB_OFF = "bg-primary/10 border-primary/40 text-primary-fg hover:bg-primary/20 hover:border-primary";

function UpvoteButton({
  votedByMe, upvotes, onVote, onDone, label, icon,
}: {
  votedByMe: boolean; upvotes: number; onVote: (added: boolean) => Promise<unknown>;
  onDone: () => void; label: string; icon?: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      await onVote(!votedByMe);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bewertung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={toggle} disabled={busy} title={votedByMe ? `${label}: Daumen zurücknehmen` : `${label}: Daumen hoch`} aria-pressed={votedByMe}
      className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all duration-150 active:scale-95 disabled:opacity-60 ${votedByMe ? THUMB_ON : THUMB_OFF} max-lg:min-h-10`}>
      {icon ?? <ThumbsUp className={`w-4 h-4 ${votedByMe ? "fill-current" : ""}`} />}
      <span className="tabular-nums font-semibold">{upvotes}</span>
      {!votedByMe && <span className="hidden sm:inline">Daumen hoch</span>}
    </button>
  );
}

/** Ideen: "Unterstützen" mit einem Klick (Hauptsignal). Ab IDEA_SUPPORT_THRESHOLD Unterstützern prüft das Team. */
/** Event-Vorschlag: "Ich wäre dabei" */
function InterestButton({ proposalId, on: initialOn, count, disabled, onDone }: { proposalId: string; on: boolean; count: number; disabled: boolean; onDone: () => void }) {
  const [on, setOn] = useState(initialOn);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    const next = !on;
    setOn(next); setN(c => c + (next ? 1 : -1)); setBusy(true);
    try {
      await api(`/api/event-proposals/${proposalId}/interest`, { method: "POST", body: JSON.stringify({ on: next }) });
      onDone();
    } catch (err) {
      setOn(!next); setN(c => c + (next ? -1 : 1));
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={toggle} disabled={busy || disabled} aria-pressed={on}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-default ${
        on ? "border-success bg-success text-canvas" : "border-success/40 bg-success-soft text-success hover:border-success"
      }`}>
      <span aria-hidden>🙋</span> <span className="tabular-nums">{n}</span> <span className="max-sm:sr-only">{on ? "Du bist dabei" : "Ich wäre dabei"}</span>
    </button>
  );
}

/** Event-Vorschlag: Inhalt, Wunschtermin, wer dabei wäre, und der Weg zum Event ("Ich organisiere das") */
function ProposalBody({ entry, currentUserId, onChanged }: { entry: FeedEntry; currentUserId: string | undefined; onChanged: () => void }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const status = entry.proposalStatus ?? "OPEN";
  const iOrganize = entry.organizer?.id === currentUserId;
  const people = entry.interestedPeople ?? [];

  async function organize() {
    setBusy(true);
    try {
      await api(`/api/event-proposals/${entry.id}/organize`, { method: "POST" });
      router.push(`/events/verwalten/neu?mode=event&vorschlag=${entry.id}`);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); setBusy(false); }
  }
  async function release() {
    setBusy(true);
    try { await api(`/api/event-proposals/${entry.id}/organize`, { method: "DELETE" }); onChanged(); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        {status === "SCHEDULED"
          ? <Badge tone="success">Event steht</Badge>
          : entry.organizer
            ? <Badge tone="info">{iOrganize ? "Du organisierst das" : `${entry.organizer.name} organisiert das`}</Badge>
            : <Badge tone="warning">Sucht jemanden, der organisiert</Badge>}
        {entry.preferredTime && <span className="text-xs text-subtle">Wunschtermin: {entry.preferredTime}</span>}
      </div>
      <p className="text-base font-extrabold leading-snug text-fg">{entry.title}</p>
      {entry.game && (
        <div className="flex items-center gap-2.5">
          <GameCover game={entry.game} className="h-10 w-16 shrink-0" rounded="rounded-[0.5rem]" fallbackVariant="plain" />
          <span className="text-sm font-semibold text-fg/90">{entry.game}</span>
        </div>
      )}
      {entry.description && <MarkdownLite text={entry.description} className="text-sm text-fg/90" />}
      {people.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2">
            {people.slice(0, 8).map(p => <RankedAvatar key={p.id} userId={p.id} src={p.image} alt={p.name} size={24} />)}
          </div>
          <span className="text-xs text-subtle">{entry.interested} {entry.interested === 1 ? "wäre" : "wären"} dabei</span>
        </div>
      )}
      {status !== "SCHEDULED" && currentUserId && (
        <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface-2 p-2.5">
          {iOrganize ? (
            <>
              <a href={`/events/verwalten/neu?mode=event&vorschlag=${entry.id}`} className={buttonClasses("primary", "sm")}>Event anlegen</a>
              <button type="button" disabled={busy} onClick={release} className={buttonClasses("ghost", "sm")}>Organisation abgeben</button>
            </>
          ) : !entry.organizer ? (
            <>
              <span className="text-sm text-muted">Lust, das auf die Beine zu stellen?</span>
              <button type="button" disabled={busy} onClick={organize} className={buttonClasses("primary", "sm", "ml-auto")}>Ich organisiere das</button>
            </>
          ) : (
            <span className="text-sm text-muted">Sobald das Event steht, bekommen alle, die dabei wären, den Link zur Anmeldung.</span>
          )}
        </div>
      )}
    </>
  );
}

function SupportButton({ ideaId, supported, count, disabled, onDone }: { ideaId: string; supported: boolean; count: number; disabled: boolean; onDone: () => void }) {
  const [on, setOn] = useState(supported);
  const [n, setN] = useState(count);
  const [busy, setBusy] = useState(false);
  async function toggle() {
    const next = !on;
    setOn(next); setN(c => c + (next ? 1 : -1)); setBusy(true);
    try {
      await api(`/api/community-jobs/ideas/${ideaId}/interest`, { method: "POST", body: JSON.stringify({ kind: "SUPPORT", on: next }) });
      onDone();
    } catch (err) {
      setOn(!next); setN(c => c + (next ? -1 : 1));
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }
  return (
    <button type="button" onClick={toggle} disabled={busy || disabled} aria-pressed={on}
      title={disabled ? "Eigene Ideen kannst du nicht unterstützen" : on ? "Unterstützung zurücknehmen" : "Ich will das auch"}
      className={`inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-all active:scale-95 disabled:cursor-default ${
        on ? "border-primary bg-primary text-primary-ink" : "border-primary/40 bg-primary/10 text-primary-fg hover:bg-primary/20"
      }`}>
      <ThumbsUp className="size-4" /> <span className="tabular-nums">{n}</span> <span className="max-sm:sr-only">{on ? "Unterstützt" : "Unterstützen"}</span>
    </button>
  );
}

function IdeaVoteButton({ ideaId, votedByMe, canRevote, voteCount, avgStars, onDone }: { ideaId: string; votedByMe: boolean; canRevote?: boolean; voteCount: number; avgStars?: number; onDone: () => void }) {
  const avg = voteCount > 0 && avgStars ? ` · Ø ${avgStars.toLocaleString("de-DE", { maximumFractionDigits: 1 })}` : "";
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(5);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      await api(`/api/community-jobs/ideas/${ideaId}/vote`, { method: "POST", body: JSON.stringify({ stars, reason }) });
      toast.success("Bewertung abgegeben");
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bewertung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (votedByMe && !canRevote) {
    return <span className={`${ACTION} text-success`}><Star className="size-4 fill-current" /> Bewertet · {voteCount}{avg}</span>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${ACTION} border border-coin/30 text-coin hover:bg-coin-soft`}>
        <Star className="size-4" /> {canRevote ? "Neu bewerten" : "Bewerten"} <span className="tabular-nums text-subtle">{voteCount}{avg}</span>
      </button>
    );
  }
  return (
    <div className="basis-full space-y-2 bg-surface-2 rounded-control p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" onClick={() => setStars(n)} aria-label={`${n} Sterne`} className="grid size-10 place-items-center">
            <Star className={`size-6 ${n <= stars ? "text-coin fill-current" : "text-line-strong"}`} />
          </button>
        ))}
      </div>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Begründung (privat, nur Autor + Admin sehen sie)" rows={2}
        className="w-full bg-surface-2 border border-line rounded-control px-3 py-2 text-xs text-fg placeholder:text-subtle focus:outline-none focus:border-primary resize-none" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
        <Button size="sm" loading={busy} disabled={!reason.trim()} onClick={submit}>Absenden</Button>
      </div>
    </div>
  );
}
