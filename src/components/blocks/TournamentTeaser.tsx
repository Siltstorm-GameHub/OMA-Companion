// ============================================
// OMA Blocks — Hinweis auf ein Live-Turnier im Games-Hub
// ============================================

import Link from "next/link";
import { ChevronRight, Swords } from "@/components/icons";
import { formatBerlinDateTime } from "@/lib/time";
import type { TournamentTeaserInfo } from "@/lib/blocks/tournament";

export default function TournamentTeaser({ t }: { t: TournamentTeaserInfo }) {
  const live = t.phase === "groups" || t.phase === "final";
  return (
    <Link href={`/tournament/${t.eventId}`} className="glass rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors group">
      <span className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(192,132,252,0.12)", border: "1px solid rgba(192,132,252,0.25)" }}>
        <Swords className="w-5 h-5 text-violet-300" />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[10px] font-semibold text-violet-300 uppercase tracking-widest">Live-Turnier</span>
          {live && <span className="text-[10px] font-bold text-red-300 bg-red-500/15 rounded px-1.5">LIVE · {t.phase === "final" ? "Finale" : "Vorrunde"}</span>}
        </span>
        <span className="block font-display text-lg font-bold text-white truncate">{t.title}</span>
        <span className="block text-xs text-gray-400">
          {live ? "Läuft gerade" : formatBerlinDateTime(new Date(t.startAt), { dateStyle: "medium", timeStyle: "short" })} · {t.registered} angemeldet
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-white shrink-0" />
    </Link>
  );
}
