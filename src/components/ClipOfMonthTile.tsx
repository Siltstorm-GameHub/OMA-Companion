"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clapperboard, Play } from "lucide-react";
import { NewContentPing } from "@/components/NewContentPing";

export type WinnerClip = {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  clipTitle: string | null;
  twitchCreatorLogin: string | null;
  submittedBy: { name: string | null; username: string | null } | null;
};

interface Props {
  winners: WinnerClip[];
  monthLabel: string;
  finishedContestId: string | null;
  activeContestId: string | null;
}

const ROTATE_INTERVAL_MS = 6000;

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#9146ff" aria-hidden="true">
      <path d="M4.32 1.5 1.5 6.87v13.63h5.14V24h2.9l2.9-2.9h4.35L22.5 15.4V1.5H4.32Zm16.24 13.09-3.19 3.19h-5.14l-2.9 2.9v-2.9H4.98V3.35h15.58v11.24Z" />
      <path d="M17.15 6.87h-1.93v5.79h1.93zM11.83 6.87h-1.93v5.79h1.93z" />
    </svg>
  );
}

export default function ClipOfMonthTile({ winners, monthLabel, finishedContestId, activeContestId }: Props) {
  const [index, setIndex] = useState(0);

  // Solange eine Abstimmung läuft, soll die Kachel darauf verweisen — nicht auf den
  // Gewinner-Clip des Vormonats.
  const showWinner = !activeContestId && winners.length > 0;

  useEffect(() => {
    if (!showWinner || winners.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % winners.length), ROTATE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [showWinner, winners.length]);

  const winner = showWinner ? winners[index] ?? null : null;

  return (
    <Link href="/clip-des-monats"
      className="surface animate-slide-up stagger-2 scan-on-load group block overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
      style={{ borderRadius: "6px", border: "1px solid rgba(145,70,255,0.18)", boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>

      {/* Cover art area */}
      <div className="relative overflow-hidden" style={{ height: "150px" }}>
        {/* Clip-Thumbnail */}
        {winner?.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={winner.id}
            src={winner.thumbnailUrl.replace("%{width}", "400").replace("%{height}", "225")}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-105 group-hover:scale-110 transition-transform duration-700 animate-fade-in"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #2e1065 0%, #1a0b3d 50%, #0d0d0f 100%)" }}>
            <Clapperboard className="w-8 h-8 text-gray-700" />
          </div>
        )}
        {/* Overlay */}
        <div className="absolute inset-0"
          style={{ background: "rgba(13,13,15,0.6)" }} />
        {/* Play-Overlay (rein visuell — Kachel navigiert zur Clip-Seite) */}
        {winner && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <Play className="w-3.5 h-3.5 text-black ml-0.5" fill="black" />
            </div>
          </div>
        )}
        {/* Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
          style={{ background: "rgba(145,70,255,0.18)", border: "1px solid rgba(145,70,255,0.35)", color: "#c4b5fd" }}>
          <NewContentPing
            id={winner ? `winner-${finishedContestId}` : activeContestId ? `voting-${activeContestId}` : null}
            storageKey="clip-hub-ping-seen"
          >
            {winner ? "🏆 Clip des Monats" : activeContestId ? "Abstimmung läuft" : "Clips"}
          </NewContentPing>
        </div>
        {showWinner && winners.length > 1 && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1">
            {winners.map((w, i) => (
              <span key={w.id} className="w-1 h-1 rounded-full transition-colors"
                style={{ background: i === index ? "#c4b5fd" : "rgba(255,255,255,0.25)" }} />
            ))}
          </div>
        )}
        <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-gray-700 group-hover:text-[#9146ff] group-hover:translate-x-0.5 transition-all" />
        <div className="absolute bottom-0 inset-x-0 h-14"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bg-surface))" }} />
      </div>

      {/* Info area */}
      <div className="px-4 pb-4 pt-2">
        <p className="text-[9px] text-[#9146ff]/60 uppercase tracking-[0.18em] font-semibold mb-0.5">
          {showWinner && finishedContestId ? monthLabel : "Clip des Monats"}
        </p>
        <p className="font-display text-base font-black text-white leading-tight truncate">
          {winner
            ? (winner.clipTitle ?? "Clip ansehen")
            : activeContestId
              ? "Abstimmung läuft"
              : "Noch keine Clips"}
        </p>
        {winner ? (
          <div className="flex items-center gap-1.5 mt-2 min-w-0">
            {winner.twitchCreatorLogin ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold truncate" style={{ color: "#c4b5fd" }}>
                <TwitchIcon className="w-3 h-3 shrink-0" /> {winner.twitchCreatorLogin}
              </span>
            ) : (
              <span className="text-[11px] text-gray-500 truncate">
                von {winner.submittedBy?.name ?? winner.submittedBy?.username ?? "Unbekannt"}
              </span>
            )}
            {winners.length > 1 && (
              <span className="text-[11px] text-gray-600 shrink-0">· +{winners.length - 1} weitere</span>
            )}
          </div>
        ) : activeContestId ? (
          <p className="text-[11px] text-gray-600 mt-1">Jetzt abstimmen →</p>
        ) : (
          <p className="text-[11px] text-gray-600 mt-1">Clips ansehen →</p>
        )}
      </div>
    </Link>
  );
}
