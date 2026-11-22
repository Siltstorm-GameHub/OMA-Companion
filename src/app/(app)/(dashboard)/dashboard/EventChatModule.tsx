"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { MessageCircle } from "@/components/icons";
import { RelativeTime } from "@/components/RelativeTime";
import { usePolling } from "@/lib/usePolling";
import type { EventThreadDTO } from "@/lib/event-comments-shared";
import { CARD, ModuleHeader } from "./HomeModules";

const PHASE_LABEL: Record<EventThreadDTO["phase"], string> = {
  upcoming: "bald", live: "läuft", voting: "Abstimmung", finished: "beendet",
};

/**
 * Event-Chat auf der Übersicht: die neuesten Nachrichten aus den Absprachen deiner Events
 * (gleiche Quelle wie der Community-Hub, /api/me/event-threads). Ungelesene zuerst.
 */
export default function EventChatModule() {
  const [threads, setThreads] = useState<EventThreadDTO[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/me/event-threads", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { threads: EventThreadDTO[] };
      setThreads(data.threads);
    } catch { /* Netzwerkfehler ignorieren */ }
  }, []);
  usePolling(load, 60_000);

  const shown = (threads ?? [])
    .filter((t) => t.last && t.phase !== "finished")
    .sort((a, b) => (b.unread > 0 ? 1 : 0) - (a.unread > 0 ? 1 : 0)
      || new Date(b.last!.createdAt).getTime() - new Date(a.last!.createdAt).getTime())
    .slice(0, 3);
  if (shown.length === 0) return null;

  return (
    <section aria-label="Event-Chat">
      <ModuleHeader title="Event-Chat" />
      <div className={`${CARD} divide-y divide-line overflow-hidden`}>
        {shown.map((t) => (
          <Link key={t.eventId} href={`/tournament/${t.eventId}#absprachen`} className="block px-4 py-3 hover:bg-surface-2">
            <div className="flex items-center gap-2 text-xs">
              <MessageCircle className="size-3.5 shrink-0 text-primary-fg" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-bold text-fg">{t.title}</span>
              <span className="shrink-0 text-subtle">{PHASE_LABEL[t.phase]}</span>
              {t.unread > 0 && (
                <span className="shrink-0 rounded-full bg-live px-1.5 py-px text-xs font-bold text-white">{t.unread}</span>
              )}
            </div>
            <p className="mt-1 line-clamp-2 text-sm text-muted">
              <span className="font-semibold text-fg">{t.last!.author}:</span> {t.last!.text}
            </p>
            <p className="mt-0.5 text-xs text-subtle"><RelativeTime date={t.last!.createdAt} /></p>
          </Link>
        ))}
      </div>
    </section>
  );
}
