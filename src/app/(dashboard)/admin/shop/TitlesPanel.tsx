"use client";
import { useState } from "react";
import { toast } from "sonner";

interface Title { id: string; name: string; icon: string; desc: string; price: number; active: boolean }
const input = "rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";
const EMPTY = { name: "", icon: "🏅", desc: "", price: 150 };

export function TitlesPanel({ initial }: { initial: Title[] }) {
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState(EMPTY);

  async function call(method: "POST" | "PATCH" | "DELETE", body?: unknown, query = "") {
    const res = await fetch(`/api/admin/dnd-titles${query}`, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Fehlgeschlagen"); return false; }
    setRows(data);
    return true;
  }
  const edit = (id: string, patch: Partial<Title>) => setRows((r) => r.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Ehrentitel im Münzen-Laden von OMA Quest. Wer einen Titel schon besitzt, behält ihn auch nach dem Entfernen oder Umbenennen (der Titeltext wird beim Charakter gespeichert).</p>
      <div className="space-y-2">
        {rows.map((t) => (
          <div key={t.id} className="moba-panel rounded-xl p-2.5 grid grid-cols-[48px_1fr_80px] gap-2 items-center">
            <input value={t.icon} onChange={(e) => edit(t.id, { icon: e.target.value })} className={`${input} text-center`} aria-label="Symbol" />
            <input value={t.name} onChange={(e) => edit(t.id, { name: e.target.value })} className={input} aria-label="Name" />
            <input type="number" min={0} value={t.price} onChange={(e) => edit(t.id, { price: Number(e.target.value) })} className={input} aria-label="Preis in Münzen" />
            <input value={t.desc} onChange={(e) => edit(t.id, { desc: e.target.value })} className={`${input} col-span-3`} aria-label="Beschreibung" placeholder="Beschreibung" />
            <div className="col-span-3 flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 text-gray-300"><input type="checkbox" checked={t.active} onChange={(e) => edit(t.id, { active: e.target.checked })} /> Im Angebot</label>
              <button type="button" onClick={async () => { if (await call("PATCH", { id: t.id, name: t.name, icon: t.icon, desc: t.desc, price: t.price, active: t.active })) toast.success("Gespeichert"); }} className="ml-auto rounded-lg bg-violet-600 text-white px-3 py-1 font-semibold">Speichern</button>
              <button type="button" onClick={async () => { if (window.confirm(`„${t.name}“ entfernen?`)) await call("DELETE", undefined, `?id=${t.id}`); }} className="rounded-lg border border-red-400/30 text-red-300 px-3 py-1 font-semibold">Entfernen</button>
            </div>
          </div>
        ))}
      </div>
      <div className="moba-panel rounded-xl p-2.5 grid grid-cols-[48px_1fr_80px] gap-2 items-center">
        <input value={draft.icon} onChange={(e) => setDraft({ ...draft, icon: e.target.value })} className={`${input} text-center`} aria-label="Symbol" />
        <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={input} placeholder="Neuer Titel" aria-label="Name" />
        <input type="number" min={0} value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} className={input} aria-label="Preis in Münzen" />
        <input value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} className={`${input} col-span-3`} placeholder="Beschreibung" aria-label="Beschreibung" />
        <button type="button" onClick={async () => { if (await call("POST", draft)) { setDraft(EMPTY); toast.success("Titel angelegt"); } }} className="col-span-3 rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-xs font-semibold">Titel hinzufügen</button>
      </div>
    </div>
  );
}
