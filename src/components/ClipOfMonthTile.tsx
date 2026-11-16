import Link from "next/link";
import type { ReactNode } from "react";
import { Clapperboard, Play, Trophy } from "@/components/icons";
import { NewContentPing } from "@/components/NewContentPing";
import HubTile, { type HubRow } from "@/components/HubTile";
import { berlinDayDiff } from "@/lib/event-display";

export type WinnerClip = {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  clipTitle: string | null;
  twitchCreatorLogin: string | null;
  submittedBy: { name: string | null; username: string | null } | null;
};

/** Platzierung des letzten abgeschlossenen Wettbewerbs (nach Stimmen) */
export type ClipRankingEntry = { id: string; title: string; votes: number };

export type ActiveClipContest = { id: string; monthLabel: string; votingEndsAt: string; nominationCount: number };

interface Props {
  winners: WinnerClip[];
  /** Monat des abgeschlossenen Wettbewerbs, z.B. "Oktober" */
  monthLabel: string;
  finishedContestId: string | null;
  active: ActiveClipContest | null;
  ranking: ClipRankingEntry[];
  nowIso: string;
}

const BTN = "shrink-0 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors";

function TwitchIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="#9146ff" aria-hidden="true">
      <path d="M4.32 1.5 1.5 6.87v13.63h5.14V24h2.9l2.9-2.9h4.35L22.5 15.4V1.5H4.32Zm16.24 13.09-3.19 3.19h-5.14l-2.9 2.9v-2.9H4.98V3.35h15.58v11.24Z" />
      <path d="M17.15 6.87h-1.93v5.79h1.93zM11.83 6.87h-1.93v5.79h1.93z" />
    </svg>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-md bg-[#0b0d12]/90 px-2 py-1 text-[11px] font-semibold text-violet-300 shadow-[0_1px_6px_rgba(0,0,0,0.4)]">
      {children}
    </span>
  );
}

const daysLeftLabel = (endsAt: Date, now: Date) => {
  const d = berlinDayDiff(now, endsAt);
  if (endsAt.getTime() <= now.getTime()) return "endet gleich";
  if (d <= 0) return "endet heute";
  if (d === 1) return "endet morgen";
  return `noch ${d} Tage`;
};

/**
 * Startseiten-Kachel "Clip des Monats" im selben Gerüst wie die Events-Kachel (HubTile):
 * fest der Sieger-Clip (kein Karussell mehr), darunter Platz 2 und der laufende Wettbewerb.
 * Läuft gerade eine Abstimmung, steht sie vorne.
 */
export default function ClipOfMonthTile({ winners, monthLabel, finishedContestId, active, ranking, nowIso }: Props) {
  const now = new Date(nowIso);
  const winner = winners[0] ?? null;
  const showVoting = !!active;
  const pingId = showVoting ? `voting-${active!.id}` : winner ? `winner-${finishedContestId}` : null;

  const thumb = (url: string) => url.replace("%{width}", "480").replace("%{height}", "270");

  const media = (
    <Link href="/clip-des-monats" className="group absolute inset-0 block" aria-label={showVoting ? "Zur Abstimmung" : "Clip ansehen"}>
      {showVoting ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/clip-contest-voting.png" alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : winner?.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb(winner.thumbnailUrl)} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1a0b3d]">
          <Clapperboard className="w-8 h-8 text-gray-600" />
        </div>
      )}
      {!showVoting && winner && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
            <Play className="w-4 h-4 text-black ml-0.5" fill="black" />
          </span>
        </span>
      )}
      <Pill>
        <NewContentPing id={pingId} storageKey="clip-hub-ping-seen">
          {showVoting
            ? <>Abstimmung {active!.monthLabel}</>
            : winner
              ? <span className="inline-flex items-center gap-1"><Trophy className="w-3.5 h-3.5" />{monthLabel} · Platz 1</span>
              : "Clip des Monats"}
        </NewContentPing>
      </Pill>
    </Link>
  );

  const winnerVotes = ranking[0]?.votes;
  const creator = winner
    ? winner.twitchCreatorLogin
      ? <span className="inline-flex items-center gap-1 text-violet-300"><TwitchIcon className="w-3 h-3 shrink-0" />{winner.twitchCreatorLogin}</span>
      : <>von {winner.submittedBy?.username ?? winner.submittedBy?.name ?? "Unbekannt"}</>
    : null;

  const main = showVoting ? (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-white leading-tight">Welcher Clip gewinnt den {active!.monthLabel}?</p>
        <p className="truncate text-[11px] text-gray-400">{active!.nominationCount} Clips im Rennen · {daysLeftLabel(new Date(active!.votingEndsAt), now)}</p>
      </div>
      <Link href="/clip-des-monats" className={`${BTN} bg-violet-500 text-white hover:bg-violet-400`}>Abstimmen</Link>
    </>
  ) : winner ? (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-white leading-tight">{winner.clipTitle ?? "Clip des Monats"}</p>
        <p className="truncate text-[11px] text-gray-400">
          {creator}{winnerVotes != null && <> · {winnerVotes} {winnerVotes === 1 ? "Stimme" : "Stimmen"}</>}
          {winners.length > 1 && <> · Gleichstand mit {winners.length - 1}</>}
        </p>
      </div>
      <Link href="/clip-des-monats" className={`${BTN} border border-white/[0.08] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]`}>
        <Play className="w-3 h-3" fill="currentColor" /> Ansehen
      </Link>
    </>
  ) : (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold text-white leading-tight">Noch keine Clips</p>
        <p className="truncate text-[11px] text-gray-400">Reich deinen besten Moment ein.</p>
      </div>
      <Link href="/clip-des-monats" className={`${BTN} border border-white/[0.08] bg-white/[0.04] text-gray-300 hover:bg-white/[0.08]`}>Ansehen</Link>
    </>
  );

  // Zeilen: im Abstimmungsmodus der Sieger des Vormonats (Rest: "Clip einreichen"); sonst Platz 2 und 3.
  const rows: HubRow[] = showVoting
    ? winner
      ? [{ key: "last-winner", href: "/clip-des-monats", lead: <span className="text-yellow-300">{monthLabel.slice(0, 3)}</span>, label: winner.clipTitle ?? "Clip des Monats", hint: <span className="text-gray-500">Sieger</span> }]
      : []
    : ranking.slice(1, 3).map((entry, i) => ({
        key: entry.id,
        href: "/clip-des-monats",
        lead: `#${i + 2}`,
        label: entry.title,
        hint: <span className="text-gray-500 tabular-nums">{entry.votes} {entry.votes === 1 ? "Stimme" : "Stimmen"}</span>,
      }));

  return (
    <HubTile
      ariaLabel="Clip des Monats"
      accent="violet"
      highlighted={showVoting}
      className="animate-slide-up stagger-2"
      media={media}
      main={main}
      rows={rows}
      placeholderRow={{ label: "Clip einreichen", href: "/clip-des-monats#einreichen" }}
      footer={{ label: showVoting ? "Alle Clips ansehen" : "Clip einreichen", href: showVoting ? "/clip-des-monats" : "/clip-des-monats#einreichen" }}
    />
  );
}
