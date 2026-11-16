import Link from "next/link";
import { DailyPollBanner } from "@/components/DailyPollBanner";
import { ChevronRight } from "@/components/icons";
import type { HomeTask, HomeTaskTone } from "@/lib/home-tasks";
import type { DailyPollView } from "@/lib/daily-poll";


const DOT: Record<HomeTaskTone, string> = {
  amber: "bg-amber-400",
  violet: "bg-violet-400",
  orange: "bg-orange-400",
  teal: "bg-teal-400",
  twitch: "bg-[#9146ff]",
};

const CHIP = "group shrink-0 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-white/[0.22] hover:bg-white/[0.06] transition-colors whitespace-nowrap";

/**
 * "Heute für dich": was gerade ansteht, als kleine Chips — Glücksrad, GameSwipe, Clip-Voting,
 * neue Ergebnisse, fast fertige Quest. Erledigtes taucht nicht auf (der Server liefert nur offene Aufgaben).
 * Community-Umfragen stehen immer direkt aufgeklappt darüber (an ein Event geknüpfte zusätzlich
 * auf der Event-Seite). Die Daten liefert der Server mit.
 */
export default function HomeTaskBar({ tasks, polls, loggedIn }: { tasks: HomeTask[]; polls: DailyPollView[]; loggedIn: boolean }) {
  if (tasks.length === 0 && polls.length === 0) return null;
  return (
    <section aria-label="Heute für dich" className="space-y-2.5">
      <DailyPollBanner initialPolls={polls} loggedIn={loggedIn} />
      {tasks.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-500 mr-1">Heute</span>
          {tasks.map(t => (
            <Link key={t.key} href={t.href} className={CHIP}>
              <span className={`h-2 w-2 rounded-full ${DOT[t.tone]}`} />
              {t.label}
              <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 transition-colors" />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
