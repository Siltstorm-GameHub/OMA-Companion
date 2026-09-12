"use client";
import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import ImageUploadField from "@/components/ImageUploadField";

type Accessory = {
  id: string;
  name: string;
  slot: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
};

const KNOWN_SLOTS = ["weapon"];

function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

export default function HeroAccessoriesAdminClient({ items: initialItems }: { items: Accessory[] }) {
  const [items, setItems] = useState(initialItems);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", slot: KNOWN_SLOTS[0], imageUrl: "" });
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
      const { width, height } = await imageDimensions(form.imageUrl);
      const res = await fetch("/api/admin/hero-accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, width, height }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { item } = await res.json();
      setItems(prev => [item, ...prev]);
      setCreating(false);
      setForm({ name: "", slot: KNOWN_SLOTS[0], imageUrl: "" });
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
      // Löschen fehlgeschlagen -- Item bleibt sichtbar.
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Helden-Baukasten — Ausrüstung</h2>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} Accessoires · posen-unabhängig, Platzierung kommt aus den Pose-Slots</p>
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
              <label className="block text-xs text-gray-400 mb-1">Kategorie *</label>
              <input value={form.slot} onChange={e => setForm(f => ({ ...f, slot: e.target.value }))}
                list="known-slots" placeholder="z.B. weapon"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
              <datalist id="known-slots">
                {KNOWN_SLOTS.map(s => <option key={s} value={s} />)}
              </datalist>
            </div>
          </div>

          <ImageUploadField
            value={form.imageUrl}
            onChange={url => setForm(f => ({ ...f, imageUrl: url }))}
            kind="hero-accessory"
            label="Grafik *"
            hint="Freigestelltes PNG in neutraler Referenz-Ausrichtung: liegend, Griff/Aufhängepunkt am linken Bildrand, vertikal zentriert. Die Pose bestimmt später Position + Drehwinkel (siehe Basis-Posen → Slots)."
            previewAspect="2/1"
          />

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
          description="Lade oben eine erste Ausrüstungsgrafik in neutraler Referenz-Ausrichtung hoch."
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
                <p className="text-[10px] text-gray-600 mt-1">{item.width}×{item.height}px</p>
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
