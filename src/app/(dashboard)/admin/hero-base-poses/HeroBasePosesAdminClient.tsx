"use client";
import { useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import ImageUploadField from "@/components/ImageUploadField";

type BasePose = {
  id: string;
  classKey: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
};

const KNOWN_CLASSES = [
  { key: "tank", label: "Tank" },
  { key: "damage_dealer", label: "Damage Dealer" },
  { key: "support", label: "Support" },
];

export default function HeroBasePosesAdminClient({ items: initialItems }: { items: BasePose[] }) {
  const [items, setItems] = useState(initialItems);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ classKey: KNOWN_CLASSES[0].key, name: KNOWN_CLASSES[0].label, imageUrl: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function imageDimensions(url: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = url;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.classKey.trim() || !form.name.trim() || !form.imageUrl.trim()) {
      setFormError("Klasse, Name und Bild sind Pflichtfelder.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const { width, height } = await imageDimensions(form.imageUrl);
      const res = await fetch("/api/admin/hero-base-poses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, width, height }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { item } = await res.json();
      setItems(prev => [item, ...prev.filter(i => i.classKey !== item.classKey)]);
      setCreating(false);
      setForm({ classKey: KNOWN_CLASSES[0].key, name: KNOWN_CLASSES[0].label, imageUrl: "" });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/admin/hero-base-poses/${id}`, { method: "DELETE" });
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
          <h2 className="text-lg font-semibold text-white">Helden-Baukasten — Basis-Posen</h2>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} Klasse{items.length === 1 ? "" : "n"} · eine Ganzkörper-Pose je Klasse, Accessoires setzen darauf auf</p>
        </div>
        <button
          onClick={() => { setCreating(true); setFormError(""); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Basis-Pose hochladen
        </button>
      </div>

      {creating && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-5 space-y-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white">Basis-Pose hochladen</p>
            <button type="button" onClick={() => setCreating(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Klasse *</label>
              <select
                value={form.classKey}
                onChange={e => {
                  const cls = KNOWN_CLASSES.find(c => c.key === e.target.value);
                  setForm(f => ({ ...f, classKey: e.target.value, name: cls?.label ?? f.name }));
                }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50">
                {KNOWN_CLASSES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <p className="text-[10px] text-gray-600 mt-1">Erneutes Hochladen für dieselbe Klasse ersetzt die bestehende Pose.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Anzeigename *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                maxLength={60}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>

          <ImageUploadField
            value={form.imageUrl}
            onChange={url => setForm(f => ({ ...f, imageUrl: url }))}
            kind="hero-base-pose"
            label="Ganzkörper-Grafik *"
            hint="Freigestelltes PNG, frontal, stehend, Kopf bis Fuß, leere Hände für spätere Waffen-Overlays."
            previewAspect="1/2"
          />

          {formError && <p className="text-red-400 text-sm">{formError}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Abbrechen</button>
            <button type="submit" disabled={formLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
              {formLoading ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <EmptyState
          type="generic"
          title="Noch keine Basis-Pose hochgeladen"
          description="Lade oben eine erste Ganzkörper-Pose (z.B. Tank) hoch, um Accessoire-Anker darauf zu setzen."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {items.map(item => (
            <div key={item.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
                <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{item.name}</p>
                <p className="text-[10px] text-gray-600 mt-0.5">{item.classKey} · {item.width}×{item.height}px</p>
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                disabled={deletingId === item.id}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                <Trash2 className="w-3.5 h-3.5" /> Löschen
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
