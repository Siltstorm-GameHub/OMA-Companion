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
import { STARTERS, type StarterId } from "@/lib/te-map/starters";

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
  const [picking, setPicking] = useState(false);
  const [emptyTheme, setEmptyTheme] = useState<"outdoor" | "cave">("outdoor");
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

  const create = async (template: StarterId, theme: "outdoor" | "cave") => {
    setCreating(true);
    try {
      const res = await fetch("/api/dnd/custom-worlds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ theme, template }) });
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
            <button type="button" disabled={creating || atLimit} onClick={() => setPicking((p) => !p)} className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold px-3 py-1.5">{picking ? "Abbrechen" : "+ Neue Location"}</button>
          </div>
        </div>
        {picking && (
          <div className="moba-panel rounded-2xl p-3 space-y-2">
            <p className="text-xs text-gray-300">Womit möchtest du starten? Alle Vorlagen sind schon spielbar und lassen sich beliebig umbauen.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {STARTERS.map((st) => (
                <button key={st.id} type="button" disabled={creating} onClick={() => void create(st.id, st.id === "leer" ? emptyTheme : st.theme)} className="rounded-xl border border-white/10 hover:border-amber-400/60 bg-white/[0.03] p-3 text-left disabled:opacity-50">
                  <span className="text-2xl">{st.icon}</span>
                  <span className="block text-sm font-bold text-white mt-1">{st.label}</span>
                  <span className="block text-[11px] text-gray-400 mt-0.5">{st.description}</span>
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-[11px] text-gray-400">Thema der leeren Karte
              <select value={emptyTheme} onChange={(e) => setEmptyTheme(e.target.value as "outdoor" | "cave")} className="rounded bg-zinc-900 border border-white/10 px-1.5 py-0.5 text-white">
                <option value="outdoor">Draußen</option><option value="cave">Höhle</option>
              </select>
            </label>
          </div>
        )}
        {mine.length === 0 ? (
          <p className="text-xs text-gray-500 moba-panel rounded-2xl p-4">Du hast noch keine Location gebaut. Lege oben eine an — mit einer Vorlage ist sie in einer Minute spielbar.</p>
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
