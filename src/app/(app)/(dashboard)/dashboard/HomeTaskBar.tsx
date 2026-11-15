"use client";
import Link from "next/link";
import { useState } from "react";
import { DailyPollBanner } from "@/components/DailyPollBanner";
import { ChevronDown, ChevronRight } from "@/components/icons";
import type { HomeTask, HomeTaskTone } from "@/lib/home-tasks";


const DOT: Record<HomeTaskTone, string> = {
  amber: "bg-amber-400",
  violet: "bg-violet-400",
  orange: "bg-orange-400",
  teal: "bg-teal-400",
  twitch: "bg-[#9146ff]",
};

const CHIP = "group shrink-0 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-gray-200 hover:border-white/[0.22] hover:bg-white/[0.06] transition-colors whitespace-nowrap";

/**
 * "Heute für dich": was gerade ansteht, als kleine Chips statt gestapelter Banner und Slider —
 * Glücksrad, Tagesumfrage, GameSwipe, Clip-Voting, neue Ergebnisse, fast fertige Quest.
 * Erledigtes taucht nicht auf (der Server liefert nur offene Aufgaben). Die Tagesumfrage wird
 * direkt hier aufgeklappt, weil man nur auf der Startseite abstimmen kann.
 */
export default function HomeTaskBar({ tasks, openPolls }: { tasks: HomeTask[]; openPolls: number }) {
  const [pollOpen, setPollOpen] = useState(false);
  if (tasks.length === 0 && openPolls === 0) return null;

  return (
    <section aria-label="Heute für dich" className="space-y-2.5">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-gray-500 mr-1">Heute</span>
        {openPolls > 0 && (
          <button type="button" onClick={() => setPollOpen(o => !o)} aria-expanded={pollOpen}
            className={`${CHIP} ${pollOpen ? "border-violet-400/50 bg-violet-500/10" : ""}`}>
            <span className={`h-2 w-2 rounded-full ${DOT.violet}`} />
            {openPolls === 1 ? "Tagesumfrage" : `${openPolls} Tagesumfragen`}
            <ChevronDown className={`w-3.5 h-3.5 text-gray-500 transition-transform ${pollOpen ? "rotate-180" : ""}`} />
          </button>
        )}
        {tasks.map(t => (
          <Link key={t.key} href={t.href} className={CHIP}>
            <span className={`h-2 w-2 rounded-full ${DOT[t.tone]}`} />
            {t.label}
            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-300 transition-colors" />
          </Link>
        ))}
      </div>
      {pollOpen && <DailyPollBanner />}
    </section>
  );
}
