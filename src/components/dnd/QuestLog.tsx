"use client";

// ============================================
// OMA Quest — Quest-Log: laufende Quests (verfolgen/abbrechen), Aktivitäts-Quests zum Annehmen, Abgeschlossenes
// ============================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { LogQuest } from "@/lib/dnd/quest-log";

interface Log { active: LogQuest[]; available: LogQuest[]; completed: LogQuest[] }

function Reward({ q }: { q: LogQuest }) {
  return <span className="text-[10px] text-gray-500">{q.xpReward} XP{q.coinReward ? ` · ${q.coinReward} Coins` : ""}</span>;
}

function Steps({ q }: { q: LogQuest }) {
  if (!q.steps) {
    const pct = Math.min(100, Math.round((q.current / Math.max(1, q.target)) * 100));
    return (
      <div className="space-y-1">
        <p className="text-[11px] text-gray-400">{q.description}</p>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${pct}%` }} /></div>
        <p className="text-[10px] text-gray-500">{q.current}/{q.target}</p>
      </div>
    );
  }
  return (
    <ol className="space-y-1">
      {q.steps.map((s, i) => {
        const state = i < q.current ? "done" : i === q.current ? "now" : "todo";
        const place = s.kind === "visit" ? s.locationName ?? s.location : q.home?.name;
        return (
          <li key={i} className={`flex items-start gap-2 text-[11px] ${state === "done" ? "text-gray-500 line-through" : state === "now" ? "text-white" : "text-gray-400"}`}>
            <span className={`mt-0.5 w-3.5 h-3.5 shrink-0 rounded-full border text-[8px] grid place-items-center ${state === "done" ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-200" : state === "now" ? "border-amber-300 text-amber-300" : "border-white/20"}`}>{state === "done" ? "✓" : i + 1}</span>
            <span>
              {s.text}
              {place && state !== "done" && <span className="text-sky-300"> — {s.kind === "visit" ? "besuche " : "bei "}{place}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function QuestLog() {
  const [log, setLog] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/quests")
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error ?? "Quest-Log konnte nicht geladen werden."); return; }
        setLog(json);
      })
      .catch(() => { if (!cancelled) setError("Netzwerkfehler."); });
    return () => { cancelled = true; };
  }, [reload]);

  const act = async (id: string, action: "accept" | "track" | "untrack" | "abandon", ok?: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/dnd/quests/${id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Fehlgeschlagen."); return; }
      if (ok) toast.success(ok);
      setReload((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-xs text-gray-500">{error}</p>;
  if (!log) return null;

  return (
    <section className="space-y-3">
      <h2 className="font-battle text-sm text-white">Quests</h2>

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Laufend ({log.active.length})</p>
        {log.active.length === 0 ? (
          <p className="text-xs text-gray-500 moba-panel rounded-2xl p-4">Keine laufende Quest. Sprich in einer Location mit den Bewohnern oder nimm unten eine Aktivitäts-Quest an.</p>
        ) : log.active.map((q) => (
          <div key={q.id} className="moba-panel rounded-2xl p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-bold text-white">{q.title}</p>
              {q.home && <Link href="/oma-quest" className="text-[10px] text-sky-300">{q.home.name}</Link>}
              <Reward q={q} />
              <div className="ml-auto flex gap-1.5">
                <button type="button" disabled={busy} onClick={() => void act(q.id, q.tracked ? "untrack" : "track")} className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold ${q.tracked ? "border-amber-300/50 text-amber-200" : "border-white/15 text-gray-300"}`}>
                  {q.tracked ? "★ Verfolgt" : "☆ Verfolgen"}
                </button>
                <button type="button" disabled={busy} onClick={() => { if (window.confirm(`„${q.title}“ abbrechen? Der Fortschritt geht verloren.`)) void act(q.id, "abandon", "Quest abgebrochen"); }} className="rounded-lg border border-red-400/30 text-red-300 px-2.5 py-1 text-[11px] font-semibold hover:bg-red-500/10">Abbrechen</button>
              </div>
            </div>
            <Steps q={q} />
          </div>
        ))}
      </div>

      {log.available.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Verfügbar ({log.available.length})</p>
          {log.available.map((q) => (
            <div key={q.id} className="moba-panel rounded-2xl p-3 flex flex-wrap items-center gap-3">
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{q.title}</p>
                <p className="text-[11px] text-gray-400">{q.description}</p>
                <Reward q={q} />
              </div>
              <button type="button" disabled={busy} onClick={() => void act(q.id, "accept", "Quest angenommen")} className="ml-auto rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5">Annehmen</button>
            </div>
          ))}
        </div>
      )}

      {log.completed.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-400">Abgeschlossen ({log.completed.length})</summary>
          <ul className="mt-2 space-y-1">
            {log.completed.map((q) => <li key={q.id} className="text-gray-500">✓ {q.title} <Reward q={q} /></li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
