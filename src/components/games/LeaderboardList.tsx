// Gemeinsame Ranglisten-Anzeige der Community-Spiele (OMA Blocks).
import Link from "next/link";
import RankedAvatar from "@/components/RankedAvatar";
import { Info, Trophy } from "@/components/icons";

export interface LeaderboardEntry {
  userId: string;
  name: string;
  image: string | null;
  /** Rechts in der Zeile, z.B. „12.340 Punkte“. */
  value: string;
  /** Unter dem Namen, z.B. „Level 7“. */
  detail: string;
}

/** Eigene Rang-Plaketten statt Emoji-Medaillen (🥇🥈🥉 rendern je nach OS/
 *  Browser unterschiedlich und fallen aus dem sonst durchgehend selbstgebauten
 *  Icon-/Gradient-Stil heraus) — Gold/Silber/Bronze als radialer Verlauf,
 *  passend zur restlichen UI (z.B. Level-Rahmen der Karten). */
const RANK_STYLE = [
  { gradient: "radial-gradient(circle at 35% 28%, #fde68a, #d97706)", ring: "#fbbf24" },
  { gradient: "radial-gradient(circle at 35% 28%, #e5e7eb, #6b7280)", ring: "#d1d5db" },
  { gradient: "radial-gradient(circle at 35% 28%, #fdba8c, #9a5b2e)", ring: "#f0a868" },
];

function RankBadge({ place }: { place: number }) {
  const style = RANK_STYLE[place - 1];
  if (!style) {
    return <span className="w-6 text-center text-sm font-bold text-gray-500 shrink-0">{place}</span>;
  }
  return (
    <div
      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
      style={{ background: style.gradient, boxShadow: `0 0 0 1px ${style.ring}88, 0 2px 4px rgba(0,0,0,0.4)` }}
      title={`Platz ${place}`}
    >
      <Trophy className="w-3 h-3" />
    </div>
  );
}

function Row({ row, place, isViewer }: { row: LeaderboardEntry; place: number; isViewer: boolean }) {
  return (
    <Link
      href={`/profile/${row.userId}`}
      className={`glass rounded-xl p-3 flex items-center gap-3 hover:bg-white/[0.04] transition-colors ${
        isViewer ? "ring-1 ring-teal-500/40 bg-teal-500/[0.05]" : ""
      }`}
    >
      <RankBadge place={place} />
      <RankedAvatar userId={row.userId} src={row.image} alt={row.name} size={32} className="w-8 h-8 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate font-semibold">{row.name}</p>
        <p className="text-[11px] text-gray-500 truncate">{row.detail}</p>
      </div>
      <span className="text-xs font-semibold text-white tabular-nums shrink-0 text-right">{row.value}</span>
    </Link>
  );
}

/** Rangliste der Community-Spiele (OMA Blocks). Mit `limit` nur die ersten
 *  Plätze — der Betrachter wird dann zusätzlich unten angehängt, falls er außerhalb steht. */
export default function LeaderboardList({
  rows,
  viewerId,
  limit,
  note,
  emptyText,
  absentText,
}: {
  rows: LeaderboardEntry[];
  viewerId: string;
  limit?: number;
  /** Kurze Erklärung der Sortierung über der Liste. */
  note: string;
  emptyText: string;
  /** Hinweis unter der Liste, wenn der Betrachter (noch) nicht drinsteht. */
  absentText: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="glass rounded-2xl p-6 flex flex-col items-center gap-2 text-center">
        <Trophy className="w-6 h-6 opacity-50" />
        <p className="text-sm text-gray-500">{emptyText}</p>
      </div>
    );
  }

  const viewerIndex = rows.findIndex((r) => r.userId === viewerId);
  const shown = limit ? rows.slice(0, limit) : rows;
  const viewerOutside = viewerIndex >= shown.length;

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[10px] text-gray-600 px-0.5">
        <Info className="w-3 h-3 shrink-0" />
        {note}
      </p>
      {shown.map((row, i) => (
        <Row key={row.userId} row={row} place={i + 1} isViewer={row.userId === viewerId} />
      ))}
      {viewerOutside && (
        <>
          <p className="text-center text-xs text-gray-600">⋯</p>
          <Row row={rows[viewerIndex]} place={viewerIndex + 1} isViewer />
        </>
      )}
      {viewerIndex === -1 && (
        <p className="text-xs text-gray-500 text-center pt-1">{absentText}</p>
      )}
    </div>
  );
}
