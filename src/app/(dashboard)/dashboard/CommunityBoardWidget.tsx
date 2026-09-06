"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ThumbsUp, Newspaper, ImagePlus, Megaphone, Lightbulb, Loader2 } from "lucide-react";

/**
 * Social-Media-artiges Feed-Widget fürs Dashboard — dieselbe API wie die volle
 * Community-Board-Seite, nur die letzten paar Einträge, mit Bild-Vorschau statt
 * reiner Text-Zeile. Siehe Plan "Community-Board als echter gemischter Feed
 * [...] zusätzlich als kompaktes Feed-Widget direkt auf dem Dashboard".
 */

interface FeedEntry {
  kind: "report" | "asset" | "marketing_post" | "idea";
  id: string;
  publishedAt: string;
  title?: string;
  caption?: string;
  url?: string; // Bild-URL bei kind="asset"
  author: { id: string; username: string | null; name: string | null };
  upvotes?: number;
  voteCount?: number;
  coverAsset?: { url: string } | null;
  imageUrl?: string | null;
  asset?: { url: string } | null;
}

const KIND_ICON: Record<FeedEntry["kind"], typeof Newspaper> = {
  report: Newspaper, asset: ImagePlus, marketing_post: Megaphone, idea: Lightbulb,
};

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

  useEffect(() => {
    fetch("/api/community-board?limit=6")
      .then(r => r.json())
      .then(d => setFeed(d.feed ?? []))
      .catch(() => setFeed([]));
  }, []);

  return (
    <div className="animate-slide-up">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Newspaper className="w-3.5 h-3.5 text-teal-500/70" /> Neues aus der Community
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
        <div className="space-y-2.5">
          {feed.map(entry => {
            const Icon = KIND_ICON[entry.kind];
            const image = entryImage(entry);
            return (
              <Link key={`${entry.kind}-${entry.id}`} href="/community-board"
                className="glass card-shine rounded-2xl overflow-hidden flex hover:bg-white/[0.03] transition-colors group">
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host
                  <img src={image} alt="" className="w-20 h-20 object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0 p-3 flex flex-col justify-center gap-1">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3 h-3 text-teal-400 shrink-0" />
                    <span className="text-[10px] text-gray-600">{entry.author.username ?? entry.author.name}</span>
                  </div>
                  <p className="text-xs text-gray-300 truncate group-hover:text-white transition-colors">{entryLabel(entry)}</p>
                  <span className="flex items-center gap-1 text-[10px] text-gray-500">
                    <ThumbsUp className="w-3 h-3" /> {entry.upvotes ?? entry.voteCount ?? 0}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
