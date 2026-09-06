"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ThumbsUp, Newspaper, ImagePlus, Megaphone, Lightbulb, Loader2 } from "lucide-react";

/**
 * Kompaktes Feed-Widget fürs Dashboard — dieselbe API wie die volle
 * Community-Board-Seite, nur die letzten paar Einträge. Siehe Plan
 * "Community-Board als echter gemischter Feed [...] zusätzlich als
 * kompaktes Feed-Widget direkt auf dem Dashboard".
 */

interface FeedEntry {
  kind: "report" | "asset" | "marketing_post" | "idea";
  id: string;
  publishedAt: string;
  title?: string;
  caption?: string;
  author: { id: string; username: string | null; name: string | null };
  upvotes?: number;
  voteCount?: number;
}

const KIND_ICON: Record<FeedEntry["kind"], typeof Newspaper> = {
  report: Newspaper, asset: ImagePlus, marketing_post: Megaphone, idea: Lightbulb,
};

function entryLabel(e: FeedEntry): string {
  return e.title ?? e.caption ?? "Neuer Beitrag";
}

export default function CommunityBoardWidget() {
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);

  useEffect(() => {
    fetch("/api/community-board?limit=5")
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
      <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
        {feed === null ? (
          <div className="p-6 flex items-center justify-center">
            <Loader2 className="w-4 h-4 text-teal-400 animate-spin" />
          </div>
        ) : feed.length === 0 ? (
          <p className="p-4 text-xs text-gray-600 text-center">Noch keine Community-Job-Beiträge</p>
        ) : (
          feed.map(entry => {
            const Icon = KIND_ICON[entry.kind];
            return (
              <Link key={`${entry.kind}-${entry.id}`} href="/community-board"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03] transition-colors">
                <Icon className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                <span className="flex-1 min-w-0 text-xs text-gray-300 truncate">{entryLabel(entry)}</span>
                <span className="text-[10px] text-gray-600 shrink-0">{entry.author.username ?? entry.author.name}</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-500 shrink-0">
                  <ThumbsUp className="w-3 h-3" /> {entry.upvotes ?? entry.voteCount ?? 0}
                </span>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
