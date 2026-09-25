"use client";

// ============================================
// Übersicht der eigenen Community-Locations (+ Prüf-Liste für Admins)
// ============================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import AdminContent from "./AdminContent";

interface Row {
  id: string;
  slug: string;
  title: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  updatedAt: string;
  author: { name: string | null; username: string | null };
}

const STATUS = {
  draft: { text: "Entwurf", cls: "bg-zinc-700/60 text-gray-200" },
  published: { text: "Veröffentlicht", cls: "bg-emerald-500/20 text-emerald-300" },
};

export default function WorldList() {
  const router = useRouter();
  const [mine, setMine] = useState<Row[] | null>(null);
  const [max, setMax] = useState(3);
  const [isAdmin, setIsAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = () => setReloadKey((k) => k + 1);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/custom-worlds")
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error ?? "Konnte nicht geladen werden."); return; }
        setMine(json.mine);
        setMax(json.max);
        setIsAdmin(json.isAdmin);
      })
      .catch(() => { if (!cancelled) setError("Netzwerkfehler."); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const create = async (theme: "outdoor" | "cave") => {
    setCreating(true);
    try {
      const res = await fetch("/api/dnd/custom-worlds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme }) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Anlegen fehlgeschlagen."); return; }
      router.push(`/oma-quest/editor/${json.id}`);
    } finally {
      setCreating(false);
    }
  };

  const remove = async (row: Row) => {
    if (!window.confirm(`„${row.title}“ wirklich löschen?`)) return;
    const res = await fetch(`/api/dnd/custom-worlds/${row.id}`, { method: "DELETE" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(json.error ?? "Löschen fehlgeschlagen."); return; }
    load();
  };

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!mine) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-gray-500 animate-spin" /></div>;

  const atLimit = !isAdmin && mine.length >= max;

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Meine Locations{!isAdmin && ` (${mine.length}/${max})`}</p>
          <div className="ml-auto flex gap-2">
            <button type="button" disabled={creating || atLimit} onClick={() => void create("outdoor")} className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5">+ Draußen</button>
            <button type="button" disabled={creating || atLimit} onClick={() => void create("cave")} className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5">+ Höhle</button>
          </div>
        </div>
        {mine.length === 0 ? (
          <p className="text-xs text-gray-500 moba-panel rounded-2xl p-4">Du hast noch keine Location gebaut. Lege oben eine an — mit Karte, NPCs und einer kleinen Quest.</p>
        ) : (
          <ul className="space-y-2">
            {mine.map((r) => (
              <li key={r.id} className="moba-panel rounded-2xl p-3 flex flex-wrap items-center gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{r.title}</p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${STATUS[r.status === "PUBLISHED" ? "published" : "draft"].cls}`}>{STATUS[r.status === "PUBLISHED" ? "published" : "draft"].text}</span>
                <div className="ml-auto flex gap-2">
                  <Link href={`/oma-quest/editor/${r.id}`} className="rounded-lg border border-white/15 text-gray-200 text-xs font-semibold px-3 py-1.5 hover:border-white/30">
                    Bearbeiten
                  </Link>
                  {r.status === "PUBLISHED" && <Link href="/oma-quest" className="rounded-lg border border-emerald-400/30 text-emerald-300 text-xs font-semibold px-3 py-1.5">Zur Weltkarte</Link>}
                  {r.status !== "PUBLISHED" && (
                    <button type="button" onClick={() => void remove(r)} className="rounded-lg border border-red-400/30 text-red-300 text-xs font-semibold px-3 py-1.5 hover:bg-red-500/10">Löschen</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {isAdmin && <AdminContent />}
    </div>
  );
}
