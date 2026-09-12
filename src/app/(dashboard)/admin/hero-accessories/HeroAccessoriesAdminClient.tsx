"use client";
import { useState } from "react";
import { Plus, X, Trash2, Crosshair } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import ImageUploadField from "@/components/ImageUploadField";

type Accessory = {
  id: string;
  name: string;
  slot: string;
  imageUrl: string;
  pivotX: number;
  pivotY: number;
  createdAt: string;
};

// Bekannte Bone-Slots aus den bisherigen Rigs (Tank-Platzhalter-Rig) — als
// Vorschlag, kein hartes Limit: künftige Rigs/Klassen bringen eigene Slots mit.
const KNOWN_SLOTS = ["Waffe_R"];

export default function HeroAccessoriesAdminClient({ items: initialItems }: { items: Accessory[] }) {
  const [items, setItems] = useState(initialItems);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slot: KNOWN_SLOTS[0], imageUrl: "", pivotX: 0, pivotY: 0.5 });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slot.trim() || !form.imageUrl.trim()) {
      setFormError("Name, Slot und Bild sind Pflichtfelder.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/hero-accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { item } = await res.json();
      setItems(prev => [item, ...prev]);
      setCreating(false);
      setForm({ name: "", slot: KNOWN_SLOTS[0], imageUrl: "", pivotX: 0, pivotY: 0.5 });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/hero-accessories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(i => i.id !== id));
    } catch {
      // Löschen fehlgeschlagen — Item bleibt sichtbar, kein Sonderzustand nötig.
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Helden-Baukasten — Ausrüstung</h2>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} Accessoires · zur Laufzeit in DragonBones-Rigs ausrüstbar</p>
        </div>
        <button
          onClick={() => { setCreating(true); setFormError(""); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Neues Accessoire
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-5 space-y-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white">Accessoire hochladen</p>
            <button type="button" onClick={() => setCreating(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Kriegshammer" maxLength={60}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Slot *</label>
              <input value={form.slot} onChange={e => setForm(f => ({ ...f, slot: e.target.value }))}
                list="known-slots" placeholder="z.B. Waffe_R"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
              <datalist id="known-slots">
                {KNOWN_SLOTS.map(s => <option key={s} value={s} />)}
              </datalist>
              <p className="text-[10px] text-gray-600 mt-1">Muss dem Bone-Slot-Namen im Rig entsprechen.</p>
            </div>
          </div>

          <ImageUploadField
            value={form.imageUrl}
            onChange={url => setForm(f => ({ ...f, imageUrl: url }))}
            kind="hero-accessory"
            label="Grafik *"
            hint="Freistellendes PNG empfohlen. Wird als eigener Mini-Textur-Atlas ins Rig geladen."
            previewAspect="1/1"
          />

          {form.imageUrl && (
            <div>
              <label className="block text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5" /> Aufhängepunkt (Pivot)
              </label>
              <div className="flex gap-4 items-start">
                <div className="relative w-32 h-32 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-black/30 bg-[repeating-conic-gradient(#ffffff0d_0_25%,transparent_0_50%)] bg-[length:12px_12px]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau beliebiger Blob-URLs */}
                  <img src={form.imageUrl} alt="Vorschau" className="w-full h-full object-contain" />
                  <div
                    className="absolute w-3 h-3 rounded-full bg-amber-400 border-2 border-black/60 shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${form.pivotX * 100}%`, top: `${form.pivotY * 100}%` }}
                  />
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">X ({form.pivotX.toFixed(2)}) — 0=links, 1=rechts</label>
                    <input type="range" min={0} max={1} step={0.01} value={form.pivotX}
                      onChange={e => setForm(f => ({ ...f, pivotX: parseFloat(e.target.value) }))}
                      className="w-full accent-purple-500" />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Y ({form.pivotY.toFixed(2)}) — 0=oben, 1=unten</label>
                    <input type="range" min={0} max={1} step={0.01} value={form.pivotY}
                      onChange={e => setForm(f => ({ ...f, pivotY: parseFloat(e.target.value) }))}
                      className="w-full accent-purple-500" />
                  </div>
                  <p className="text-[10px] text-gray-600">
                    Der Punkt sitzt am Bone-Ursprung im Rig (z.B. an der Hand). Standard 0 / 0.5 passt für
                    Waffen mit Griff am linken Bildrand.
                  </p>
                </div>
              </div>
            </div>
          )}

          {formError && <p className="text-red-400 text-sm">{formError}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Abbrechen</button>
            <button type="submit" disabled={formLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
              {formLoading ? "Speichern…" : "Erstellen"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState
          type="generic"
          title="Noch keine Accessoires hochgeladen"
          description="Lade oben eine erste Ausrüstungsgrafik hoch, um sie in einem Rig auszurüsten."
        />
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="glass rounded-2xl px-5 py-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/10 bg-black/30 shrink-0 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
                <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                    {item.slot}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600 mt-1">Pivot {item.pivotX.toFixed(2)} / {item.pivotY.toFixed(2)}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" /> Löschen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
