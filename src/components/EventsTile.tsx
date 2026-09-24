"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Users } from "lucide-react";
import { Scroll, Timer, CheckCircle2 } from "@/components/icons";
import type { EventCategory } from "@prisma/client";
import GameCover from "@/components/GameCover";
import EventCoverDefault from "@/components/EventCoverDefault";
import EventCategoryBadge from "@/components/EventCategoryBadge";
import { CountUp } from "@/components/CountUp";
import { acc } from "@/lib/accentColors";

export type EventTileItem = {
  id: string;
  title: string;
  game: string | null;
  category: EventCategory;
  status: string;
  coverImageUrl: string | null;
  countdownText: string;
  registrationsCount: number;
  maxPlayers: number | null;
  isRegistered: boolean;
};

interface Props {
  items: EventTileItem[];
  activeEvents: number;
}

const ROTATE_INTERVAL_MS = 6000;

export default function EventsTile({ items, activeEvents }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (items.length <= 1) return;
    const t = setInterval(() => setIndex(i => (i + 1) % items.length), ROTATE_INTERVAL_MS);
    return () => clearInterval(t);
  }, [items.length]);

  const event = items[index] ?? null;

  return (
    <Link href="/events"
      className="surface animate-slide-up stagger-1 scan-on-load group flex flex-col overflow-hidden relative transition-transform duration-200 hover:-translate-y-1 active:scale-[0.99]"
      style={{ borderRadius: "6px", border: `1px solid ${acc("teal", 0.12)}`, boxShadow: "0 4px 24px rgba(0,0,0,0.5)" }}>

      {/* Cover art area */}
      <div className="relative overflow-hidden shrink-0 aspect-[16/10]">
        {/* Game cover background */}
        {event?.game ? (
          <GameCover
            key={event.id}
            game={event.game}
            coverUrl={event.coverImageUrl}
            className="absolute inset-0 w-full h-full"
            rounded="rounded-none"
            imgClassName="w-full h-full object-cover object-center scale-105 group-hover:scale-110 transition-transform duration-700"
            brandBadge
          />
        ) : (
          <EventCoverDefault className="absolute inset-0 w-full h-full" brandBadge />
        )}
        {/* Status badge */}
        {event && event.status === "active" ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
            style={{ background: acc("red", 0.16), border: `1px solid ${acc("red", 0.3)}`, color: "#f87171" }}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-red-400 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-red-400" />
            </span>
            Live
          </div>
        ) : event && event.status === "umfrage" ? (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
            style={{ background: acc("amber", 0.16), border: `1px solid ${acc("amber", 0.3)}`, color: "#fbbf24" }}>
            <span className="relative flex w-1.5 h-1.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-amber-400 animate-ping" />
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-amber-400" />
            </span>
            Umfragephase
          </div>
        ) : (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
            style={{ background: acc("teal", 0.14), border: `1px solid ${acc("teal", 0.22)}`, color: "#2dd4bf" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
            <CountUp to={activeEvents} duration={700} /> aktiv
          </div>
        )}
        {event?.isRegistered && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] font-bold uppercase tracking-wider"
            style={{ background: acc("teal", 0.14), border: `1px solid ${acc("teal", 0.22)}`, color: "#2dd4bf" }}>
            <CheckCircle2 className="w-3 h-3" /> Angemeldet
          </div>
        )}
        {/* Rotations-Indikator, nur wenn mehr als ein Event ansteht */}
        {items.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1">
            {items.map((it, i) => (
              <span key={it.id} className="w-1 h-1 rounded-full transition-colors"
                style={{ background: i === index ? "#2dd4bf" : "rgba(255,255,255,0.3)" }} />
            ))}
          </div>
        )}
        <ChevronRight className="absolute top-3 right-3 w-4 h-4 text-gray-700 group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all" />
        <div className="absolute bottom-0 inset-x-0 h-14"
          style={{ background: "linear-gradient(to bottom, transparent, var(--bg-surface))" }} />
      </div>

      {/* Info area */}
      <div className="px-4 pb-4 pt-2 flex-1 min-h-0">
        <p className="text-[9px] text-teal-400/50 uppercase tracking-[0.18em] font-semibold mb-0.5">
          {event?.game ?? "Events"}
        </p>
        <div className="flex items-center gap-2">
          <p className="font-display text-base font-black text-white leading-tight truncate flex-1 min-w-0">
            {event ? event.title : "Keine anstehenden Events"}
          </p>
          {event && <EventCategoryBadge category={event.category} className="shrink-0" />}
        </div>
        {event ? (
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-[12px] font-bold"
              style={{ color: event.status === "umfrage" ? "#fbbf24" : "#2dd4bf" }}>
              {event.status === "umfrage" ? <Scroll className="w-3.5 h-3.5" /> : <Timer className="w-3.5 h-3.5" />}
              {event.countdownText}
            </span>
            <span className="flex items-center gap-1 ml-auto text-[11px] text-gray-500">
              <Users className="w-3 h-3" />
              {event.registrationsCount}{event.maxPlayers ? `/${event.maxPlayers}` : ""}
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-gray-600 mt-1">Alle Events ansehen →</p>
        )}
      </div>
    </Link>
  );
}
