"use client";

// ============================================
// OMA Quest — Begleiter: gezähmte Monster ansehen und einen ausrüsten
// ============================================
// Der ausgerüstete Begleiter läuft auf der Karte und in den Locations hinter dem Helden her und gibt einen kleinen Bonus im Kampf.

import { useEffect, useState } from "react";
import MonsterSprite from "@/components/te-map/play/MonsterSprite";

interface Entry { id: string; name: string; emoji: string; level: number; bonus: string }
interface View { owned: Entry[]; equipped: string | null }

export default function CompanionPanel({ onChanged }: { onChanged?: () => void }) {
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/companions").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setView(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const equip = async (id: string | null) => {
    setBusy(true);
    try {
      const res = await fetch("/api/dnd/companions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ equip: id }) });
      if (res.ok) { setView(await res.json()); onChanged?.(); }
    } finally { setBusy(false); }
  };

  if (!view) return null;
  return (
    <div className="oq-slot p-3 space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">🐾 Begleiter ({view.owned.length})</p>
      {view.owned.length === 0 ? (
        <p className="text-xs text-gray-400">Noch keine. Schwäche ein wildes Monster auf unter 25 % seiner Lebenspunkte und wirf im Kampf einen Zähmköder — die gibt es beim Händler. Jedes Monster lässt sich einmal zähmen (keine Bosse).</p>
      ) : (
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {view.owned.map((c) => {
            const on = view.equipped === c.id;
            return (
              <li key={c.id}>
                <button type="button" disabled={busy} onClick={() => void equip(on ? null : c.id)} aria-pressed={on} className={`w-full rounded-md border-2 px-2 py-1.5 text-left text-xs flex items-center gap-2 transition ${on ? "border-emerald-400/70 bg-emerald-500/15 text-white" : "border-white/10 bg-black/30 text-gray-200 hover:border-white/30"}`}>
                  <span className="w-10 h-10 grid place-items-center shrink-0"><MonsterSprite monsterId={c.id} box={34} /></span>
                  <span className="min-w-0"><b className="block truncate">{c.name}</b><span className="text-[11px] opacity-80">{c.bonus}</span></span>
                  <span className="ml-auto text-[10px] font-black">{on ? "dabei ✓" : "mitnehmen"}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
