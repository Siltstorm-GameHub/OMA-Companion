"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ThumbsUp, Loader2, Star, ImagePlus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface Author { id: string; username: string | null; name: string | null }
interface SubEntity { id: string; author: Author; upvotes: number; url?: string; caption?: string }
interface FeedEntry {
  kind: "report" | "asset" | "marketing_post" | "idea";
  id: string;
  publishedAt: string;
  title?: string;
  caption?: string;
  description?: string;
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
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

function authorLabel(a: Author): string {
  return a.username ?? a.name ?? "Unbekannt";
}

export default function CommunityBoardClient() {
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);

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

  return (
    <div className="space-y-3">
      {feed.map(entry => <FeedCard key={`${entry.kind}-${entry.id}`} entry={entry} onChanged={reload} />)}
    </div>
  );
}

function FeedCard({ entry, onChanged }: { entry: FeedEntry; onChanged: () => void }) {
  return (
    <div className="glass card-shine rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white">{authorLabel(entry.author)}</span>
          <span className="text-[10px] text-gray-600">{new Date(entry.publishedAt).toLocaleDateString("de-DE")}</span>
        </div>
        {entry.kind === "marketing_post" && (
          <Badge tone={entry.adminConfirmedPosted ? "success" : "neutral"}>
            {entry.adminConfirmedPosted ? "Bestätigt gepostet" : "Post"}
          </Badge>
        )}
        {entry.kind === "idea" && entry.status === "CLOSED" && <Badge tone="neutral">Abstimmung beendet</Badge>}
      </div>

      {entry.kind === "report" && (
        <>
          <p className="text-sm font-semibold text-white">{entry.title}</p>
          {entry.coverAsset && (
            // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host
            <img src={entry.coverAsset.url} alt="" className="w-full rounded-lg max-h-64 object-cover" />
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
              onVote={added => api(`/api/community-jobs/reports/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
              onDone={onChanged} label="Bericht" />
            {entry.coverAsset && (
              <UpvoteButton votedByMe={false} upvotes={entry.coverAsset.upvotes}
                onVote={added => api(`/api/community-jobs/media/${entry.coverAsset!.id}/vote`, { method: added ? "POST" : "DELETE" })}
                onDone={onChanged} label={`Bild von ${authorLabel(entry.coverAsset.author)}`} icon={<ImagePlus className="w-3 h-3" />} />
            )}
            {entry.referencedMarketingPost && (
              <UpvoteButton votedByMe={false} upvotes={entry.referencedMarketingPost.upvotes}
                onVote={added => api(`/api/community-jobs/marketing-posts/${entry.referencedMarketingPost!.id}/vote`, { method: added ? "POST" : "DELETE" })}
                onDone={onChanged} label={`Post von ${authorLabel(entry.referencedMarketingPost.author)}`} icon={<Megaphone className="w-3 h-3" />} />
            )}
          </div>
          {entry.contributions && entry.contributions.length > 0 && (
            <div className="pl-3 border-l-2 border-white/10 space-y-2">
              {entry.contributions.map(c => (
                <div key={c.id} className="space-y-1">
                  <p className="text-[11px] text-gray-500">Ergänzung von {authorLabel(c.author)}</p>
                  <p className="text-xs text-gray-300">{c.bodyMarkdown}</p>
                  <UpvoteButton votedByMe={false} upvotes={c.upvotes}
                    onVote={added => api(`/api/community-jobs/reports/${entry.id}/contributions/${c.id}/vote`, { method: added ? "POST" : "DELETE" })}
                    onDone={onChanged} label="Ergänzung" />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {entry.kind === "asset" && (
        <>
          {entry.caption && <p className="text-sm text-gray-300">{entry.caption}</p>}
          {entry.url && (
            // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host
            <img src={entry.url} alt="" className="w-full rounded-lg max-h-64 object-cover" />
          )}
          <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
            onVote={added => api(`/api/community-jobs/media/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
            onDone={onChanged} label="Asset" />
        </>
      )}

      {entry.kind === "marketing_post" && (
        <>
          <p className="text-sm text-gray-300">{entry.caption}</p>
          <UpvoteButton votedByMe={entry.votedByMe} upvotes={entry.upvotes ?? 0}
            onVote={added => api(`/api/community-jobs/marketing-posts/${entry.id}/vote`, { method: added ? "POST" : "DELETE" })}
            onDone={onChanged} label="Post" />
        </>
      )}

      {entry.kind === "idea" && (
        <>
          <p className="text-sm font-semibold text-white">{entry.title}</p>
          <p className="text-xs text-gray-400">{entry.description}</p>
          <IdeaVoteButton ideaId={entry.id} votedByMe={entry.votedByMe} voteCount={entry.voteCount ?? 0} onDone={onChanged} />
        </>
      )}
    </div>
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

function IdeaVoteButton({ ideaId, votedByMe, voteCount, onDone }: { ideaId: string; votedByMe: boolean; voteCount: number; onDone: () => void }) {
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

  if (votedByMe) {
    return <Badge tone="success"><Star className="w-2.5 h-2.5" /> Bewertet ({voteCount} Stimmen)</Badge>;
  }
  if (!open) {
    return <Button size="sm" variant="outline" icon={<Star className="w-3.5 h-3.5" />} onClick={() => setOpen(true)}>Bewerten ({voteCount})</Button>;
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
