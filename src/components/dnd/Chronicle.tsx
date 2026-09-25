"use client";

// ============================================
// OMA Quest — „Heute im Reich": Chronik der letzten Ereignisse der Welt
// ============================================

import { useEffect, useState } from "react";

interface Entry { id: string; kind: string; text: string; location: string | null; createdAt: string }

const ICON: Record<string, string> = { quest: "📜", level: "⭐", location: "🏰", announce: "📣", event: "🎲" };

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  return h < 24 ? `vor ${h} Std.` : `vor ${Math.round(h / 24)} Tg.`;
}

export default function Chronicle() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/chronicle").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setEntries(j.entries); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!entries || entries.length === 0) return null;
  return (
    <section className="oq-panel p-4 space-y-2">
      <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Heute im Reich</p>
      <ul className="space-y-1">
        {entries.map((e) => (
          <li key={e.id} className="flex items-start gap-2 text-xs text-gray-300">
            <span>{ICON[e.kind] ?? "•"}</span>
            <span className="min-w-0">{e.text}{e.location ? <span className="text-sky-300"> — {e.location}</span> : null}</span>
            <span className="ml-auto shrink-0 text-[10px] text-gray-500">{ago(e.createdAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
