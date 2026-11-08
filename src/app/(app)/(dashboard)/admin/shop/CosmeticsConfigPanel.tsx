"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Undo2 } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";
import { CosmeticName, CosmeticTitle } from "@/components/cosmetics/CosmeticName";
import { AuraLayer } from "@/components/RankRing";
import { getFrameRing } from "@/lib/cosmetics/frame-style";
import {
  CATEGORY_META, CATEGORY_ORDER, COSMETICS, RARITY_META,
  type Cosmetic, type CosmeticCategory,
} from "@/lib/cosmetics/catalog";
import type { CosmeticsConfig } from "@/lib/cosmetics/config";
import "@/components/RankRing.css";

/** Mini-Vorschau ohne Avatarbild (Admin-Liste). */
function Swatch({ item }: { item: Cosmetic }) {
  switch (item.category) {
    case "frame": {
      const ring = getFrameRing(item);
      return (
        <div className={`${ring.className} rounded-full w-8 h-8`} style={{ ...ring.style, padding: 3 }}>
          <span className="rr-ring-layer" aria-hidden="true" />
          <div className="rr-face rounded-full w-full h-full bg-zinc-800" />
        </div>
      );
    }
    case "aura":
      return (
        <div className="rank-ring rr-t1 rounded-full w-7 h-7" style={{ padding: 2 }}>
          <AuraLayer aura={item} />
          <span className="rr-ring-layer" aria-hidden="true" />
          <div className="rr-face rounded-full w-full h-full bg-zinc-800" />
        </div>
      );
    case "background":
      return <div className="w-10 h-7 rounded-md border border-white/10" style={{ background: item.css }} />;
    case "title":
      return <CosmeticTitle title={item.id} className="text-[9px]" />;
    case "nameColor":
      return <CosmeticName nameColor={item.id} className="text-sm font-black">Name</CosmeticName>;
  }
}

export function CosmeticsConfigPanel({ initial, ownerCounts }: {
  initial: CosmeticsConfig;
  /** Wie viele User den Artikel besitzen */
  ownerCounts: Record<string, number>;
}) {
  const [config, setConfig] = useState<CosmeticsConfig>(initial);
  const [saved, setSaved] = useState<CosmeticsConfig>(initial);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<CosmeticCategory>("frame");

  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(saved), [config, saved]);
  const items = COSMETICS.filter(c => c.category === category);

  function patch(id: string, p: { price?: number | undefined; enabled?: boolean | undefined }) {
    setConfig(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...p } };
      // Werte, die dem Standard entsprechen, nicht speichern — so greifen spätere Katalog-Änderungen
      const item = COSMETICS.find(c => c.id === id);
      const o = next[id];
      if (item && o.price === item.defaultPrice) delete o.price;
      if (o.enabled === true) delete o.enabled;
      if (o.price === undefined && o.enabled === undefined) delete next[id];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cosmetics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      const data = await res.json();
      setConfig(data);
      setSaved(data);
      toast.success("Shop-Preise gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        Preise und Angebot der Kosmetik-Artikel. Deaktivierte Artikel verschwinden aus dem Shop, bleiben bei
        bisherigen Käufern aber erhalten und ausrüstbar. Ansehens-Titel sind nicht käuflich.
      </p>

      <div className="flex gap-1 flex-wrap">
        {CATEGORY_ORDER.map(c => (
          <button key={c} onClick={() => setCategory(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              c === category ? "bg-teal-600/20 text-teal-300 ring-1 ring-teal-500/20" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
            }`}>
            {CATEGORY_META[c].plural}
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl divide-y divide-white/5">
        {items.map(item => {
          const o = config[item.id] ?? {};
          const unlockOnly = item.defaultPrice === null;
          const enabled = o.enabled ?? true;
          const price = o.price ?? item.defaultPrice ?? 0;
          const rarity = RARITY_META[item.rarity];
          return (
            <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${!unlockOnly && !enabled ? "opacity-50" : ""}`}>
              <div className="w-12 flex items-center justify-center shrink-0"><Swatch item={item} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">{item.name}</p>
                <p className="text-[10px] text-gray-500">
                  <span style={{ color: rarity.color }}>{rarity.label}</span>
                  {!unlockOnly && <> · {ownerCounts[item.id] ?? 0}× verkauft</>}
                  {!unlockOnly && o.price !== undefined && <> · Standard {item.defaultPrice}</>}
                </p>
              </div>
              {unlockOnly ? (
                <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-white/[0.04]">Ansehen-Stufe {item.unlock?.reputationLevel}</span>
              ) : (
                <>
                  <label className="flex items-center gap-1.5">
                    <span className="sr-only">Preis</span>
                    <NumberInput
                      min={0}
                      value={price}
                      onChange={e => patch(item.id, { price: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                      className="w-24 px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm text-right tabular-nums focus:outline-none focus:border-teal-500/50"
                    />
                    <span className="text-[10px] text-gray-500">Münzen</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={enabled} onChange={e => patch(item.id, { enabled: e.target.checked })}
                      className="w-4 h-4 accent-teal-500" />
                    <span className="text-[10px] text-gray-400 w-14">{enabled ? "Im Shop" : "Aus"}</span>
                  </label>
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Speichert…" : "Speichern"}
        </button>
        {dirty && (
          <button onClick={() => setConfig(saved)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-white/[0.04] transition-colors">
            <Undo2 className="w-4 h-4" /> Verwerfen
          </button>
        )}
      </div>
    </div>
  );
}
