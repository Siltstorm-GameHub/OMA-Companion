"use client";

// ============================================
// OMA Quest — Quest-Log: laufende Quests (verfolgen/abbrechen), Aktivitäts-Quests zum Annehmen, Abgeschlossenes
// ============================================
// Gruppiert in Tagesaufträge (gemeinsame Liste, setzt sich täglich zurück), Hauptstory (feste Locations, von
// Admins verwaltet), Community-Questreihen (mit Autor und Reihen-/Teil-Angabe) und Gemeinschaft (App-Aktivität).

import { useEffect, useState } from "react";
import Link from "next/link";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import type { LogQuest } from "@/lib/dnd/quest-log";
import { metaOf } from "@/lib/dnd/quest-objectives";

interface StoryProgress { completedChapters: number; totalChapters: number; chapters: { slug: string; title: string; total: number; done: number; started: boolean; complete: boolean }[] }
interface Log { active: LogQuest[]; available: LogQuest[]; completed: LogQuest[]; story: StoryProgress }

/** Kompakte „Kapitel X von 10"-Leiste statt einzelner Hauptstory-Einträge in der Liste. */
function StoryBar({ story }: { story: StoryProgress }) {
  const pct = story.totalChapters ? Math.round((story.completedChapters / story.totalChapters) * 100) : 0;
  return (
    <div className="oq-panel p-3 space-y-1.5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-amber-300">📖 Hauptstory</p>
        <p className="text-xs text-gray-400">Kapitel {story.completedChapters} von {story.totalChapters}</p>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-amber-400" style={{ width: `${pct}%` }} /></div>
      <div className="flex flex-wrap gap-1 pt-0.5">
        {story.chapters.map((c, i) => (
          <span key={c.slug} title={c.title} className={`w-4 h-4 rounded-full text-[9px] grid place-items-center border ${c.complete ? "bg-emerald-500/30 border-emerald-400/50 text-emerald-200" : c.started ? "border-amber-300 text-amber-300" : "border-white/15 text-gray-600"}`}>
            {c.complete ? "✓" : i}
          </span>
        ))}
      </div>
    </div>
  );
}

function Reward({ q }: { q: LogQuest }) {
  return <span className="text-[10px] text-gray-500">{q.xpReward} XP{q.coinReward ? ` · ${q.coinReward} Coins` : ""}</span>;
}

/** Autor/Questreihe einer Community-Quest, oder "Hauptstory" für die festen Locations. */
function Origin({ q }: { q: LogQuest }) {
  if (q.kind !== "world") return null;
  if (!q.author) return <span className="text-[10px] text-amber-300/80 uppercase tracking-wide">Hauptstory</span>;
  return (
    <span className="text-[10px] text-sky-300/90">
      {q.questline ? <>{q.questline}{q.part ? ` · Teil ${q.part}` : ""} · </> : null}von {q.author}
    </span>
  );
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
              {s.kind === "goal" && <span className="mr-1" aria-hidden>⚔️</span>}
              {s.text}
              {place && state !== "done" && <span className="text-sky-300"> — {s.kind === "visit" ? "besuche " : s.kind === "enter" ? "betritt ein Gebäude in " : "bei "}{place}</span>}
              {s.kind === "goal" && state === "now" && <span className="text-amber-300"> ({s.goalCurrent ?? 0}/{s.goalTarget ?? 1})</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function QuestCard({ q, busy, act, showOrigin = true }: { q: LogQuest; busy: boolean; act: (id: string, action: "track" | "untrack" | "abandon", ok?: string) => void; showOrigin?: boolean }) {
  const meta = metaOf(q.objectiveType);
  return (
    <div className="oq-panel p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden>{meta.icon}</span>
        <p className="text-sm font-bold text-white">{q.title}</p>
        {q.bounty && <span className="text-[9px] font-bold uppercase tracking-wide text-amber-300 border border-amber-400/40 rounded-full px-1.5 py-0.5">Tagesauftrag</span>}
        {q.home && <Link href="/oma-quest" className="text-[10px] text-sky-300">{q.home.name}</Link>}
        <Reward q={q} />
        <div className="ml-auto flex gap-1.5">
          <button type="button" disabled={busy} onClick={() => act(q.id, q.tracked ? "untrack" : "track")} className={`oq-btn px-2.5 py-1 text-[11px] ${q.tracked ? "oq-btn-gold" : ""}`}>
            {q.tracked ? "★ Verfolgt" : "☆ Verfolgen"}
          </button>
          <button type="button" disabled={busy} onClick={() => { if (window.confirm(`„${q.title}“ abbrechen? Der Fortschritt geht verloren.`)) act(q.id, "abandon", "Quest abgebrochen"); }} className="oq-btn px-2.5 py-1 text-[11px]">Abbrechen</button>
        </div>
      </div>
      {showOrigin && <Origin q={q} />}
      <Steps q={q} />
    </div>
  );
}

export default function QuestLog({ notify, compact = false }: { notify?: Notify; /** Startet eingeklappt (Kurz-Übersicht + Button), z. B. auf der Hub-Seite */ compact?: boolean } = {}) {
  const { notify: say, node } = useNotice(notify);
  const [log, setLog] = useState<Log | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

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
      if (!res.ok) { say("error", json.error ?? "Fehlgeschlagen."); return; }
      if (ok) say("info", ok);
      setReload((n) => n + 1);
    } finally {
      setBusy(false);
    }
  };

  if (error) return <p className="text-xs text-gray-500">{error}</p>;
  if (!log) return null;

  const bountiesActive = log.active.filter((q) => q.bounty);
  const bountiesAvailable = log.available.filter((q) => q.bounty);
  const otherActive = log.active.filter((q) => !q.bounty);
  const otherAvailable = log.available.filter((q) => !q.bounty);
  const worldActive = otherActive.filter((q) => q.kind === "world");
  const activityActive = otherActive.filter((q) => q.kind === "activity");

  const bountyGroup = (cadence: "daily" | "monthly", label: string) => {
    const active = bountiesActive.filter((q) => q.bountyCadence === cadence);
    const available = bountiesAvailable.filter((q) => q.bountyCadence === cadence);
    if (!active.length && !available.length) return null;
    return (
      <div key={cadence} className="space-y-2">
        <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-widest">{label} — für alle gleich, keine Story</p>
        {active.map((q) => <QuestCard key={q.id} q={q} busy={busy} act={act} showOrigin={false} />)}
        {available.map((q) => (
          <div key={q.id} className="oq-panel p-3 flex flex-wrap items-center gap-3">
            <span aria-hidden>{metaOf(q.objectiveType).icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{q.title}</p>
              <p className="text-[11px] text-gray-400">{q.description}</p>
              <Reward q={q} />
            </div>
            <button type="button" disabled={busy} onClick={() => void act(q.id, "accept", "Quest angenommen")} className="ml-auto oq-btn oq-btn-primary text-xs px-3 py-1.5">Annehmen</button>
          </div>
        ))}
      </div>
    );
  };

  if (compact && !expanded) {
    const bountiesDone = bountiesActive.filter((q) => q.current >= q.target).length;
    return (
      <section className="space-y-3">
        {node}
        <StoryBar story={log.story} />
        <button type="button" onClick={() => setExpanded(true)} className="oq-panel w-full p-3 flex items-center justify-between gap-3 text-left hover:brightness-110 transition">
          <span className="text-sm text-white">
            🎯 {bountiesDone}/{bountiesActive.length + bountiesAvailable.length} Aufträge heute · {otherActive.length} laufende Quest{otherActive.length === 1 ? "" : "s"}
          </span>
          <span className="oq-btn oq-btn-primary text-xs px-3 py-1.5 shrink-0">Quest-Log öffnen</span>
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-battle text-sm text-white">Quests</h2>
        {compact && <button type="button" onClick={() => setExpanded(false)} className="oq-btn text-[11px] px-2 py-1">Einklappen</button>}
      </div>
      {node}

      <StoryBar story={log.story} />

      {bountyGroup("daily", "🎯 Tagesaufträge")}
      {bountyGroup("monthly", "📆 Monatsaufträge")}

      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Laufend ({otherActive.length})</p>
        {otherActive.length === 0 ? (
          <p className="text-xs text-gray-500 oq-panel p-4">Keine laufende Quest. Sprich in einer Location mit den Bewohnern oder nimm unten eine Aktivitäts-Quest an.</p>
        ) : (
          <>
            {worldActive.map((q) => <QuestCard key={q.id} q={q} busy={busy} act={act} />)}
            {activityActive.map((q) => <QuestCard key={q.id} q={q} busy={busy} act={act} showOrigin={false} />)}
          </>
        )}
      </div>

      {otherAvailable.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Verfügbar ({otherAvailable.length})</p>
          {otherAvailable.map((q) => (
            <div key={q.id} className={`oq-panel p-3 flex flex-wrap items-center gap-3 ${q.locked ? "opacity-60" : ""}`}>
              <span aria-hidden>{metaOf(q.objectiveType).icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white">{q.title}</p>
                <p className="text-[11px] text-gray-400">{q.description}</p>
                <Reward q={q} />
                {q.locked && <p className="text-[10px] text-amber-400">🔒 Erst nach einer vorherigen Quest verfügbar.</p>}
              </div>
              <button type="button" disabled={busy || q.locked} onClick={() => void act(q.id, "accept", "Quest angenommen")} className="ml-auto oq-btn oq-btn-primary text-xs px-3 py-1.5 disabled:opacity-50">Annehmen</button>
            </div>
          ))}
        </div>
      )}

      {log.completed.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer text-gray-400">Abgeschlossen ({log.completed.length})</summary>
          <ul className="mt-2 space-y-1">
            {log.completed.map((q) => (
              <li key={q.id} className="text-gray-500">
                {metaOf(q.objectiveType).icon} {q.title} <Reward q={q} />
                {q.kind === "world" && q.author && <span className="text-[10px] text-sky-300/70"> — {q.questline ? `${q.questline}${q.part ? ` · Teil ${q.part}` : ""}, ` : ""}von {q.author}</span>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
