"use client";
import { useState } from "react";
import { toast } from "sonner";
import { SEASON_TEMPLATES, defaultRange, type SeasonKey } from "@/lib/dnd/season-events";

interface Row { id: string; key: string; startsAt: string; endsAt: string; active: boolean }
const input = "rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";
const day = (iso: string) => iso.slice(0, 10);

export function SeasonEventsPanel({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const year = new Date().getFullYear();
  const [key, setKey] = useState<SeasonKey>("halloween");
  const [range, setRange] = useState(() => { const r = defaultRange("halloween", year); return { startsAt: r.startsAt.toISOString().slice(0, 10), endsAt: r.endsAt.toISOString().slice(0, 10) }; });

  async function call(method: "POST" | "PATCH" | "DELETE", body?: unknown, query = "") {
    const res = await fetch(`/api/admin/season-events${query}`, { method, headers: { "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Fehlgeschlagen"); return false; }
    setRows(data);
    return true;
  }
  const edit = (id: string, patch: Partial<Row>) => setRows((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const pickKey = (k: SeasonKey) => { setKey(k); const r = defaultRange(k, year); setRange({ startsAt: r.startsAt.toISOString().slice(0, 10), endsAt: r.endsAt.toISOString().slice(0, 10) }); };
  const [now] = useState(() => Date.now());
  const status = (r: Row) => (!r.active ? "aus" : now < +new Date(r.startsAt) ? "geplant" : now <= +new Date(r.endsAt) ? "läuft" : "vorbei");

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Ein Saison-Event verkleidet in seinem Zeitfenster die festen Locations (Objekte, Stimmung, Event-Monster) und schaltet seine Quests frei. Danach verschwindet alles wieder; Fortschritt und Belohnungen bleiben. Zeiten in deutscher Zeit; das Ende gilt einschließlich.</p>
      <div className="space-y-2">
        {rows.map((r) => {
          const t = SEASON_TEMPLATES[r.key as SeasonKey];
          return (
            <div key={r.id} className="moba-panel rounded-xl p-2.5 grid grid-cols-[1fr_auto] gap-2 items-center text-xs">
              <p className="text-white font-semibold">{t?.icon} {t?.name ?? r.key} <span className="ml-1 rounded-full px-2 py-0.5 text-[10px] bg-black/40 text-gray-300">{status(r)}</span></p>
              <label className="flex items-center gap-1.5 text-gray-300"><input type="checkbox" checked={r.active} onChange={(e) => edit(r.id, { active: e.target.checked })} /> Aktiv</label>
              <div className="col-span-2 flex flex-wrap items-center gap-2 text-gray-400">
                Von <input type="date" value={day(r.startsAt)} onChange={(e) => edit(r.id, { startsAt: e.target.value })} className={input} />
                bis <input type="date" value={day(r.endsAt)} onChange={(e) => edit(r.id, { endsAt: e.target.value })} className={input} />
                <button type="button" onClick={async () => { if (await call("PATCH", { id: r.id, active: r.active, startsAt: `${day(r.startsAt)}T00:00:00`, endsAt: `${day(r.endsAt)}T23:59:59` })) toast.success("Gespeichert"); }} className="ml-auto rounded-lg bg-violet-600 text-white px-3 py-1 font-semibold">Speichern</button>
                <button type="button" onClick={async () => { if (window.confirm("Dieses Event entfernen?")) await call("DELETE", undefined, `?id=${r.id}`); }} className="rounded-lg border border-red-400/30 text-red-300 px-3 py-1 font-semibold">Entfernen</button>
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <p className="text-xs text-gray-500">Noch kein Event angelegt.</p>}
      </div>
      <div className="moba-panel rounded-xl p-2.5 space-y-2 text-xs">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">Neues Event</p>
        <div className="flex flex-wrap items-center gap-2 text-gray-300">
          <select value={key} onChange={(e) => pickKey(e.target.value as SeasonKey)} className={input}>
            {(Object.values(SEASON_TEMPLATES)).map((t) => <option key={t.key} value={t.key}>{t.icon} {t.name}</option>)}
          </select>
          Von <input type="date" value={range.startsAt} onChange={(e) => setRange({ ...range, startsAt: e.target.value })} className={input} />
          bis <input type="date" value={range.endsAt} onChange={(e) => setRange({ ...range, endsAt: e.target.value })} className={input} />
        </div>
        <p className="text-gray-500">{SEASON_TEMPLATES[key].blurb} Monster: {SEASON_TEMPLATES[key].monsters.length}, Raid-Boss: {SEASON_TEMPLATES[key].raid === "reiter" ? "Kopfloser Reiter" : "Rudolph der Rotnasige"}, Quests: {SEASON_TEMPLATES[key].quests.length}.</p>
        <button type="button" onClick={async () => { if (await call("POST", { key, startsAt: `${range.startsAt}T00:00:00`, endsAt: `${range.endsAt}T23:59:59` })) toast.success("Event angelegt"); }} className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 font-semibold">Event anlegen</button>
      </div>
    </div>
  );
}
