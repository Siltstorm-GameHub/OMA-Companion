"use client";

import { useEffect, useState } from "react";
import { Eye } from "@/components/icons";

type CommunityStream = {
  user_login: string;
  userId: string;
  displayName: string;
  avatar: string;
  game_name: string;
  viewer_count: number;
};

const REFRESH_MS = 120_000;

/**
 * "Gerade live" in der Seitenleiste: Streamer aus der Community mit Spiel und Zuschauerzahl
 * (gleiche Quelle wie LiveStreamsBanner auf der Übersicht). Zeigt nichts, wenn niemand live ist.
 */
export function LiveNow() {
  const [streams, setStreams] = useState<CommunityStream[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/twitch/community-live")
        .then((r) => (r.ok ? r.json() : []))
        .then((data: CommunityStream[]) => { if (!cancelled && Array.isArray(data)) setStreams(data); })
        .catch(() => {});
    load();
    const id = window.setInterval(load, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  if (streams.length === 0) return null;

  return (
    <section aria-label="Gerade live" className="flex flex-col gap-0.5">
      <p className="mb-1.5 flex items-center gap-1.5 px-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.1em] text-subtle">
        <span className="size-1.5 rounded-full bg-live" aria-hidden /> Gerade live
      </p>
      {streams.slice(0, 5).map((s) => (
        <a
          key={s.user_login}
          href={`https://twitch.tv/${s.user_login}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2.5 rounded-control px-2.5 py-1.5 hover:bg-surface-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Twitch-/Discord-Avatare von fremden Hosts */}
          <img src={s.avatar} alt="" width={28} height={28} className="size-7 shrink-0 rounded-full border-2 border-live object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">{s.displayName}</span>
            <span className="block truncate text-xs text-subtle">{s.game_name || "Just Chatting"}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
            <Eye className="size-3" aria-hidden />
            {s.viewer_count.toLocaleString("de-DE")}
          </span>
        </a>
      ))}
    </section>
  );
}
