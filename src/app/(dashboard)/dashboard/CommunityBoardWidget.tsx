"use client";
import JobBadge from "@/components/community-jobs/JobBadge";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { ImagePlus } from "@/components/icons";
import { ChevronRight } from "@/components/icons";
import { ThumbsUp, Newspaper, Megaphone, Lightbulb, Loader2, BookOpen } from "@/components/icons";
import { acc, type AccentName } from "@/lib/accentColors";
import RankedAvatar from "@/components/RankedAvatar";
import { isVideoUrl } from "@/lib/upload-limits";

/**
 * Social-Media-artiges Feed-Widget fürs Dashboard — dieselbe API wie die volle
 * Community-Board-Seite, nur die letzten paar Einträge. Horizontal scrollender
 * Story-/Post-Feed mit fester Zeilenhöhe, aber variabler Kartenbreite: Bild-Posts
 * behalten ihr echtes Seitenverhältnis (Hochformat schmaler, Querformat breiter),
 * Text-Posts richten sich nach der Caption-Länge — nur per min-/max-Width gedeckelt,
 * damit die Reihe nicht aus dem Ruder läuft. Kein JS-Messen nötig: die Breite
 * ergibt sich aus dem einzigen nicht-absolut-positionierten Kind (Bild bzw. Textblock).
 */

interface FeedEntry {
  kind: "report" | "asset" | "marketing_post" | "idea" | "guide";
  id: string;
  publishedAt: string;
  title?: string;
  caption?: string;
  url?: string; // Bild-URL bei kind="asset"
  author: { id: string; username: string | null; name: string | null; image: string | null; rankPoints: number };
  upvotes?: number;
  voteCount?: number;
  votedByMe?: boolean;
  coverAsset?: { url: string } | null;
  imageUrl?: string | null;
  asset?: { url: string } | null;
}

const KIND_ICON: Record<FeedEntry["kind"], typeof Newspaper> = {
  report: Newspaper, asset: ImagePlus, marketing_post: Megaphone, idea: Lightbulb, guide: BookOpen,
};

const KIND_ACCENT: Record<FeedEntry["kind"], AccentName> = {
  report: "teal", asset: "violet", marketing_post: "amber", idea: "rose", guide: "teal",
};

/** Endpunkt zum Daumen-Geben je Beitragsart. Ideen brauchen Sterne + Begründung, dort geht es über die Karte im Board. */
function voteUrl(e: FeedEntry): string | null {
  switch (e.kind) {
    case "report": return `/api/community-jobs/reports/${e.id}/vote`;
    case "asset": return `/api/community-jobs/media/${e.id}/vote`;
    case "marketing_post": return `/api/community-jobs/marketing-posts/${e.id}/vote`;
    case "guide": return `/api/community-jobs/coach/guides/${e.id}/vote`;
    default: return null;
  }
}

const THUMB_ON = "bg-teal-500 border-teal-500 text-black";
const THUMB_OFF = "bg-black/55 border-teal-500/50 text-teal-300 hover:bg-teal-500/20";

/** Daumen direkt auf der Karte (über dem Karten-Link). Eigene Beiträge und Ideen zeigen nur die Zahl bzw. den Weg ins Board. */
function ThumbVote({ entry, meId, onChange }: { entry: FeedEntry; meId?: string; onChange: (voted: boolean, delta: number) => void }) {
  const [busy, setBusy] = useState(false);
  const count = entry.upvotes ?? entry.voteCount ?? 0;
  const url = voteUrl(entry);
  const own = !!meId && entry.author.id === meId;

  if (!url || own) {
    return (
      <span className="relative z-20 flex items-center gap-1 text-[10px] text-gray-400">
        <ThumbsUp className="w-3 h-3" /> {count}{entry.kind === "idea" ? " · bewerten im Board" : ""}
      </span>
    );
  }
  const voted = !!entry.votedByMe;

  async function toggle() {
    if (busy || !url) return;
    setBusy(true);
    onChange(!voted, voted ? -1 : 1); // optimistisch
    try {
      const res = await fetch(url, { method: voted ? "DELETE" : "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Bewertung fehlgeschlagen");
      }
    } catch (err) {
      onChange(voted, voted ? 1 : -1); // zurückrollen
      toast.error(err instanceof Error ? err.message : "Bewertung fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button onClick={toggle} disabled={busy} aria-pressed={voted} aria-label={voted ? "Daumen zurücknehmen" : "Daumen hoch"}
      className={`relative z-20 self-start inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-all duration-150 active:scale-90 backdrop-blur-sm ${voted ? THUMB_ON : THUMB_OFF}`}>
      <ThumbsUp className={`w-3.5 h-3.5 ${voted ? "fill-current" : ""}`} /> <span className="tabular-nums">{count}</span>
    </button>
  );
}

function entryLabel(e: FeedEntry): string {
  return e.title ?? e.caption ?? "Neuer Beitrag";
}

function entryImage(e: FeedEntry): string | null {
  if (e.kind === "asset") return e.url ?? null;
  if (e.kind === "report") return e.coverAsset?.url ?? null;
  if (e.kind === "marketing_post") return e.imageUrl ?? e.asset?.url ?? null;
  return null;
}

export default function CommunityBoardWidget() {
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);
  const { data: session } = useSession();
  const meId = (session?.user as { id?: string } | undefined)?.id;

  function applyVote(entry: FeedEntry, voted: boolean, delta: number) {
    setFeed(cur => cur && cur.map(e => (e.kind === entry.kind && e.id === entry.id
      ? { ...e, votedByMe: voted, ...(e.upvotes !== undefined ? { upvotes: Math.max(0, (e.upvotes ?? 0) + delta) } : { voteCount: Math.max(0, (e.voteCount ?? 0) + delta) }) }
      : e)));
  }

  useEffect(() => {
    fetch("/api/community-board?limit=8")
      .then(r => r.json())
      .then(d => setFeed(d.feed ?? []))
      .catch(() => setFeed([]));
  }, []);

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-teal-400" /> Neues aus der Community
        </h2>
        <Link href="/community-board" className="text-[11px] flex items-center gap-0.5 text-teal-500 hover:text-teal-300 transition-colors">
          Alle <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {feed === null ? (
        <div className="glass card-shine rounded-2xl p-6 flex items-center justify-center">
          <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
        </div>
      ) : feed.length === 0 ? (
        <div className="glass card-shine rounded-2xl p-4">
          <p className="text-xs text-gray-600 text-center">Noch keine Community-Job-Beiträge</p>
        </div>
      ) : (
        <div className="flex items-stretch gap-3 overflow-x-auto scrollbar-none snap-x snap-mandatory pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          {feed.map(entry => {
            const Icon = KIND_ICON[entry.kind];
            const accentName = KIND_ACCENT[entry.kind];
            const image = entryImage(entry);
            return (
              <div key={`${entry.kind}-${entry.id}`}
                className="group relative shrink-0 snap-start h-56 sm:h-64 w-fit rounded-2xl overflow-hidden transition-transform duration-200 hover:-translate-y-1 active:scale-[0.98]"
                style={{
                  border: `1px solid ${acc(accentName, 0.22)}`,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
                  minWidth: image ? "120px" : "150px",
                  maxWidth: image ? "300px" : "230px",
                }}>
                {/* Ganze Karte führt ins Board — der Daumen liegt darüber (z-20) und klickt für sich. */}
                <Link href="/community-board" aria-label={entryLabel(entry)} className="absolute inset-0 z-10" />
                {image ? (
                  // Bild/Video ist das einzige nicht-absolute Kind → bestimmt die Kartenbreite
                  // anhand des echten Seitenverhältnisses bei fester Kartenhöhe.
                  isVideoUrl(image) ? (
                    <video src={image} muted playsInline className="relative h-full w-auto object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host, Breite folgt dem Seitenverhältnis
                    <img src={image} alt="" className="relative h-full w-auto object-cover transition-transform duration-700 group-hover:scale-110" />
                  )
                ) : (
                  <>
                    <div className="absolute inset-0"
                      style={{ background: `radial-gradient(circle at 50% 30%, ${acc(accentName, 0.22)}, rgba(13,13,15,0.92) 75%)` }} />
                    {/* Nicht-absoluter Textblock → bestimmt die Kartenbreite anhand der Caption-Länge */}
                    <div className="relative h-full flex flex-col justify-end p-2.5 gap-1">
                      <div className="flex items-center gap-1.5">
                        <RankedAvatar rankPoints={entry.author.rankPoints} src={entry.author.image}
                          alt={entry.author.username ?? entry.author.name ?? "?"} size={20} />
                        <span className="text-[10px] text-gray-300 truncate">
                          {entry.author.username ?? entry.author.name}<JobBadge userId={entry.author.id} variant="compact" className="ml-1" />
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white leading-snug line-clamp-6 group-hover:text-teal-200 transition-colors whitespace-normal">
                        {entryLabel(entry)}
                      </p>
                      <ThumbVote entry={entry} meId={meId} onChange={(voted, delta) => applyVote(entry, voted, delta)} />
                    </div>
                  </>
                )}

                {image && (
                  <>
                    {/* Kind-Badge oben links */}
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(13,13,15,0.6)", border: `1px solid ${acc(accentName, 0.4)}` }}>
                      <Icon className="w-3 h-3" style={{ color: acc(accentName, 1) }} />
                    </span>

                    {/* Textlesbarkeit unten */}
                    <div className="absolute inset-x-0 bottom-0 h-3/5 pointer-events-none"
                      style={{ background: "linear-gradient(to top, rgba(6,6,8,0.95), transparent)" }} />

                    {/* Content unten: Avatar + Titel + Upvotes */}
                    <div className="absolute inset-x-0 bottom-0 p-2.5 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <RankedAvatar rankPoints={entry.author.rankPoints} src={entry.author.image}
                          alt={entry.author.username ?? entry.author.name ?? "?"} size={20} />
                        <span className="text-[10px] text-gray-300 truncate">
                          {entry.author.username ?? entry.author.name}<JobBadge userId={entry.author.id} variant="compact" className="ml-1" />
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-teal-200 transition-colors">
                        {entryLabel(entry)}
                      </p>
                      <ThumbVote entry={entry} meId={meId} onChange={(voted, delta) => applyVote(entry, voted, delta)} />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
