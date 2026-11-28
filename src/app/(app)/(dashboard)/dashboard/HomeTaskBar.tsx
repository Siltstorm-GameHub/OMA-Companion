import Link from "next/link";
import type { ComponentType } from "react";
import { DailyPollBanner } from "@/components/DailyPollBanner";
import { CalendarPlus, Clapperboard, Dices, Gamepad2, Heart, LayoutGrid, Lightbulb, Rocket, Target, Trophy } from "@/components/icons";
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
  idea: Lightbulb,
  proposal: CalendarPlus,
  roadmap: Rocket,
  blocks: LayoutGrid,
};

/** Icon-Fläche und Fortschrittsfarbe je Ton */
const TONE: Record<HomeTaskTone, { icon: string; bar: string }> = {
  amber:  { icon: "bg-coin-soft text-coin",             bar: "bg-coin" },
  violet: { icon: "bg-violet-500/15 text-violet-300",   bar: "bg-violet-400" },
  orange: { icon: "bg-orange-500/15 text-orange-300",   bar: "bg-orange-400" },
  teal:   { icon: "bg-primary-soft text-primary-fg",    bar: "bg-primary" },
  twitch: { icon: "bg-[#9146ff]/20 text-[#bf94ff]",     bar: "bg-[#9146ff]" },
};

/**
 * "Heute für dich": was gerade ansteht — Glücksrad, Clip-Voting, GameSwipe, neue Ergebnisse, fast
 * fertige Quest; jeweils mit Nutzen oder Frist. Bewusst eine schmale Leiste über der Bühne (am Handy
 * wischbar), damit die Bühne im ersten Bildschirm bleibt. Erledigtes taucht nicht auf (der Server
 * liefert nur offene Aufgaben). Community-Umfragen stehen immer direkt aufgeklappt darüber.
 */
export default function HomeTaskBar({ tasks, polls, loggedIn }: { tasks: HomeTask[]; polls: DailyPollView[]; loggedIn: boolean }) {
  if (tasks.length === 0 && polls.length === 0) return null;
  const coins = homeTaskCoins(tasks);
  return (
    <section aria-label="Heute für dich" className="space-y-2.5">
      <DailyPollBanner initialPolls={polls} loggedIn={loggedIn} />
      {tasks.length > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-base font-extrabold text-fg">Heute für dich</h2>
            <span className="flex items-center gap-1 text-xs text-subtle tabular-nums">
              {tasks.length} offen
              {coins > 0 && <> · bis zu {coins.toLocaleString("de-DE")} <CoinIcon size={12} /></>}
            </span>
          </div>
          {/* Bis 4 Kacheln in einer Reihe, ab 5 im Raster (sonst werden die Titel zu stark gekürzt) */}
          <ul className={`-mx-4 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 scrollbar-none sm:mx-0 sm:px-0 lg:grid lg:overflow-visible ${tasks.length <= 4 ? "lg:auto-cols-fr lg:grid-flow-col" : "lg:grid-cols-3"}`}>
            {tasks.map((t) => {
              const Icon = ICON[t.key];
              const tone = TONE[t.tone];
              const liClass = "w-64 shrink-0 snap-start lg:w-auto";
              const tile = (
                <Link href={t.href}
                  className={`flex h-full min-h-16 items-center gap-3 rounded-card border border-line bg-surface px-3.5 py-2.5 transition-colors hover:border-line-strong hover:bg-surface-2 ${t.dismissIds?.length ? "pr-9" : ""}`}>
                  <span className={`grid size-10 shrink-0 place-items-center rounded-control ${tone.icon}`}>
                    <Icon className="size-[1.125rem]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-fg">{t.label}</span>
                    <span className="block truncate text-xs text-muted">{t.sub}</span>
                    {t.progress != null && (
                      <span className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-line">
                        <span className={`block h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(t.progress * 100)}%` }} />
                      </span>
                    )}
                  </span>
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
