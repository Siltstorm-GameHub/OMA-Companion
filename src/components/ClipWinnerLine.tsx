import Link from "next/link";
import { Play, Trophy } from "@/components/icons";

/**
 * Clip des Monats außerhalb der Abstimmung: nur eine Zeile mit dem Sieger des letzten Monats (die große
 * Kachel ClipOfMonthTile gibt es nur, solange abgestimmt wird).
 */
export default function ClipWinnerLine({ monthLabel, title, creator }: { monthLabel: string; title: string | null; creator: string | null }) {
  return (
    <Link href="/clip-des-monats"
      className="group flex min-h-14 items-center gap-3 rounded-card border border-line bg-surface px-4 py-2.5 shadow-card transition-colors hover:border-line-strong">
      <span className="grid size-9 shrink-0 place-items-center rounded-control bg-violet-500/15 text-violet-300"><Trophy className="size-4" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-fg">
          {title ? <>Sieger {monthLabel}: {title}</> : "Clip des Monats"}
        </span>
        <span className="block truncate text-xs text-muted">{title ? (creator ? `von ${creator}` : "Clip des Monats") : "Reich deinen besten Moment ein"}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-subtle group-hover:text-fg">
        <Play className="size-3.5" /> Ansehen
      </span>
    </Link>
  );
}
