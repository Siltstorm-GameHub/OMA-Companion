"use client";

// ============================================
// OMA Quest — Meldungen im Spiel (statt Toast über der Seite)
// ============================================
// Meldungen erscheinen als Spielfenster: in der Welt oben mittig über der Zeichenfläche (GameFeed), in Menüs und Panels
// als Banner am Kopf (useNotice). Beides im Look des Spiels — keine schwebenden Benachrichtigungen der App.

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export type FeedKind = "quest" | "info" | "reward" | "level" | "error";
export type Notify = (kind: FeedKind, title: string, text?: string) => void;
export interface FeedItem { id: number; kind: FeedKind; title: string; text?: string }

const KIND: Record<FeedKind, { icon: string; border: string; title: string }> = {
  quest: { icon: "📜", border: "border-amber-300/70", title: "text-amber-200" },
  reward: { icon: "🪙", border: "border-yellow-300/70", title: "text-yellow-200" },
  level: { icon: "⭐", border: "border-violet-300/80", title: "text-violet-200" },
  info: { icon: "💬", border: "border-sky-300/60", title: "text-sky-200" },
  error: { icon: "⚠️", border: "border-red-400/70", title: "text-red-200" },
};

const SHOW_MS = 4800;

/** Zustand der Meldungen: `push` zeigt eine an, sie verschwindet nach ein paar Sekunden von selbst. */
export function useGameFeed(): { items: FeedItem[]; push: Notify } {
  const [items, setItems] = useState<FeedItem[]>([]);
  const seq = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const push = useCallback<Notify>((kind, title, text) => {
    const id = ++seq.current;
    setItems((cur) => [...cur.slice(-3), { id, kind, title, text }]);
    timers.current.push(setTimeout(() => setItems((cur) => cur.filter((i) => i.id !== id)), SHOW_MS));
  }, []);
  return { items, push };
}

function Card({ item }: { item: FeedItem }) {
  const k = KIND[item.kind];
  return (
    <div className={`oq-feed pointer-events-none flex items-start gap-2 rounded-md border-2 ${k.border} bg-[#0b1220]/95 px-3 py-2 shadow-[0_3px_0_rgba(0,0,0,0.6)] max-w-[min(92%,460px)]`}>
      <span className="text-base leading-none mt-0.5">{k.icon}</span>
      <div className="min-w-0">
        <p className={`text-[11px] font-black uppercase tracking-wider ${k.title}`}>{item.title}</p>
        {item.text && <p className="text-xs text-gray-100 leading-snug">{item.text}</p>}
      </div>
    </div>
  );
}

/** Überlagerung in der Spielfläche (oben mittig). */
export function GameFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) return null;
  return (
    <div className="absolute inset-x-0 top-2 z-20 flex flex-col items-center gap-1.5 pointer-events-none" aria-live="polite">
      {items.map((i) => <Card key={i.id} item={i} />)}
    </div>
  );
}

/** Banner am Kopf eines Panels/Menüs. Mit `outer` werden Meldungen stattdessen an die übergeordnete Anzeige weitergereicht. */
export function useNotice(outer?: Notify): { notify: Notify; node: ReactNode } {
  const own = useGameFeed();
  if (outer) return { notify: outer, node: null };
  return {
    notify: own.push,
    node: own.items.length ? (
      <div className="space-y-1.5" aria-live="polite">{own.items.map((i) => <Card key={i.id} item={i} />)}</div>
    ) : null,
  };
}
