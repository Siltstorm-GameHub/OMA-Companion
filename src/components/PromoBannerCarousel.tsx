"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RecentResultsBanner, type RecentResultEvent } from "@/components/RecentResultsBanner";
import { DailyMessageBanner } from "@/components/DailyMessageBanner";
import WhatsAppCommunityBanner from "@/components/WhatsAppCommunityBanner";

type DailyMessage = { id: string; title: string; content: string; endDate: string };
type SlideId = "results" | "message" | "whatsapp";

/**
 * Orchestriert den Banner-Slider. Die einzelnen Banner können sich intern
 * selbst ausblenden (z.B. via localStorage-Dismiss) — daher bleiben alle
 * Kandidaten dauerhaft gemountet (ihr Dismiss-Zustand darf nicht verloren
 * gehen) und melden ihre tatsächliche Sichtbarkeit zurück. Der Slider
 * rotiert und zeigt Dots nur für bestätigt sichtbare Banner.
 */
export function PromoBannerCarousel({
  recentResultEvents,
  dailyMessage,
  interval = 7000,
}: {
  recentResultEvents: RecentResultEvent[];
  dailyMessage: DailyMessage | null;
  interval?: number;
}) {
  const candidateIds = useMemo<SlideId[]>(() => {
    const ids: SlideId[] = [];
    if (recentResultEvents.length > 0) ids.push("results");
    if (dailyMessage) ids.push("message");
    ids.push("whatsapp");
    return ids;
  }, [recentResultEvents.length, dailyMessage]);

  const [visibility, setVisibility] = useState<Partial<Record<SlideId, boolean>>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const makeHandler = useCallback(
    (id: SlideId) => (visible: boolean) => {
      setVisibility(prev => (prev[id] === visible ? prev : { ...prev, [id]: visible }));
    },
    []
  );

  const visibleIds = candidateIds.filter(id => visibility[id] === true);

  useEffect(() => {
    if (activeIndex >= visibleIds.length) setActiveIndex(0);
  }, [visibleIds.length, activeIndex]);

  useEffect(() => {
    if (paused || visibleIds.length <= 1) return;
    const t = setInterval(() => setActiveIndex(i => (i + 1) % visibleIds.length), interval);
    return () => clearInterval(t);
  }, [paused, visibleIds.length, interval]);

  const activeId = visibleIds[activeIndex];

  // Alle Slides liegen in derselben Grid-Zelle übereinander — die Zelle wird dadurch
  // immer so hoch wie das größte Banner, unabhängig davon welches gerade aktiv ist.
  // So springt der Inhalt darunter nicht mehr, wenn zwischen unterschiedlich hohen
  // Bannern gewechselt wird.
  const slideClass = (id: SlideId) =>
    `col-start-1 row-start-1 transition-opacity duration-300 ${
      activeId === id ? "opacity-100" : "opacity-0 pointer-events-none"
    }`;

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="grid">
        {candidateIds.includes("results") && (
          <div className={slideClass("results")} aria-hidden={activeId !== "results"}>
            <RecentResultsBanner events={recentResultEvents} onVisibilityChange={makeHandler("results")} />
          </div>
        )}
        {candidateIds.includes("message") && dailyMessage && (
          <div className={slideClass("message")} aria-hidden={activeId !== "message"}>
            <DailyMessageBanner message={dailyMessage} onVisibilityChange={makeHandler("message")} />
          </div>
        )}
        <div className={slideClass("whatsapp")} aria-hidden={activeId !== "whatsapp"}>
          <WhatsAppCommunityBanner onVisibilityChange={makeHandler("whatsapp")} />
        </div>
      </div>

      {visibleIds.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-2.5">
          {visibleIds.map((id, i) => (
            <button
              key={id}
              onClick={() => setActiveIndex(i)}
              aria-label={`Banner ${i + 1} anzeigen`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIndex ? "w-5 bg-teal-400" : "w-1.5 bg-white/15 hover:bg-white/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
