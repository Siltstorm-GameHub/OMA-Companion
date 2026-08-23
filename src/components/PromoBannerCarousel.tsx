"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronRight, ChevronLeft, Briefcase as BriefcaseIcon } from "lucide-react";
import { RecentResultsBanner, type RecentResultEvent } from "@/components/RecentResultsBanner";
import { DailyMessageBanner } from "@/components/DailyMessageBanner";
import WhatsAppCommunityBanner from "@/components/WhatsAppCommunityBanner";
import { DailyPollBanner } from "@/components/DailyPollBanner";
import CoinIcon from "@/components/CoinIcon";

type DailyMessage = { id: string; title: string; content: string; endDate: string };
export type JobReminderData = {
  current: { accruedCoins: number; capped: boolean; label: string; emoji: string } | null;
};
type SlideId = "job" | "results" | "message" | "polls" | "clipContest" | "whatsapp";

function JobReminderSlide({ jobReminder, fill, insetLeft }: { jobReminder: JobReminderData; fill: boolean; insetLeft: boolean }) {
  return (
    <Link
      href="/mancave"
      className={`surface flex items-center gap-3 ${insetLeft ? "pl-11 pr-4" : "px-4"} py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.99] ${
        jobReminder.current?.capped ? "border-rose-500/25" : ""
      }`}
      style={fill ? { height: "100%", boxSizing: "border-box" } : undefined}
    >
      <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
        <BriefcaseIcon className="w-4 h-4 text-amber-400" />
      </div>
      {jobReminder.current ? (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white flex items-center gap-1.5 flex-wrap">
            <span className="text-amber-400 tabular-nums flex items-center gap-1">
              {jobReminder.current.accruedCoins.toLocaleString("de-DE")}<CoinIcon size={13} />
            </span>
            warten in deinem Gaming-Zimmer
          </p>
          <p className={`text-[11px] mt-0.5 ${jobReminder.current.capped ? "text-rose-400" : "text-gray-500"}`}>
            {jobReminder.current.capped
              ? "Lohnfach ist voll — hol dir den Lohn, bevor mehr verfällt"
              : `als ${jobReminder.current.label} ${jobReminder.current.emoji}`}
          </p>
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white">Du bist arbeitslos</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Am schwarzen Brett im Zimmer warten Jobs — Münzen nebenbei verdienen</p>
        </div>
      )}
      <ChevronRight className="w-4 h-4 text-gray-700 shrink-0" />
    </Link>
  );
}

/**
 * Orchestriert den Banner-Slider. Die einzelnen Banner können sich intern
 * selbst ausblenden (z.B. via localStorage-Dismiss) — daher bleiben alle
 * Kandidaten dauerhaft gemountet (ihr Dismiss-Zustand darf nicht verloren
 * gehen) und melden ihre tatsächliche Sichtbarkeit zurück. Der Slider
 * rotiert und zeigt Dots nur für bestätigt sichtbare Banner.
 *
 * Bündelt alle Dashboard-Hinweise außer den Live-Stream-Bannern (Events, Job-Reminder,
 * Umfragen, Clip-Contest, Mitteilungen, WhatsApp) in einer einzigen Kachel zwischen
 * Hero-Section und den Content-Kacheln. Partner-/Community-Live-Streams bleiben eigene,
 * dauerhaft sichtbare Blöcke (Video-Embeds passen nicht in eine kompakte Rotation).
 */
export function PromoBannerCarousel({
  recentResultEvents,
  dailyMessage,
  jobReminder = null,
  hasClipContest = false,
  clipContestSlot = null,
  interval = 7000,
}: {
  recentResultEvents: RecentResultEvent[];
  dailyMessage: DailyMessage | null;
  jobReminder?: JobReminderData | null;
  hasClipContest?: boolean;
  clipContestSlot?: ReactNode;
  interval?: number;
}) {
  const candidateIds = useMemo<SlideId[]>(() => {
    const ids: SlideId[] = [];
    if (jobReminder) ids.push("job");
    if (recentResultEvents.length > 0) ids.push("results");
    if (dailyMessage) ids.push("message");
    ids.push("polls");
    if (hasClipContest) ids.push("clipContest");
    ids.push("whatsapp");
    return ids;
  }, [recentResultEvents.length, dailyMessage, jobReminder, hasClipContest]);

  const [visibility, setVisibility] = useState<Partial<Record<SlideId, boolean>>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const makeHandler = useCallback(
    (id: SlideId) => (visible: boolean) => {
      setVisibility(prev => (prev[id] === visible ? prev : { ...prev, [id]: visible }));
    },
    []
  );

  // Job-Reminder und Clip-Contest haben keinen Client-Dismiss — ihre Sichtbarkeit
  // steht bereits serverseitig fest, sobald sie als Kandidat übergeben werden.
  const visibleIds = candidateIds.filter(id =>
    id === "job" || id === "clipContest" ? true : visibility[id] === true
  );

  useEffect(() => {
    if (activeIndex >= visibleIds.length) setActiveIndex(0);
  }, [visibleIds.length, activeIndex]);

  useEffect(() => {
    if (paused || visibleIds.length <= 1) return;
    const t = setInterval(() => setActiveIndex(i => (i + 1) % visibleIds.length), interval);
    return () => clearInterval(t);
  }, [paused, visibleIds.length, interval]);

  const goTo = useCallback(
    (delta: number) => {
      setActiveIndex(i => (i + delta + visibleIds.length) % visibleIds.length);
    },
    [visibleIds.length]
  );

  // Swipe-Geste (Touch): nur horizontale Wischbewegungen ab einer Mindestdistanz
  // lösen einen Wechsel aus, damit vertikales Scrollen der Seite nicht blockiert wird.
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    goTo(dx < 0 ? 1 : -1);
  }

  const activeId = visibleIds[activeIndex];
  // Bei mehreren Kandidaten liegen Pfeile über der Kachel — der Inhalt der Slides
  // rückt dann etwas ein, damit er nicht unter den Pfeilen verschwindet.
  const arrowsVisible = visibleIds.length > 1;

  // Alle Slides liegen in derselben Grid-Zelle übereinander — die Zelle wird dadurch
  // immer so hoch wie das größte Banner, unabhängig davon welches gerade aktiv ist.
  // So springt der Inhalt darunter nicht mehr, wenn zwischen unterschiedlich hohen
  // Bannern gewechselt wird.
  const slideClass = (id: SlideId) =>
    `col-start-1 row-start-1 h-full transition-opacity duration-300 ${
      activeId === id ? "opacity-100" : "opacity-0 pointer-events-none"
    }`;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div
        className="relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
      {arrowsVisible && (
        <>
          <button
            onClick={() => goTo(-1)}
            aria-label="Vorheriger Banner"
            className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => goTo(1)}
            aria-label="Nächster Banner"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
      <div className="grid">
        {candidateIds.includes("job") && jobReminder && (
          <div className={slideClass("job")} aria-hidden={activeId !== "job"}>
            <JobReminderSlide jobReminder={jobReminder} fill insetLeft={arrowsVisible} />
          </div>
        )}
        {candidateIds.includes("results") && (
          <div className={slideClass("results")} aria-hidden={activeId !== "results"}>
            <RecentResultsBanner events={recentResultEvents} onVisibilityChange={makeHandler("results")} fill insetLeft={arrowsVisible} />
          </div>
        )}
        {candidateIds.includes("message") && dailyMessage && (
          <div className={slideClass("message")} aria-hidden={activeId !== "message"}>
            <DailyMessageBanner message={dailyMessage} onVisibilityChange={makeHandler("message")} fill insetLeft={arrowsVisible} />
          </div>
        )}
        <div className={slideClass("polls")} aria-hidden={activeId !== "polls"}>
          <DailyPollBanner onVisibilityChange={makeHandler("polls")} fill insetLeft={arrowsVisible} />
        </div>
        {candidateIds.includes("clipContest") && (
          <div className={slideClass("clipContest")} aria-hidden={activeId !== "clipContest"}>
            {clipContestSlot}
          </div>
        )}
        <div className={slideClass("whatsapp")} aria-hidden={activeId !== "whatsapp"}>
          <WhatsAppCommunityBanner onVisibilityChange={makeHandler("whatsapp")} fill insetLeft={arrowsVisible} />
        </div>
      </div>
      </div>

      {visibleIds.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {visibleIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setActiveIndex(i)}
              aria-label={`Banner ${i + 1} anzeigen`}
              className="relative h-1.5 w-5 rounded-full overflow-hidden bg-white/15 hover:bg-white/25 transition-colors"
            >
              {i === activeIndex && (
                <span
                  key={id}
                  className="absolute inset-0 rounded-full bg-teal-400 carousel-progress-fill"
                  style={{
                    animationDuration: `${interval}ms`,
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              )}
              {i < activeIndex && (
                <span className="absolute inset-0 rounded-full bg-teal-400/50" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
