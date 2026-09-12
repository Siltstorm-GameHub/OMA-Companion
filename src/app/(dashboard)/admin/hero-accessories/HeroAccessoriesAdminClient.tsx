"use client";
import { useMemo, useRef, useState } from "react";
import { Plus, X, Trash2, MousePointerClick } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import ImageUploadField from "@/components/ImageUploadField";

type Accessory = {
  id: string;
  name: string;
  slot: string;
  imageUrl: string;
  width: number;
  height: number;
  basePoseId: string;
  anchorX: number;
  anchorY: number;
  createdAt: string;
};

type BasePose = {
  id: string;
  classKey: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
};

const KNOWN_SLOTS = ["weapon"];
const DISPLAY_WIDTH = 260;

function imageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = url;
  });
}

export default function HeroAccessoriesAdminClient({ items: initialItems, basePoses }: {
  items: Accessory[];
  basePoses: BasePose[];
}) {
  const [items, setItems] = useState(initialItems);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: "", slot: KNOWN_SLOTS[0], imageUrl: "",
    basePoseId: basePoses[0]?.id ?? "", anchorX: 0.5, anchorY: 0.5,
  });
  const [accessoryDims, setAccessoryDims] = useState<{ width: number; height: number } | null>(null);
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const selectedBasePose = useMemo(
    () => basePoses.find(b => b.id === form.basePoseId) ?? null,
    [basePoses, form.basePoseId]
  );
  const displayScale = selectedBasePose ? DISPLAY_WIDTH / selectedBasePose.width : 1;

  async function handleAccessoryImage(url: string) {
    setForm(f => ({ ...f, imageUrl: url }));
    try {
      const dims = await imageDimensions(url);
      setAccessoryDims(dims);
    } catch {
      setAccessoryDims(null);
    }
  }

  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setForm(f => ({ ...f, anchorX: x, anchorY: y }));
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.slot.trim() || !form.imageUrl.trim() || !form.basePoseId || !accessoryDims) {
      setFormError("Name, Slot, Basis-Pose und Bild sind Pflichtfelder.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/hero-accessories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, width: accessoryDims.width, height: accessoryDims.height }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { item } = await res.json();
      setItems(prev => [item, ...prev]);
      setCreating(false);
      setForm({ name: "", slot: KNOWN_SLOTS[0], imageUrl: "", basePoseId: basePoses[0]?.id ?? "", anchorX: 0.5, anchorY: 0.5 });
      setAccessoryDims(null);
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
          <p className="text-xs text-gray-500 mt-0.5">{items.length} Accessoires · als Ebene auf einer Basis-Pose platziert</p>
        </div>
        <button
          onClick={() => { setCreating(true); setFormError(""); }}
          disabled={basePoses.length === 0}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Neues Accessoire
        </button>
      </div>

      {basePoses.length === 0 && (
        <EmptyState
          type="generic"
          title="Erst eine Basis-Pose anlegen"
          description="Accessoire-Anker beziehen sich auf eine Klassen-Basis-Pose — lade zuerst unter „Basis-Posen“ eine hoch."
        />
      )}

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

          <div>
            <label className="block text-xs text-gray-400 mb-1">Basis-Pose *</label>
            <select
              value={form.basePoseId}
              onChange={e => setForm(f => ({ ...f, basePoseId: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50">
              {basePoses.map(b => <option key={b.id} value={b.id}>{b.name} ({b.classKey})</option>)}
            </select>
          </div>

          <ImageUploadField
            value={form.imageUrl}
            onChange={handleAccessoryImage}
            kind="hero-accessory"
            label="Grafik *"
            hint="Freigestelltes PNG. Griff/Aufhängepunkt liegt am linken Bildrand, vertikal zentriert (wie ein Schwert am Heft)."
            previewAspect="1/1"
          />

          {form.imageUrl && selectedBasePose && (
            <div>
              <label className="block text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                <MousePointerClick className="w-3.5 h-3.5" /> Anker setzen — auf die Basis-Pose klicken
              </label>
              <div
                ref={previewRef}
                onClick={handlePreviewClick}
                className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 cursor-crosshair select-none"
                style={{ width: DISPLAY_WIDTH, height: selectedBasePose.height * displayScale }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau, beliebige Blob-URL */}
                <img src={selectedBasePose.imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
                {accessoryDims && (
                  // eslint-disable-next-line @next/next/no-img-element -- Vorschau, beliebige Blob-URL
                  <img
                    src={form.imageUrl}
                    alt=""
                    draggable={false}
                    className="absolute pointer-events-none"
                    style={{
                      left: `${form.anchorX * 100}%`,
                      top: `${form.anchorY * 100}%`,
                      width: accessoryDims.width * displayScale,
                      transform: "translateY(-50%)",
                    }}
                  />
                )}
                <div
                  className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-black/60 shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ left: `${form.anchorX * 100}%`, top: `${form.anchorY * 100}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">
                Anker {form.anchorX.toFixed(2)} / {form.anchorY.toFixed(2)} — der linke Bildrand des Accessoires liegt auf diesem Punkt.
              </p>
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
          description="Lade oben eine erste Ausrüstungsgrafik hoch und setze ihren Anker auf einer Basis-Pose."
        />
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const pose = basePoses.find(b => b.id === item.basePoseId);
            return (
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
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                      {pose?.name ?? "?"}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-600 mt-1">Anker {item.anchorX.toFixed(2)} / {item.anchorY.toFixed(2)}</p>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={deletingId === item.id}
                  className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" /> Löschen
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
