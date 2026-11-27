"use client";
// Team-Ansicht der Ideen: oben "Braucht Antwort" (In Prüfung bzw. offen mit genug Unterstützern oder abgelaufener
// Frist), darunter alle Ideen nach Status. Status per Auswahl (auch am Handy), Begründung bei Abgelehnt/Umgesetzt
// Pflicht — sie geht an Autor, Unterstützer, Helfer und Bewerter.

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { formatFixed } from "@/lib/format-number";
import { formatBerlinDate } from "@/lib/time";
import { ChevronDown, Star } from "@/components/icons";
import { Select } from "@/components/ui/Select";
import { buttonClasses } from "@/components/ui/button-styles";
import { IDEA_LIFECYCLES, LIFECYCLES_NEEDING_NOTE, ideaCategoryLabel } from "@/lib/idea-lifecycle";

interface Idea {
  id: string; title: string; category: string | null; lifecycle: string; note: string | null; createdAt: string; votingEndsAt: string | null;
  game: string | null; author: string; votes: number; average: number; supporters: number; helpers: number; needsAnswer: boolean;
  waitingSince: string | null;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

type Sort = "new" | "supporters" | "stars" | "waiting";

export default function IdeasBoardClient() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [threshold, setThreshold] = useState(5);
  const [sort, setSort] = useState<Sort>("waiting");
  const [now] = useState(() => Date.now());

  function load() {
    api<{ ideas: Idea[]; threshold: number }>("/api/community-jobs/ideas/board")
      .then(d => { setIdeas(d.ideas); setThreshold(d.threshold); })
      .catch(err => { toast.error(err.message); setIdeas([]); });
  }
  useEffect(load, []);

  if (!ideas) return <p className="text-xs text-subtle">Lädt…</p>;
  const waitMs = (i: Idea) => (i.waitingSince ? now - new Date(i.waitingSince).getTime() : -1);
  const sorted = [...ideas].sort((a, b) => sort === "waiting" ? waitMs(b) - waitMs(a) || b.supporters - a.supporters
    : sort === "stars" ? b.average - a.average || b.votes - a.votes
    : sort === "supporters" ? b.supporters - a.supporters || +new Date(b.createdAt) - +new Date(a.createdAt)
    : +new Date(b.createdAt) - +new Date(a.createdAt));
  const queue = sorted.filter(i => i.needsAnswer);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-subtle">
        Sortierung:
        <Select size="sm" value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sortierung">
          <option value="waiting">Längste Wartezeit</option>
          <option value="supporters">Meiste Unterstützer</option>
          <option value="stars">Beste Bewertung</option>
          <option value="new">Neueste</option>
        </Select>
        <span>· Ab {threshold} Unterstützern bzw. nach Fristende braucht eine Idee eine Antwort.</span>
      </div>

      <section aria-labelledby="queue-title" className="space-y-2">
        <h2 id="queue-title" className="flex items-center gap-2 text-sm font-bold text-fg">
          Braucht Antwort <span className="rounded-full bg-warning px-2 text-xs font-bold leading-5 text-canvas">{queue.length}</span>
        </h2>
        {queue.length === 0
          ? <p className="rounded-card border border-dashed border-line p-4 text-sm text-muted">Alles beantwortet. 🎉</p>
          : <ul className="space-y-2">{queue.map(i => <IdeaRow key={i.id} idea={i} onSaved={load} />)}</ul>}
      </section>

      {IDEA_LIFECYCLES.map(col => {
        const items = sorted.filter(i => i.lifecycle === col.id && !i.needsAnswer);
        if (items.length === 0) return null;
        return (
          <details key={col.id} className="group rounded-card border border-line bg-surface p-3" open={col.id === "PLANNED"}>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-fg">
              <ChevronDown className="size-4 transition-transform group-open:rotate-180" /> {col.label} <span className="text-subtle">({items.length})</span>
            </summary>
            <ul className="mt-2 space-y-2">{items.map(i => <IdeaRow key={i.id} idea={i} onSaved={load} />)}</ul>
          </details>
        );
      })}
    </div>
  );
}

function IdeaRow({ idea: i, onSaved }: { idea: Idea; onSaved: () => void }) {
  const [lifecycle, setLifecycle] = useState(i.lifecycle);
  const [note, setNote] = useState(i.note ?? "");
  const [busy, setBusy] = useState(false);
  const needsNote = (LIFECYCLES_NEEDING_NOTE as readonly string[]).includes(lifecycle);
  const changed = lifecycle !== i.lifecycle || note !== (i.note ?? "");

  async function save() {
    setBusy(true);
    try {
      await api(`/api/community-jobs/ideas/${i.id}/status`, { method: "PATCH", body: JSON.stringify({ lifecycle, note }) });
      toast.success("Status gespeichert — alle Beteiligten sind informiert");
      onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  return (
    <li className="space-y-2 rounded-control border border-line bg-surface-2 p-3">
      <div className="min-w-0">
        <Link href={`/community-board/idea/${i.id}`} className="block text-sm font-semibold text-fg hover:text-primary-fg">{i.title}</Link>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-subtle">
          <span>{i.author}</span>
          {ideaCategoryLabel(i.category) && <span>{ideaCategoryLabel(i.category)}</span>}
          <span className="font-semibold text-primary-fg">{i.supporters} Unterstützer</span>
          {i.helpers > 0 && <span>{i.helpers} helfen mit</span>}
          {i.votes > 0 && <span className="inline-flex items-center gap-0.5">{formatFixed(i.average, 1)}<Star className="size-3 text-coin" /> · {i.votes}</span>}
          {i.votingEndsAt && <span>Frist {formatBerlinDate(i.votingEndsAt, { day: "2-digit", month: "2-digit" })}</span>}
          {i.needsAnswer && i.waitingSince && <WaitingFor since={i.waitingSince} />}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Select size="sm" value={lifecycle} onChange={e => setLifecycle(e.target.value)} aria-label="Status">
          {IDEA_LIFECYCLES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
        </Select>
        <input value={note} onChange={e => setNote(e.target.value)} maxLength={300}
          placeholder={needsNote ? "Begründung (Pflicht)" : "Notiz an alle Beteiligten (optional)"}
          className="min-h-9 min-w-[12rem] flex-1 rounded-control border border-line bg-surface px-3 text-sm text-fg placeholder:text-subtle focus:border-primary focus:outline-none" />
        <button type="button" disabled={busy || !changed || (needsNote && !note.trim())} onClick={save} className={buttonClasses("primary", "sm")}>
          Speichern
        </button>
      </div>
    </li>
  );
}

/** "wartet seit 3 Tagen" — ab 3 Tagen als Warnung, ab 7 als dringend */
function WaitingFor({ since }: { since: string }) {
  const [now] = useState(() => Date.now());
  const days = Math.floor((now - new Date(since).getTime()) / 86_400_000);
  const label = days <= 0 ? "wartet seit heute" : days === 1 ? "wartet seit 1 Tag" : `wartet seit ${days} Tagen`;
  return <span className={`font-semibold ${days >= 7 ? "text-danger" : days >= 3 ? "text-warning" : "text-muted"}`}>{label}</span>;
}
