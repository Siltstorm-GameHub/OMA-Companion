"use client";
import { useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarDays, Swords, Scroll, Zap, Users, Trophy, Clapperboard } from "lucide-react";

export type NewsItem = {
  id:    string;
  icon:  "event" | "lul" | "quest" | "points" | "leaderboard" | "members" | "clip";
  text:  string;
  href?: string;
  accent?: "teal" | "red" | "amber" | "white";
};

const ICON_MAP = {
  event:       CalendarDays,
  lul:         Swords,
  quest:       Scroll,
  points:      Zap,
  leaderboard: Trophy,
  members:     Users,
  clip:        Clapperboard,
};

const ACCENT_COLOR: Record<string, string> = {
  teal:  "#2dd4bf",
  red:   "#f87171",
  amber: "#fbbf24",
  white: "rgba(255,255,255,0.75)",
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

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 45,
        height: "2.25rem",
        background: "rgba(13,13,15,0.96)",
        borderBottom: "1px solid rgba(20,184,166,0.10)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      {/* Logo badge — anchored left */}
      <Link
        href="/dashboard"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          flexShrink: 0,
          padding: "0 12px 0 10px",
          borderRight: "1px solid rgba(20,184,166,0.10)",
          height: "100%",
          textDecoration: "none",
          zIndex: 1,
          background: "rgba(13,13,15,0.96)",
        }}
      >
        <div style={{ width: 20, height: 20, borderRadius: 5, overflow: "hidden", flexShrink: 0 }}>
          <Image src="/OMALogoNew.png" alt="OMA" width={20} height={20}
            style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.55)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          OMA
        </span>
      </Link>

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
                  borderRight: "1px solid rgba(255,255,255,0.05)",
                  height: "100%",
                  cursor: item.href ? "pointer" : "default",
                }}
              >
                <Icon style={{ width: 12, height: 12, color, flexShrink: 0 }} />
                <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.60)", whiteSpace: "nowrap" }}>
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
        background: "linear-gradient(to left, rgba(13,13,15,0.96), transparent)",
        pointerEvents: "none",
      }} />
    </div>
  );
}
