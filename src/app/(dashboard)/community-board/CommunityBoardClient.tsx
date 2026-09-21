"use client";
import JobBadge from "@/components/community-jobs/JobBadge";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { ThumbsUp, Loader2, Star, ImagePlus, Megaphone, Flag, MessageCircle, Send, Trash2, BookOpen, CalendarDays, Clock, Smile } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import DisputeVotesModal, { type DisputeKind } from "@/components/community-jobs/DisputeVotesModal";
import RankedAvatar from "@/components/RankedAvatar";
import { isVideoUrl } from "@/lib/upload-limits";
import MarkdownLite, { EmojiText } from "@/components/community-jobs/MarkdownLite";
import { plainExcerpt } from "@/lib/report-text";
import EmojiPanel from "@/components/community-jobs/EmojiPicker";
import ReportEditor from "@/components/community-jobs/ReportEditor";
import { Modal } from "@/components/ui/Modal";
import IdeaBody from "@/components/community-jobs/IdeaCard";
import IdeaFromButton from "@/components/community-jobs/IdeaFromButton";
import { mentionToken } from "@/lib/report-mentions";
import { REPORT_CATEGORIES, reportCategoryLabel } from "@/lib/report-categories";
import { formatBerlinDate } from "@/lib/time";

interface Author { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number }
interface SubEntity { id: string; author: Author; upvotes: number; url?: string; caption?: string }
export interface FeedEntry {
  kind: "report" | "asset" | "marketing_post" | "idea" | "guide";
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
  event?: { id: string; title: string } | null;
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
  referencedMarketingPost?: SubEntity | null;
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
  draftEventId?: string | null;
  interestParticipate?: number;
  interestHelp?: number;
  myInterests?: string[];
  imageUrl?: string | null;
  asset?: { url: string } | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

/** Macht http(s)-Links in Beitragstexten klickbar (öffnet extern, ohne Referrer/Opener). */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) => /^https?:\/\//.test(part)
        ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-teal-300 hover:text-teal-200 underline underline-offset-2 break-all">{part}</a>
        : <span key={i}>{part}</span>)}
    </>
  );
}

/** Vorbelegung des Bericht-Editors, wenn ein Journalist direkt zu einem Foto/Werbe-Post schreibt. */
interface WriteAboutPreset {
  coverAssetId?: string; postId?: string; eventId?: string; title: string; body: string;
}

const CHIP_ON = "bg-teal-500 text-black border-teal-500";
const CHIP_OFF = "bg-white/[0.04] text-gray-300 border-white/10 hover:text-white";

function authorLabel(a: Author): string {
  return a.username ?? a.name ?? "Unbekannt";
}

export default function CommunityBoardClient() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);
  const [isJournalist, setIsJournalist] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [writeAbout, setWriteAbout] = useState<WriteAboutPreset | null>(null);

  useEffect(() => {
    // Nur aktive Journalisten sehen "Bericht ergänzen".
    api<{ activeMembership: { jobKey: string } | null }>("/api/community-jobs")
      .then(d => setIsJournalist(d.activeMembership?.jobKey === "journalist"))
      .catch(() => {});
  }, []);

  async function reload() {
    try {
      const data = await api<{ feed: FeedEntry[] }>("/api/community-board?limit=30");
      setFeed(data.feed);
    } catch {
      toast.error("Community-Board konnte nicht geladen werden");
    }
  }

  useEffect(() => { reload(); }, []);

  if (feed === null) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>;
  }
  if (feed.length === 0) {
    return <p className="text-sm text-gray-600 text-center py-12">Noch keine Community-Job-Beiträge.</p>;
  }

  const usedCategories = REPORT_CATEGORIES.filter(c => feed.some(e => e.kind === "report" && e.category === c.key));
  const visibleFeed = category ? feed.filter(e => e.kind === "report" && e.category === category) : feed;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <a href="/community-board/roadmap" className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors">🚀 Roadmap &amp; Top-Ideen</a>
      </div>
      {usedCategories.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Berichte nach Kategorie filtern">
          <button role="tab" aria-selected={category === null} onClick={() => setCategory(null)}
            className={`text-[11px] font-semibold rounded-full px-3 py-1 border transition-colors ${category === null ? CHIP_ON : CHIP_OFF}`}>Alle</button>
          {usedCategories.map(c => (
            <button key={c.key} role="tab" aria-selected={category === c.key} onClick={() => setCategory(category === c.key ? null : c.key)}
              className={`text-[11px] font-semibold rounded-full px-3 py-1 border transition-colors ${category === c.key ? CHIP_ON : CHIP_OFF}`}>{c.label}</button>
          ))}
        </div>
      )}
      {/* Ab lg mehrspaltiger Masonry-Flow statt einer einzelnen langen Kette —
          die Karten haben durch Bilder/Contributions/Idea-Text stark unterschiedliche
          Höhen, CSS-Columns verteilen das ohne JS-Messen sinnvoll auf die Breite. */}
      <div className="columns-1 lg:columns-2 xl:columns-3 gap-4">
        {visibleFeed.map(entry => <FeedCard key={`${entry.kind}-${entry.id}`} entry={entry} currentUserId={currentUserId} isJournalist={isJournalist} onChanged={reload} onWriteAbout={setWriteAbout} />)}
      </div>

      <Modal open={!!writeAbout} onClose={() => setWriteAbout(null)} title="Bericht schreiben" size="lg">
        {writeAbout && (
          <ReportEditor eventId={writeAbout.eventId} presetCoverAssetId={writeAbout.coverAssetId} presetPostId={writeAbout.postId}
            prefill={{ title: writeAbout.title, body: writeAbout.body }} onDone={() => { setWriteAbout(null); reload(); }} />
        )}
      </Modal>
    </div>
  );
}

/** Bericht im Board: Auszug + "Bericht lesen" (lädt den vollen Text nach), Bewertungen, Ergänzungen (schreiben/bearbeiten/löschen). */
function ReportBody({ entry, currentUserId, isJournalist, onChanged, onReportPage }: {
  entry: FeedEntry; currentUserId: string | undefined; isJournalist: boolean; onChanged: () => void; onReportPage: boolean;
}) {
  const [full, setFull] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Auf der eigenen Bericht-Seite direkt den vollen Text laden.
  useEffect(() => {
    if (onReportPage) toggleRead();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- nur beim Öffnen

  function copyLink() {
    navigator.clipboard?.writeText(`${window.location.origin}/community-board/report/${entry.id}`)
      .then(() => toast.success("Link kopiert"))
      .catch(() => toast.error("Link konnte nicht kopiert werden"));
  }

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
      {onReportPage
        ? <h1 className="text-lg font-bold text-white">{entry.title}</h1>
        : <a href={`/community-board/report/${entry.id}`} className="block text-sm font-semibold text-white hover:text-teal-300 transition-colors">{entry.title}</a>}
      {(categoryLabel || entry.series || entry.event || entry.readingMinutes) && (
        <div className="flex items-center gap-2 flex-wrap text-[10px] text-gray-500">
          {categoryLabel && <Badge tone="info">{categoryLabel}</Badge>}
          {entry.series && <Badge tone="neutral"><BookOpen className="w-2.5 h-2.5" /> Reihe: {entry.series.title}</Badge>}
          {entry.event && (
            <a href={`/tournament/${entry.event.id}`} className="inline-flex items-center gap-1 hover:text-teal-300 transition-colors">
              <CalendarDays className="w-3 h-3" /> {entry.event.title}
            </a>
          )}
          {entry.readingMinutes ? <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> {entry.readingMinutes} Min. Lesezeit</span> : null}
        </div>
      )}
      {entry.editedAt && (
        <p className="text-[10px] text-gray-500">Korrigiert am {formatBerlinDate(entry.editedAt)}{entry.lastEditNote ? ` — ${entry.lastEditNote}` : ""}</p>
      )}
      {entry.coverAsset && (
        // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host
        <img src={entry.coverAsset.url} alt="" className="w-full h-auto rounded-lg" />
      )}

      {open && full !== null
        ? <MarkdownLite text={full} className="text-xs" />
        : entry.excerpt ? <p className="text-xs text-gray-400"><EmojiText text={entry.excerpt} /></p> : null}
      <button onClick={toggleRead} disabled={loading} aria-expanded={open}
        className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors inline-flex items-center gap-1">
        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        {open ? "Bericht einklappen" : "Ganzen Bericht lesen"}
      </button>
      <button onClick={copyLink} className="ml-3 text-[11px] text-gray-500 hover:text-teal-300 transition-colors">Link kopieren</button>

      {entry.seriesParts && entry.seriesParts.length > 1 && (
        <div className="rounded-lg bg-white/[0.03] p-2.5 space-y-1">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Reihe: {entry.series?.title}</p>
          <ol className="list-decimal pl-5 text-xs space-y-0.5">
            {entry.seriesParts.map(part => (
              <li key={part.id} className={part.id === entry.id ? "text-white font-medium" : "text-gray-400"}>
                {part.id === entry.id ? part.title : <a href={`/community-board/report/${part.id}`} className="hover:text-teal-300 transition-colors">{part.title}</a>}
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
          onVote={added => api(`/api/community-jobs/reports/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
          onDone={onChanged} label="Bericht" />
        {entry.author.id === currentUserId && (
          <DisputeTrigger kind="jobReportVote" fetchUrl={`/api/community-jobs/reports/${entry.id}/votes`} listKey="votes" />
        )}
        {entry.coverAsset && (
          <>
            <UpvoteButton votedByMe={false} upvotes={entry.coverAsset.upvotes}
              onVote={added => api(`/api/community-jobs/media/${entry.coverAsset!.id}/vote`, { method: added ? "POST" : "DELETE" })}
              onDone={onChanged} label={`Bild von ${authorLabel(entry.coverAsset.author)}`} icon={<ImagePlus className="w-3 h-3" />} />
            {entry.coverAsset.author.id === currentUserId && (
              <DisputeTrigger kind="jobMediaAssetVote" fetchUrl={`/api/community-jobs/media/${entry.coverAsset.id}/votes`} listKey="votes" />
            )}
          </>
        )}
        {entry.referencedMarketingPost && (
          <>
            <UpvoteButton votedByMe={false} upvotes={entry.referencedMarketingPost.upvotes}
              onVote={added => api(`/api/community-jobs/marketing-posts/${entry.referencedMarketingPost!.id}/vote`, { method: added ? "POST" : "DELETE" })}
              onDone={onChanged} label={`Post von ${authorLabel(entry.referencedMarketingPost.author)}`} icon={<Megaphone className="w-3 h-3" />} />
            {entry.referencedMarketingPost.author.id === currentUserId && (
              <DisputeTrigger kind="marketingPostVote" fetchUrl={`/api/community-jobs/marketing-posts/${entry.referencedMarketingPost.id}/votes`} listKey="votes" />
            )}
          </>
        )}
      </div>

      {entry.contributions && entry.contributions.length > 0 && (
        <div className="pl-3 border-l-2 border-white/10 space-y-3">
          {entry.contributions.map(c => (
            <ContributionItem key={c.id} reportId={entry.id} contribution={c} currentUserId={currentUserId} onChanged={onChanged} />
          ))}
        </div>
      )}
      {isJournalist && <ContributionForm reportId={entry.id} onDone={onChanged} />}
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
      <p className="text-[11px] text-gray-500">Ergänzung von {authorLabel(c.author)}<JobBadge userId={c.author.id} variant="compact" className="ml-1" /></p>
      {editing ? (
        <div className="space-y-1.5">
          <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={4} maxLength={5000}
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500/40 resize-y" />
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
                <button onClick={() => setEditing(true)} className="text-[10px] text-gray-600 hover:text-teal-400 transition-colors">Bearbeiten</button>
                <button onClick={remove} aria-label="Ergänzung löschen" className="text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Aktive Journalisten dürfen jeden Bericht ergänzen — ohne Freigabe des Autors. */
function ContributionForm({ reportId, onDone }: { reportId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
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
      setText(""); setOpen(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ergänzung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="text-[11px] text-gray-500 hover:text-teal-400 transition-colors">
        + Bericht ergänzen
      </button>
    );
  }
  return (
    <div className="space-y-1.5">
      <textarea ref={areaRef} value={text} onChange={e => setText(e.target.value)} rows={4} maxLength={5000} autoFocus
        placeholder="Deine Ergänzung (Markdown möglich: **fett**, - Liste, [Link](https://…))"
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-y" />
      {emojiOpen && <EmojiPanel onPick={insertEmoji} onClose={() => setEmojiOpen(false)} />}
      <div className="flex items-center justify-between gap-1.5">
        <button onClick={() => setEmojiOpen(v => !v)} title="Emoji einfügen" aria-label="Emoji einfügen" aria-expanded={emojiOpen}
          className={`p-1.5 rounded hover:text-white hover:bg-white/[0.06] transition-colors ${emojiOpen ? "text-teal-300" : "text-gray-400"}`}>
          <Smile className="w-4 h-4" />
        </button>
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setText(""); setEmojiOpen(false); }}>Abbrechen</Button>
          <Button size="sm" loading={busy} disabled={!text.trim()} icon={<Send className="w-3.5 h-3.5" />} onClick={submit}>Veröffentlichen</Button>
        </div>
      </div>
    </div>
  );
}

export function FeedCard({ entry, currentUserId, isJournalist, onChanged, expandReport = false, onWriteAbout }: {
  entry: FeedEntry; currentUserId: string | undefined; isJournalist: boolean; onChanged: () => void; expandReport?: boolean;
  onWriteAbout?: (preset: WriteAboutPreset) => void;
}) {
  return (
    <div className="glass card-shine rounded-2xl p-4 space-y-3 mb-3 break-inside-avoid">
      <div className="flex items-center justify-between">
        <a href={`/profile/${entry.author.id}`} className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity">
          <RankedAvatar rankPoints={entry.author.rankPoints} src={entry.author.image} alt={authorLabel(entry.author)} size={28} />
          <div className="min-w-0">
            <span className="flex items-center gap-1.5 min-w-0"><span className="text-xs font-semibold text-white truncate">{authorLabel(entry.author)}</span><JobBadge userId={entry.author.id} /></span>
            <span className="text-[10px] text-gray-600">{formatBerlinDate(entry.publishedAt)}</span>
          </div>
        </a>
        {entry.kind === "marketing_post" && (
          <Badge tone={entry.adminConfirmedPosted ? "success" : "neutral"}>
            {entry.adminConfirmedPosted ? "Bestätigt gepostet" : "Post"}
          </Badge>
        )}
        {entry.kind === "idea" && entry.status === "CLOSED" && <Badge tone="neutral">Abstimmung beendet</Badge>}
        {entry.kind === "guide" && <Badge tone="info"><BookOpen className="w-2.5 h-2.5" /> Anleitung{entry.game ? ` · ${entry.game}` : ""}</Badge>}
      </div>

      {entry.kind === "report" && <ReportBody entry={entry} currentUserId={currentUserId} isJournalist={isJournalist} onChanged={onChanged} onReportPage={expandReport} />}
      {entry.kind === "report" && <IdeaFromButton prefill={{ title: `Idee zu \u201e${entry.title ?? "Bericht"}\u201c`, reportId: entry.id }} />}

      {entry.kind === "asset" && (
        <>
          {entry.caption && <p className="text-sm text-gray-300 whitespace-pre-line"><Linkified text={entry.caption} /></p>}
          {entry.url && (
            isVideoUrl(entry.url)
              ? <video src={entry.url} controls className="w-full h-auto rounded-lg" />
              // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host
              : <img src={entry.url} alt="" className="w-full h-auto rounded-lg" />
          )}
          <div className="flex items-center gap-2">
            <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
              onVote={added => api(`/api/community-jobs/media/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
              onDone={onChanged} label="Asset" />
            {entry.author.id === currentUserId && (
              <DisputeTrigger kind="jobMediaAssetVote" fetchUrl={`/api/community-jobs/media/${entry.id}/votes`} listKey="votes" />
            )}
            {isJournalist && onWriteAbout && (
              <button onClick={() => {
                const video = isVideoUrl(entry.url);
                onWriteAbout({
                  // Ein Video kann kein Titelbild sein — dann als Link in den Text.
                  coverAssetId: video ? undefined : entry.id, eventId: entry.eventId ?? undefined,
                  title: (entry.caption ?? "").slice(0, 100),
                  body: `${video && entry.url ? `▶ ${entry.url}\n\n` : ""}Zum Bild von ${mentionToken(authorLabel(entry.author), entry.author.id)}: …`,
                });
              }} className="text-[11px] text-gray-500 hover:text-teal-300 transition-colors">Bericht dazu schreiben</button>
            )}
          </div>
        </>
      )}

      {entry.kind === "marketing_post" && (
        <>
          <p className="text-sm text-gray-300 whitespace-pre-line"><Linkified text={entry.caption ?? ""} /></p>
          {(entry.imageUrl || entry.asset?.url) && (
            // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host
            <img src={entry.imageUrl ?? entry.asset!.url} alt="" className="w-full h-auto rounded-lg" />
          )}
          <div className="flex items-center gap-2">
            <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
              onVote={added => api(`/api/community-jobs/marketing-posts/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
              onDone={onChanged} label="Post" />
            {entry.author.id === currentUserId && (
              <DisputeTrigger kind="marketingPostVote" fetchUrl={`/api/community-jobs/marketing-posts/${entry.id}/votes`} listKey="votes" />
            )}
            {isJournalist && onWriteAbout && (
              <button onClick={() => onWriteAbout({
                postId: entry.id, eventId: entry.event?.id,
                title: entry.event ? `Zur Aktion: ${entry.event.title}` : "",
                body: `Zur Werbeaktion von ${mentionToken(authorLabel(entry.author), entry.author.id)}: …`,
              })} className="text-[11px] text-gray-500 hover:text-teal-300 transition-colors">Bericht dazu schreiben</button>
            )}
          </div>
        </>
      )}

      {entry.kind === "idea" && (
        <IdeaBody entry={entry} currentUserId={currentUserId} onChanged={onChanged} onIdeaPage={expandReport}
          actions={(
            <>
              <IdeaVoteButton ideaId={entry.id} votedByMe={entry.votedByMe} canRevote={entry.canRevote} voteCount={entry.voteCount ?? 0} onDone={onChanged} />
              {entry.author.id === currentUserId && (
                <DisputeTrigger kind="communityIdeaVote" fetchUrl={`/api/community-jobs/ideas/${entry.id}/votes`} listKey="votes" />
              )}
            </>
          )} />
      )}

      {entry.kind === "guide" && <GuideBody entry={entry} currentUserId={currentUserId} onChanged={onChanged} />}

      <CommentSection entityType={entry.kind} entityId={entry.id} currentUserId={currentUserId} />
    </div>
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
  entityType, entityId, currentUserId,
}: { entityType: FeedEntry["kind"]; entityId: string; currentUserId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const [comments, setComments] = useState<CommentEntry[] | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api<{ comments: CommentEntry[] }>(`/api/community-board/comments?entityType=${entityType}&entityId=${entityId}`);
      setComments(data.comments);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Kommentare konnten nicht geladen werden");
    }
  }

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
      setComments(prev => prev?.filter(c => c.id !== commentId) ?? prev);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
    }
  }

  return (
    <div className="pt-2 border-t border-white/10">
      <button onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-white transition-colors">
        <MessageCircle className="w-3.5 h-3.5" />
        {comments ? `${comments.length} Kommentar${comments.length === 1 ? "" : "e"}` : "Kommentare"}
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {comments === null ? (
            <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 text-teal-400 animate-spin" /></div>
          ) : (
            comments.map(c => (
              <div key={c.id} className="bg-white/[0.03] rounded-lg p-2 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <a href={`/profile/${c.author.id}`} className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity">
                    <RankedAvatar rankPoints={c.author.rankPoints} src={c.author.image} alt={authorLabel(c.author)} size={16} />
                    <span className="text-[11px] font-medium text-white truncate">{authorLabel(c.author)}</span><JobBadge userId={c.author.id} variant="compact" />
                  </a>
                  <span className="text-[10px] text-gray-600 shrink-0">{formatBerlinDate(c.createdAt)}</span>
                </div>
                <p className="text-xs text-gray-300 whitespace-pre-wrap">{c.bodyMarkdown}</p>
                <div className="flex items-center gap-2">
                  <UpvoteButton votedByMe={c.votedByMe} upvotes={c.upvotes}
                    onVote={added => api(`/api/community-board/comments/${c.id}/vote`, { method: added ? "POST" : "DELETE" })}
                    onDone={load} label="Kommentar" />
                  {c.author.id === currentUserId && (
                    <>
                      <DisputeTrigger kind="communityBoardCommentVote" fetchUrl={`/api/community-board/comments/${c.id}/votes`} listKey="votes" />
                      <button onClick={() => remove(c.id)} title="Kommentar löschen"
                        className="inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}

          <div className="flex items-center gap-2">
            <input value={draft} onChange={e => setDraft(e.target.value)} placeholder="Kommentar schreiben…"
              onKeyDown={e => { if (e.key === "Enter") submit(); }}
              className="flex-1 min-w-0 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
            <Button size="sm" loading={busy} disabled={!draft.trim()} icon={<Send className="w-3.5 h-3.5" />} onClick={submit}>Senden</Button>
          </div>
        </div>
      )}
    </div>
  );
}

const GUIDE_PREVIEW_CHARS = 420;

/** Coach-Anleitung: Text bei Länge eingeklappt, Daumen-hoch wie bei Berichten, Anfechten für den Autor. */
function GuideBody({ entry, currentUserId, onChanged }: { entry: FeedEntry; currentUserId: string | undefined; onChanged: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const text = entry.description ?? "";
  const long = text.length > GUIDE_PREVIEW_CHARS;
  return (
    <>
      <p className="text-sm font-semibold text-white">{entry.title}</p>
      {long && !expanded
        ? <p className="text-xs text-gray-400 whitespace-pre-line">{plainExcerpt(text, GUIDE_PREVIEW_CHARS)}</p>
        : <MarkdownLite text={text} className="text-xs text-gray-400" />}
      {long && (
        <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-teal-400 hover:text-teal-300 transition-colors">
          {expanded ? "Weniger anzeigen" : "Ganze Anleitung lesen"}
        </button>
      )}
      <div className="flex items-center gap-2">
        <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
          onVote={added => api(`/api/community-jobs/coach/guides/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
          onDone={onChanged} label="Anleitung" />
        {entry.author.id === currentUserId && (
          <DisputeTrigger kind="coachGuideVote" fetchUrl={`/api/community-jobs/coach/guides/${entry.id}/votes`} listKey="votes" />
        )}
      </div>
    </>
  );
}

function DisputeTrigger({ kind, fetchUrl, listKey }: { kind: DisputeKind; fetchUrl: string; listKey: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} title="Bewertungen ansehen/anfechten"
        className="inline-flex items-center gap-1 text-[10px] text-gray-600 hover:text-amber-400 transition-colors">
        <Flag className="w-3 h-3" />
      </button>
      <DisputeVotesModal open={open} onClose={() => setOpen(false)} kind={kind} fetchUrl={fetchUrl} listKey={listKey} />
    </>
  );
}

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
    <button onClick={toggle} disabled={busy} title={label}
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition-colors ${
        votedByMe ? "bg-teal-500/10 border-teal-500/30 text-teal-300" : "bg-white/[0.03] border-white/10 text-gray-500 hover:text-white"
      }`}>
      {icon ?? <ThumbsUp className="w-3 h-3" />} {upvotes}
    </button>
  );
}

function IdeaVoteButton({ ideaId, votedByMe, canRevote, voteCount, onDone }: { ideaId: string; votedByMe: boolean; canRevote?: boolean; voteCount: number; onDone: () => void }) {
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
    return <Badge tone="success"><Star className="w-2.5 h-2.5" /> Bewertet ({voteCount} Stimmen)</Badge>;
  }
  if (!open) {
    return <Button size="sm" variant="outline" icon={<Star className="w-3.5 h-3.5" />} onClick={() => setOpen(true)}>{canRevote ? "Neu bewerten (überarbeitet)" : `Bewerten (${voteCount})`}</Button>;
  }
  return (
    <div className="space-y-2 bg-white/[0.03] rounded-lg p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setStars(n)}>
            <Star className={`w-4 h-4 ${n <= stars ? "text-amber-400 fill-amber-400" : "text-gray-700"}`} />
          </button>
        ))}
      </div>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Begründung (privat, nur Autor + Admin sehen sie)" rows={2}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none" />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Abbrechen</Button>
        <Button size="sm" loading={busy} disabled={!reason.trim()} onClick={submit}>Absenden</Button>
      </div>
    </div>
  );
}
