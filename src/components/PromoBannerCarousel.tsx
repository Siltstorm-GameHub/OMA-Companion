"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { RecentResultsBanner, type RecentResultEvent } from "@/components/RecentResultsBanner";
import { DailyMessageBanner } from "@/components/DailyMessageBanner";
import WhatsAppCommunityBanner from "@/components/WhatsAppCommunityBanner";
import { DailyPollBanner } from "@/components/DailyPollBanner";

type DailyMessage = { id: string; title: string; content: string; endDate: string };
type SlideId = "results" | "message" | "polls" | "clipContest" | "whatsapp";

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
  hasClipContest = false,
  clipContestSlot = null,
  interval = 7000,
}: {
  recentResultEvents: RecentResultEvent[];
  dailyMessage: DailyMessage | null;
  hasClipContest?: boolean;
  clipContestSlot?: ReactNode;
  interval?: number;
}) {
  const candidateIds = useMemo<SlideId[]>(() => {
    const ids: SlideId[] = [];
    if (recentResultEvents.length > 0) ids.push("results");
    if (dailyMessage) ids.push("message");
    ids.push("polls");
    if (hasClipContest) ids.push("clipContest");
    ids.push("whatsapp");
    return ids;
  }, [recentResultEvents.length, dailyMessage, hasClipContest]);

  const [visibility, setVisibility] = useState<Partial<Record<SlideId, boolean>>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const makeHandler = useCallback(
    (id: SlideId) => (visible: boolean) => {
      setVisibility(prev => (prev[id] === visible ? prev : { ...prev, [id]: visible }));
    },
    []
  );

  // Clip-Contest hat keinen Client-Dismiss — seine Sichtbarkeit steht bereits
  // serverseitig fest, sobald er als Kandidat übergeben wird.
  const visibleIds = candidateIds.filter(id =>
    id === "clipContest" ? true : visibility[id] === true
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
