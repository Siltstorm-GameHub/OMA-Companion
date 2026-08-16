"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, RotateCcw, Search } from "lucide-react";
import { shopItems, type RoomItemDef } from "@/lib/room-items";

/**
 * Preis-Overrides je Katalog-Item — der Katalog selbst (ROOM_ITEMS) bleibt
 * Code, nur die Preise lassen sich hier überschreiben (siehe applyPriceOverrides
 * in room-config.ts). Grundpreis bleibt immer sichtbar, damit ein Admin sieht,
 * wie weit er vom Original abweicht, statt den Katalog-Wert zu verlieren.
 */
export function RoomPricesPanel({ initial }: { initial: Record<string, number> }) {
  const [overrides, setOverrides] = useState<Record<string, number>>(initial);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const groups = useMemo(() => shopItems(), []);
  const q = query.trim().toLowerCase();
  const filteredGroups = q
    ? groups
        .map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q) || i.key.includes(q)) }))
        .filter(g => g.items.length > 0)
    : groups;

  function effectivePrice(def: RoomItemDef): number {
    return overrides[def.key] ?? def.price;
  }

  async function save(def: RoomItemDef) {
    const raw = drafts[def.key];
    if (raw === undefined) return;
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n < 0) { toast.error("Ungültiger Preis"); return; }

    setSaving(def.key);
    try {
      const res = await fetch("/api/admin/room-prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [def.key]: n }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setOverrides(await res.json());
      setDrafts(d => { const next = { ...d }; delete next[def.key]; return next; });
      toast.success(`${def.label}: Preis gespeichert`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(null);
    }
  }

  async function reset(def: RoomItemDef) {
    setSaving(def.key);
    try {
      const res = await fetch("/api/admin/room-prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [def.key]: null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Zurücksetzen fehlgeschlagen");
        return;
      }
      setOverrides(await res.json());
      setDrafts(d => { const next = { ...d }; delete next[def.key]; return next; });
      toast.success(`${def.label}: Grundpreis wiederhergestellt`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Item suchen…"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
        />
      </div>

      {filteredGroups.map(group => (
        <div key={group.category} className="glass rounded-2xl overflow-hidden">
          <p className="px-4 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-widest border-b border-white/5">
            {group.label}
          </p>
          <div className="divide-y divide-white/5">
            {group.items.map(def => {
              const hasOverride = overrides[def.key] !== undefined;
              const draft = drafts[def.key];
              const dirty = draft !== undefined && draft !== String(effectivePrice(def));
              return (
                <div key={def.key} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{def.label}</p>
                    {hasOverride && (
                      <p className="text-[10px] text-amber-400/80">Grundpreis: {def.price.toLocaleString("de-DE")}</p>
                    )}
                  </div>
                  <input
                    type="number" min={0}
                    value={draft ?? effectivePrice(def)}
                    onChange={e => setDrafts(d => ({ ...d, [def.key]: e.target.value }))}
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm text-right tabular-nums focus:outline-none focus:border-teal-500/50"
                  />
                  <button
                    onClick={() => save(def)}
                    disabled={!dirty || saving === def.key}
                    title="Speichern"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-teal-300 hover:bg-teal-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => reset(def)}
                    disabled={!hasOverride || saving === def.key}
                    title="Auf Grundpreis zurücksetzen"
                    className="p-1.5 rounded-lg text-gray-400 hover:text-amber-300 hover:bg-amber-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
