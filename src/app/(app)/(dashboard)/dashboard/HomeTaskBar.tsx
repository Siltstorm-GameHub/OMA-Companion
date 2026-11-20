import Link from "next/link";
import type { ComponentType } from "react";
import { DailyPollBanner } from "@/components/DailyPollBanner";
import { Clapperboard, Dices, Gamepad2, Heart, Target, Trophy } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";
import HomeTaskDismiss from "@/components/HomeTaskDismiss";
import { homeTaskCoins, type HomeTask, type HomeTaskTone } from "@/lib/home-tasks";
import type { DailyPollView } from "@/lib/daily-poll";

const ICON: Record<HomeTask["key"], ComponentType<{ className?: string }>> = {
  spin: Dices,
  clip: Clapperboard,
  swipe: Gamepad2,
  results: Trophy,
  thanks: Heart,
  quest: Target,
};

/** Icon-Fläche, Rahmen beim Hover und Fortschrittsfarbe je Ton */
const TONE: Record<HomeTaskTone, { icon: string; hover: string; bar: string }> = {
  amber:  { icon: "bg-amber-500/15 text-amber-300",   hover: "hover:border-amber-400/40",  bar: "bg-amber-400" },
  violet: { icon: "bg-violet-500/15 text-violet-300", hover: "hover:border-violet-400/40", bar: "bg-violet-400" },
  orange: { icon: "bg-orange-500/15 text-orange-300", hover: "hover:border-orange-400/40", bar: "bg-orange-400" },
  teal:   { icon: "bg-teal-500/15 text-teal-300",     hover: "hover:border-teal-400/40",   bar: "bg-teal-400" },
  twitch: { icon: "bg-[#9146ff]/20 text-[#bf94ff]",   hover: "hover:border-[#9146ff]/50",  bar: "bg-[#9146ff]" },
};

/** Desktop: eine Zeile, Spaltenzahl = Anzahl Aufgaben (höchstens 5) — keine Lücken */
const LG_COLS: Record<number, string> = {
  1: "lg:grid-cols-2", 2: "lg:grid-cols-2", 3: "lg:grid-cols-3", 4: "lg:grid-cols-4", 5: "lg:grid-cols-5",
};

/**
 * "Heute für dich": was gerade ansteht, als Kacheln in einer eigenen Karte — Glücksrad, Clip-Voting,
 * GameSwipe, neue Ergebnisse, fast fertige Quest; jeweils mit Nutzen oder Frist. Erledigtes taucht
 * nicht auf (der Server liefert nur offene Aufgaben). Community-Umfragen stehen immer direkt
 * aufgeklappt darüber. Ohne offene Aufgabe verschwindet die Karte.
 */
export default function HomeTaskBar({ tasks, polls, loggedIn }: { tasks: HomeTask[]; polls: DailyPollView[]; loggedIn: boolean }) {
  if (tasks.length === 0 && polls.length === 0) return null;
  const coins = homeTaskCoins(tasks);
  return (
    <section aria-label="Heute für dich" className="space-y-2.5">
      <DailyPollBanner initialPolls={polls} loggedIn={loggedIn} />
      {tasks.length > 0 && (
        <div className="glass rounded-2xl border border-white/[0.08] p-3 sm:p-4">
          <div className="mb-3 flex items-baseline justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm sm:text-base font-semibold text-white">
              <span className="relative flex h-2 w-2" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
              </span>
              Heute für dich
            </h2>
            <span className="flex items-center gap-1 text-[11px] text-gray-400 tabular-nums">
              {tasks.length} offen
              {coins > 0 && <> · bis zu {coins.toLocaleString("de-DE")} <CoinIcon size={11} /></>}
            </span>
          </div>
          <ul className={`grid grid-cols-2 gap-2 ${LG_COLS[Math.min(tasks.length, 5)]}`}>
            {tasks.map((t, i) => {
              const Icon = ICON[t.key];
              const tone = TONE[t.tone];
              // Ungerade Anzahl: die letzte Kachel mobil über die volle Breite
              const wide = tasks.length % 2 === 1 && i === tasks.length - 1;
              const liClass = wide ? "col-span-2 lg:col-span-1" : "";
              const tile = (
                <Link href={t.href}
                  className={`group flex h-full flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5 sm:p-3 transition-colors hover:bg-white/[0.06] ${tone.hover}`}>
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone.icon}`}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="text-[13px] font-semibold leading-tight text-white">{t.label}</span>
                  <span className="line-clamp-2 text-[11px] leading-snug text-gray-400">{t.sub}</span>
                  {t.progress != null && (
                    <span className="mt-auto h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
                      <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(t.progress * 100)}%` }} />
                    </span>
                  )}
                </Link>
              );
              return t.dismissIds?.length
                ? <HomeTaskDismiss key={t.key} ids={t.dismissIds} label={t.label} className={liClass}>{tile}</HomeTaskDismiss>
                : <li key={t.key} className={liClass}>{tile}</li>;
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
