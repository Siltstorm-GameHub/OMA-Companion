"use client";
import { useRef, useEffect } from "react";
import Link from "next/link";
import { Users } from "@/components/icons";
import { CalendarDays, Scroll, Zap, Trophy, Clapperboard, Vote, Crown } from "@/components/icons";

export type NewsItem = {
  id:    string;
  icon:  "event" | "quest" | "points" | "leaderboard" | "members" | "clip" | "poll" | "wanderpokal";
  text:  string;
  href?: string;
  accent?: "teal" | "red" | "amber" | "white";
};

const ICON_MAP = {
  event:       CalendarDays,
  quest:       Scroll,
  points:      Zap,
  leaderboard: Trophy,
  members:     Users,
  clip:        Clapperboard,
  poll:        Vote,
  wanderpokal: Crown,
};

const ACCENT_COLOR: Record<string, string> = {
  teal:  "#2dd4bf",
  red:   "#f87171",
  amber: "#fbbf24",
  white: "var(--color-muted)",
};

interface Props {
  items: NewsItem[];
}

export default function TopNewsFeed({ items }: Props) {
  const trackRef  = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  // Duplicate list for seamless loop
  const allItems = [...items, ...items];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;

    let pos    = 0;
    let animId = 0;
    const speed = 0.45; // px per frame

    function step() {
      if (!pausedRef.current) {
        pos += speed;
        const half = track!.scrollWidth / 2;
        if (pos >= half) pos -= half;
        track!.style.transform = `translateX(-${pos}px)`;
      }
      animId = requestAnimationFrame(step);
    }
    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [items.length]);

  if (items.length === 0) return null;

  // Laufband als schmale Leiste im Seitenfluss unter der Kopfzeile (scrollt mit weg).
  // Das Logo steht jetzt in Seitenleiste bzw. Kopfzeile.
  return (
    <div
      className="relative flex h-9 items-center overflow-hidden border-b border-line bg-sidebar"
    >
      {/* Scrolling track */}
      <div
        style={{ flex: 1, overflow: "hidden", position: "relative", height: "100%" }}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <div
          ref={trackRef}
          style={{ display: "flex", alignItems: "center", height: "100%", willChange: "transform" }}
        >
          {allItems.map((item, i) => {
            const Icon   = ICON_MAP[item.icon];
            const color  = ACCENT_COLOR[item.accent ?? "teal"];
            const inner  = (
              <div key={`${item.id}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "0 20px",
                  flexShrink: 0,
                  borderRight: "1px solid var(--color-line)",
                  height: "100%",
                  cursor: item.href ? "pointer" : "default",
                }}
              >
                <Icon style={{ width: 12, height: 12, color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "var(--color-muted)", whiteSpace: "nowrap" }}>
                  {item.text}
                </span>
              </div>
            );

            return item.href
              ? <Link key={`${item.id}-${i}`} href={item.href} style={{ textDecoration: "none", display: "contents" }}>{inner}</Link>
              : inner;
          })}
        </div>
      </div>

      {/* Right fade */}
      <div style={{
        position: "absolute",
        right: 0,
        top: 0,
        bottom: 0,
        width: 48,
        background: "linear-gradient(to left, var(--color-sidebar), transparent)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
