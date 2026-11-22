import Image from "next/image";
import GameCover from "@/components/GameCover";
import { GateLink } from "@/components/GuestGate";
import { OmaTitlePrefix } from "@/components/OmaOriginalMark";
import { ChevronRight } from "@/components/icons";

export type PodiumUser = { id: string; name: string | null; username: string | null; image: string | null };

export type RecentResultData = {
  id: string;
  href: string;
  title: string;
  game: string | null;
  coverUrl: string | null;
  omaOriginal: boolean;
  dateLabel: string;
  seriesName: string | null;
  /** Platz 1–3 (kann kürzer sein) */
  podium: PodiumUser[];
  myPlace: number | null;
  playerCount: number;
  hasResults: boolean;
};

const STEP = [
  { h: "h-6", bg: "bg-yellow-400/25", text: "text-yellow-300", ring: "ring-yellow-400/70", size: 26 },
  { h: "h-4", bg: "bg-slate-300/20", text: "text-slate-300", ring: "ring-slate-300/60", size: 22 },
  { h: "h-3", bg: "bg-orange-500/20", text: "text-orange-300", ring: "ring-orange-400/60", size: 22 },
];

function Avatar({ u, size, ring }: { u: PodiumUser; size: number; ring: string }) {
  const label = u.username ?? u.name ?? "?";
  return u.image ? (
    <Image src={u.image} alt={label} title={label} width={size} height={size} className={`rounded-full ring-2 ${ring} object-cover`} style={{ width: size, height: size }} />
  ) : (
    <span title={label} className={`rounded-full ring-2 ${ring} bg-line text-[10px] font-bold text-gray-300 flex items-center justify-center`} style={{ width: size, height: size }}>
      {label.charAt(0).toUpperCase()}
    </span>
  );
}

/** "Kürzlich beendet" als kleiner Siegermoment: Treppchen, Sieger, deine Platzierung. */
export default function RecentResultCard({ r }: { r: RecentResultData }) {
  const winner = r.podium[0];
  // Treppchen-Reihenfolge 2 – 1 – 3
  const order = [1, 0, 2].filter(i => r.podium[i]);

  const body = (
    <>
      {r.podium.length > 0 ? (
        <div className="flex items-end gap-0.5 shrink-0" aria-label="Siegertreppchen">
          {order.map(i => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Avatar u={r.podium[i]} size={STEP[i].size} ring={STEP[i].ring} />
              <div className={`${STEP[i].h} w-6 rounded-t-sm ${STEP[i].bg} ${STEP[i].text} text-[9px] font-bold text-center leading-3`}>{i + 1}</div>
            </div>
          ))}
        </div>
      ) : (
        <GameCover game={r.game} coverUrl={r.coverUrl} className="w-12 h-9 shrink-0" rounded="rounded" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white truncate">
          {r.omaOriginal && <OmaTitlePrefix title={r.title} />}
          {r.title}
          {winner && <span className="font-normal text-gray-400"> · Sieg: <span className="text-yellow-300">{winner.username ?? winner.name}</span></span>}
        </p>
        <p className="text-[11px] text-gray-500 truncate">
          {r.dateLabel}{r.seriesName && <> · {r.seriesName}</>} · {r.playerCount} dabei
          {r.myPlace && <> · <span className="font-semibold text-teal-300">Du: Platz {r.myPlace}</span></>}
        </p>
      </div>
      {r.hasResults && (
        <span className="hidden sm:flex items-center gap-0.5 text-xs font-medium text-teal-300 shrink-0">
          Ergebnisse <ChevronRight className="w-3.5 h-3.5" />
        </span>
      )}
    </>
  );

  const cls = `flex items-center gap-3 px-3 py-2 rounded-lg border ${r.myPlace ? "border-teal-400/25" : "border-line"} bg-surface-2 transition-colors`;
  return r.hasResults
    ? <GateLink href={r.href} className={`${cls} hover:bg-line focus-visible:ring-2 focus-visible:ring-teal-400/60 outline-none`}>{body}</GateLink>
    : <div className={cls}>{body}</div>;
}
