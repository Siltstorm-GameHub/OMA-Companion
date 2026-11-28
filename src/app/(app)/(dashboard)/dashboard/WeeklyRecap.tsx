"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CoinIcon from "@/components/CoinIcon";
import { CalendarDays, FileText, Trophy, X } from "@/components/icons";

/** Cookie: Woche, deren Rückblick weggeklickt wurde (Montag der Woche, YYYY-MM-DD) — gleicher Name wie
 *  RECAP_HIDE_COOKIE in lib/weekly-recap.ts (Server) */
const RECAP_HIDE_COOKIE = "home_recap_hidden";

export interface WeeklyRecapData {
  /** Montag der zurückliegenden Woche (YYYY-MM-DD) */
  weekKey: string;
  /** "17.–23. Nov." */
  label: string;
  events: number;
  coins: number;
  rankPoints: number;
  posts: number;
}

/**
 * Wochenrückblick (montags und dienstags auf der Übersicht): was du letzte Woche gemacht hast — Events,
 * Münzen, Rang-Punkte, Beiträge im Board. Wegklickbar bis zur nächsten Woche.
 */
export default function WeeklyRecap({ data }: { data: WeeklyRecapData }) {
  const [hidden, setHidden] = useState(false);
  const router = useRouter();
  if (hidden) return null;

  function close() {
    setHidden(true);
    document.cookie = `${RECAP_HIDE_COOKIE}=${data.weekKey}; path=/; max-age=${14 * 86_400}; samesite=lax`;
    router.refresh();
  }

  const stats = [
    { icon: <CalendarDays className="size-4 text-primary-fg" />, value: data.events, label: data.events === 1 ? "Event" : "Events" },
    { icon: <CoinIcon size={16} />, value: data.coins, label: "Münzen" },
    { icon: <Trophy className="size-4 text-coin" />, value: data.rankPoints, label: "Rang-Punkte" },
    { icon: <FileText className="size-4 text-violet-300" />, value: data.posts, label: data.posts === 1 ? "Beitrag" : "Beiträge" },
  ].filter(s => s.value > 0);

  return (
    <section aria-label="Deine Woche" className="relative rounded-card border border-primary/30 bg-primary-soft p-4 pr-12">
      <button type="button" onClick={close} aria-label="Rückblick ausblenden"
        className="absolute right-2 top-2 grid size-10 place-items-center rounded-control text-muted hover:text-fg"><X className="size-4" /></button>
      <p className="text-xs font-bold uppercase tracking-[0.1em] text-primary-fg">Deine Woche · {data.label}</p>
      <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
        {stats.map(s => (
          <li key={s.label} className="flex items-center gap-1.5 text-sm text-fg">
            {s.icon}
            <b className="tabular-nums">{s.value.toLocaleString("de-DE")}</b>
            <span className="text-muted">{s.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
