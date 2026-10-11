"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star } from "@/components/icons";
import { Select } from "@/components/ui/Select";
import { IDEA_LIFECYCLES, ideaCategoryLabel } from "@/lib/idea-lifecycle";

interface Idea {
  id: string; title: string; category: string | null; lifecycle: string; note: string | null; createdAt: string;
  draftEventId: string | null; game: string | null; author: string; votes: number; average: number; participants: number; helpers: number;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

export default function IdeasBoardClient() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [sort, setSort] = useState<"new" | "stars" | "interest">("new");

  useEffect(() => {
    api<{ ideas: Idea[] }>("/api/community-jobs/ideas/board").then(d => setIdeas(d.ideas)).catch(err => { toast.error(err.message); setIdeas([]); });
  }, []);

  async function move(id: string, lifecycle: string) {
    const before = ideas;
    if (!before || before.find(i => i.id === id)?.lifecycle === lifecycle) return;
    setIdeas(before.map(i => (i.id === id ? { ...i, lifecycle } : i)));
    try {
      await api(`/api/community-jobs/ideas/${id}/status`, { method: "PATCH", body: JSON.stringify({ lifecycle }) });
    } catch (err) {
      setIdeas(before);
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  if (!ideas) return <p className="text-xs text-gray-500">Lädt…</p>;

  const sorted = [...ideas].sort((a, b) => sort === "stars" ? b.average - a.average || b.votes - a.votes
    : sort === "interest" ? (b.participants + b.helpers) - (a.participants + a.helpers) : +new Date(b.createdAt) - +new Date(a.createdAt));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        Sortierung:
        <Select size="sm" value={sort} onChange={e => setSort(e.target.value as typeof sort)} aria-label="Sortierung">
          <option value="new">Neueste</option>
          <option value="stars">Beste Bewertung</option>
          <option value="interest">Meistes Interesse</option>
        </Select>
      </div>
      <div className="grid gap-3 lg:grid-cols-5 md:grid-cols-3 grid-cols-1">
        {IDEA_LIFECYCLES.map(col => {
          const items = sorted.filter(i => i.lifecycle === col.id);
          return (
            <div key={col.id}
              onDragOver={e => { e.preventDefault(); setOverCol(col.id); }} onDragLeave={() => setOverCol(cur => (cur === col.id ? null : cur))}
              onDrop={() => { if (dragId) move(dragId, col.id); setDragId(null); setOverCol(null); }}
              className={`rounded-xl border p-2 space-y-2 min-h-32 transition-colors ${overCol === col.id ? "border-teal-500/50 bg-teal-500/[0.05]" : "border-white/10 bg-white/[0.02]"}`}>
              <p className="text-[11px] font-semibold text-gray-300 px-1">{col.label} <span className="text-gray-600">({items.length})</span></p>
              {items.map(i => (
                <div key={i.id} draggable onDragStart={() => setDragId(i.id)} onDragEnd={() => { setDragId(null); setOverCol(null); }}
                  className="rounded-lg bg-white/[0.04] border border-white/10 p-2 space-y-1 cursor-grab active:cursor-grabbing">
                  <Link href={`/community-board/idea/${i.id}`} className="block text-xs text-gray-100 hover:text-teal-300 transition-colors line-clamp-2">{i.title}</Link>
                  <p className="text-[10px] text-gray-500 truncate">
                    {i.author}{ideaCategoryLabel(i.category) ? ` · ${ideaCategoryLabel(i.category)}` : ""}{i.game ? ` · ${i.game}` : ""}
                  </p>
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    {i.votes > 0 ? <>{i.average.toFixed(1)}<Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" /> · {i.votes}</> : "keine Stimmen"}
                    {(i.participants + i.helpers) > 0 && <span> · 🙋 {i.participants}/{i.helpers}</span>}
                  </p>
                  {i.draftEventId && <Link href={`/admin/events/${i.draftEventId}`} className="block text-[10px] text-teal-400 hover:text-teal-300">Event-Entwurf →</Link>}
                  <Select size="sm" value={i.lifecycle} onChange={e => move(i.id, e.target.value)} className="w-full" aria-label="Status">
                    {IDEA_LIFECYCLES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
                  </Select>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
