"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ThumbsUp, Newspaper, ImagePlus, Megaphone, Lightbulb, Loader2 } from "lucide-react";
import { acc, type AccentName } from "@/lib/accentColors";

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

const KIND_ACCENT: Record<FeedEntry["kind"], AccentName> = {
  report: "teal", asset: "violet", marketing_post: "amber", idea: "rose",
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

function authorInitial(e: FeedEntry): string {
  return (e.author.username ?? e.author.name ?? "?")[0]?.toUpperCase() ?? "?";
}

export default function CommunityBoardWidget() {
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);

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
              <Link key={`${entry.kind}-${entry.id}`} href="/community-board"
                className="group relative shrink-0 snap-start h-56 sm:h-64 w-fit rounded-2xl overflow-hidden transition-transform duration-200 hover:-translate-y-1 active:scale-[0.98]"
                style={{
                  border: `1px solid ${acc(accentName, 0.22)}`,
                  boxShadow: "0 4px 20px rgba(0,0,0,0.45)",
                  minWidth: image ? "120px" : "150px",
                  maxWidth: image ? "300px" : "230px",
                }}>
                {image ? (
                  // Bild ist das einzige nicht-absolute Kind → bestimmt die Kartenbreite
                  // anhand des echten Seitenverhältnisses bei fester Kartenhöhe.
                  // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host, Breite folgt dem Seitenverhältnis
                  <img src={image} alt="" className="relative h-full w-auto object-cover transition-transform duration-700 group-hover:scale-110" />
                ) : (
                  <>
                    <div className="absolute inset-0"
                      style={{ background: `radial-gradient(circle at 50% 30%, ${acc(accentName, 0.22)}, rgba(13,13,15,0.92) 75%)` }} />
                    {/* Nicht-absoluter Textblock → bestimmt die Kartenbreite anhand der Caption-Länge */}
                    <div className="relative h-full flex flex-col justify-end p-2.5 gap-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                          style={{ background: acc(accentName, 0.85) }}>
                          {authorInitial(entry)}
                        </span>
                        <span className="text-[10px] text-gray-300 truncate">
                          {entry.author.username ?? entry.author.name}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white leading-snug line-clamp-6 group-hover:text-teal-200 transition-colors whitespace-normal">
                        {entryLabel(entry)}
                      </p>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <ThumbsUp className="w-2.5 h-2.5" /> {entry.upvotes ?? entry.voteCount ?? 0}
                      </span>
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
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                          style={{ background: acc(accentName, 0.85) }}>
                          {authorInitial(entry)}
                        </span>
                        <span className="text-[10px] text-gray-300 truncate">
                          {entry.author.username ?? entry.author.name}
                        </span>
                      </div>
                      <p className="text-[11px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-teal-200 transition-colors">
                        {entryLabel(entry)}
                      </p>
                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                        <ThumbsUp className="w-2.5 h-2.5" /> {entry.upvotes ?? entry.voteCount ?? 0}
                      </span>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
