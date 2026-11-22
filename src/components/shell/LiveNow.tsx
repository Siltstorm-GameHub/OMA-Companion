"use client";

import { useEffect, useState } from "react";
import { Eye } from "@/components/icons";

type Stream = { login: string; name: string; avatar: string; game: string; viewers: number; partner: boolean };

const REFRESH_MS = 120_000;

async function loadStreams(): Promise<Stream[]> {
  const [partners, community] = await Promise.all([
    fetch("/api/twitch/live").then((r) => (r.ok ? r.json() : [])).catch(() => []),
    fetch("/api/twitch/community-live").then((r) => (r.ok ? r.json() : [])).catch(() => []),
  ]);
  const list: Stream[] = [
    ...(Array.isArray(partners) ? partners : []).map((s: { user_login: string; partnerName: string; logoUrl: string; game_name: string; viewer_count: number }) => ({
      login: s.user_login, name: s.partnerName, avatar: s.logoUrl, game: s.game_name, viewers: s.viewer_count, partner: true,
    })),
    ...(Array.isArray(community) ? community : []).map((s: { user_login: string; displayName: string; avatar: string; game_name: string; viewer_count: number }) => ({
      login: s.user_login, name: s.displayName, avatar: s.avatar, game: s.game_name, viewers: s.viewer_count, partner: false,
    })),
  ];
  return list.sort((a, b) => b.viewers - a.viewers);
}

/**
 * "Gerade live" in der Seitenleiste (Desktop): Streamer der Community und Partner mit Spiel und
 * Zuschauerzahl — dieselben Quellen wie LiveStreamsBanner, das am Handy oben auf der Übersicht
 * als wischbare Leiste steht. Zeigt nichts, wenn niemand live ist.
 */
export function LiveNow() {
  const [streams, setStreams] = useState<Stream[]>([]);

  useEffect(() => {
    let cancelled = false;
    const load = () => loadStreams().then((s) => { if (!cancelled) setStreams(s); });
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
          key={s.login}
          href={`https://twitch.tv/${s.login}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-11 items-center gap-2.5 rounded-control px-2.5 py-1.5 hover:bg-surface-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- Twitch-/Discord-Avatare von fremden Hosts */}
          <img src={s.avatar} alt="" width={28} height={28} className="size-7 shrink-0 rounded-full border-2 border-live object-cover" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-fg">{s.name}</span>
            <span className="block truncate text-xs text-subtle">
              {s.partner ? "Partner · " : ""}{s.game || "Just Chatting"}
            </span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-xs text-muted">
            <Eye className="size-3" aria-hidden />
            {s.viewers.toLocaleString("de-DE")}
          </span>
        </a>
      ))}
    </section>
  );
}
