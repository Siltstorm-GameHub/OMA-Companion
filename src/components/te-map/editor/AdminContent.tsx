"use client";

// ============================================
// Admin: alle Locations und Quests von OMA Quest bearbeiten und löschen (feste wie Community-Locations)
// ============================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Loc { id: string; slug: string; name: string; locationType: string; hexCol: number; hexRow: number; fixed: boolean; players: number; editedWorldId: string | null; author: string | null }
interface Quest { id: string; slug: string; title: string; description: string; objectiveType: string; targetCount: number; xpReward: number; coinReward: number; location: { slug: string; name: string } | null; isWorldQuest: boolean }
interface Content { locations: Loc[]; quests: Quest[]; removed: { kind: "LOCATION" | "QUEST"; slug: string }[] }

const START_SLUG = "hafenstadt";
const field = "mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";

export default function AdminContent() {
  const router = useRouter();
  const [data, setData] = useState<Content | null>(null);
  const [reload, setReload] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Quest | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/admin/content").then((r) => r.json()).then((j) => { if (!cancelled && j.locations) setData(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [reload]);

  const call = async (url: string, init: RequestInit, ok?: string) => {
    setBusy(true);
    try {
      const res = await fetch(url, init);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Fehlgeschlagen."); return null; }
      if (ok) toast.success(ok);
      setReload((n) => n + 1);
      return json;
    } finally {
      setBusy(false);
    }
  };

  const editLocation = async (slug: string) => {
    const json = await call(`/api/dnd/admin/locations/${slug}`, { method: "POST" });
    if (json?.id) router.push(`/oma-quest/editor/${json.id}`);
  };
  const deleteLocation = async (l: Loc) => {
    const warn = l.players > 0 ? `\n\n${l.players} Charakter(e) stehen dort und bleiben auf dem (dann leeren) Feld stehen.` : "";
    if (!window.confirm(`„${l.name}“ samt Quest und Story-Verlauf endgültig löschen?${warn}`)) return;
    await call(`/api/dnd/admin/locations/${l.slug}`, { method: "DELETE" }, "Location gelöscht");
  };
  const saveQuest = async () => {
    if (!draft) return;
    const ok = await call(`/api/dnd/admin/quests/${draft.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: draft.title, description: draft.description, targetCount: draft.targetCount, xpReward: draft.xpReward, coinReward: draft.coinReward }),
    }, "Quest gespeichert");
    if (ok) { setEditing(null); setDraft(null); }
  };
  const deleteQuest = async (q: Quest) => {
    if (!window.confirm(`Quest „${q.title}“ samt allem Fortschritt löschen?`)) return;
    await call(`/api/dnd/admin/quests/${q.id}`, { method: "DELETE" }, "Quest gelöscht");
  };
  const restore = (kind: "LOCATION" | "QUEST", slug: string) =>
    call("/api/dnd/admin/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, slug }) }, "Wiederhergestellt");

  if (!data) return null;
  const activity = data.quests.filter((q) => !q.isWorldQuest);
  const worldQuests = data.quests.filter((q) => q.isWorldQuest);

  return (
    <div className="space-y-5">
      <section className="moba-panel rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-widest">Alle Locations ({data.locations.length})</p>
        <ul className="divide-y divide-white/5">
          {data.locations.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-2 py-2 text-xs">
              <span className="font-bold text-white">{l.name}</span>
              <span className="text-gray-500">{l.fixed ? "fest" : `von ${l.author ?? "?"}`} · Feld {l.hexCol}, {l.hexRow}{l.players ? ` · ${l.players} Spieler` : ""}</span>
              <div className="ml-auto flex gap-2">
                <button type="button" disabled={busy} onClick={() => void editLocation(l.slug)} className="rounded-lg border border-white/15 text-gray-200 font-semibold px-3 py-1.5 hover:border-white/30">Bearbeiten</button>
                {l.slug !== START_SLUG && (
                  <button type="button" disabled={busy} onClick={() => void deleteLocation(l)} className="rounded-lg border border-red-400/30 text-red-300 font-semibold px-3 py-1.5 hover:bg-red-500/10">Löschen</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="moba-panel rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-semibold text-amber-300 uppercase tracking-widest">Aktivitäts-Quests ({activity.length})</p>
        <ul className="divide-y divide-white/5">
          {activity.map((q) => (
            <li key={q.id} className="py-2 text-xs space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-white">{q.title}</span>
                <span className="text-gray-500">{q.objectiveType} × {q.targetCount} · {q.xpReward} XP{q.coinReward ? ` · ${q.coinReward} Coins` : ""}</span>
                <div className="ml-auto flex gap-2">
                  <button type="button" disabled={busy} onClick={() => { setEditing(editing === q.id ? null : q.id); setDraft(editing === q.id ? null : { ...q }); }} className="rounded-lg border border-white/15 text-gray-200 font-semibold px-3 py-1.5 hover:border-white/30">
                    {editing === q.id ? "Abbrechen" : "Bearbeiten"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => void deleteQuest(q)} className="rounded-lg border border-red-400/30 text-red-300 font-semibold px-3 py-1.5 hover:bg-red-500/10">Löschen</button>
                </div>
              </div>
              {editing === q.id && draft && (
                <div className="grid gap-2 sm:grid-cols-2 text-[11px] text-gray-400">
                  <label>Titel<input value={draft.title} maxLength={80} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className={field} /></label>
                  <label>Ziel (Anzahl)<input type="number" min={1} value={draft.targetCount} onChange={(e) => setDraft({ ...draft, targetCount: Math.round(Number(e.target.value)) })} className={field} /></label>
                  <label className="sm:col-span-2">Beschreibung<textarea value={draft.description} maxLength={500} rows={2} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className={field} /></label>
                  <label>XP<input type="number" min={0} max={1000} value={draft.xpReward} onChange={(e) => setDraft({ ...draft, xpReward: Math.round(Number(e.target.value)) })} className={field} /></label>
                  <label>Coins<input type="number" min={0} max={1000} value={draft.coinReward} onChange={(e) => setDraft({ ...draft, coinReward: Math.round(Number(e.target.value)) })} className={field} /></label>
                  <button type="button" disabled={busy} onClick={() => void saveQuest()} className="sm:col-span-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold py-1.5">Speichern</button>
                </div>
              )}
            </li>
          ))}
        </ul>
        {worldQuests.length > 0 && (
          <p className="text-[11px] text-gray-500 pt-1">
            Die {worldQuests.length} Location-Quests ({worldQuests.map((q) => q.title).slice(0, 3).join(", ")} …) bearbeitest du im Editor der jeweiligen Location; sie verschwinden mit ihr.
          </p>
        )}
      </section>

      {data.removed.length > 0 && (
        <section className="moba-panel rounded-2xl p-4 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Gelöschte feste Inhalte</p>
          <ul className="space-y-1">
            {data.removed.map((r) => (
              <li key={`${r.kind}-${r.slug}`} className="flex items-center gap-2 text-xs text-gray-400">
                {r.kind === "LOCATION" ? "Location" : "Quest"} „{r.slug}“
                <button type="button" disabled={busy} onClick={() => void restore(r.kind, r.slug)} className="ml-auto rounded-lg border border-white/15 text-gray-200 font-semibold px-3 py-1.5 hover:border-white/30">Wiederherstellen</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
