"use client";
import { useMemo, useRef, useState } from "react";
import { Plus, X, Trash2, MousePointerClick, Settings2 } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import ImageUploadField from "@/components/ImageUploadField";

type BasePose = {
  id: string;
  classKey: string;
  poseKey: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
};

type PoseSlot = { id: string; basePoseId: string; slot: string; anchorX: number; anchorY: number; rotation: number };
type Accessory = { id: string; name: string; slot: string; imageUrl: string; width: number; height: number };

const KNOWN_CLASSES = [
  { key: "tank", label: "Tank" },
  { key: "damage_dealer", label: "Damage Dealer" },
  { key: "support", label: "Support" },
];
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

export default function HeroBasePosesAdminClient({
  items: initialItems, slots: initialSlots, accessories,
}: { items: BasePose[]; slots: PoseSlot[]; accessories: Accessory[] }) {
  const [items, setItems] = useState(initialItems);
  const [slots, setSlots] = useState(initialSlots);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ classKey: KNOWN_CLASSES[0].key, poseKey: "neutral", name: KNOWN_CLASSES[0].label, imageUrl: "" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({ slot: KNOWN_SLOTS[0], anchorX: 0.5, anchorY: 0.5, rotation: 0 });
  const [refAccessoryId, setRefAccessoryId] = useState<string>(accessories[0]?.id ?? "");
  const [slotSaving, setSlotSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const configuring = items.find(i => i.id === configuringId) ?? null;
  const displayScale = configuring ? DISPLAY_WIDTH / configuring.width : 1;
  const refAccessory = accessories.find(a => a.id === refAccessoryId) ?? null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.classKey.trim() || !form.poseKey.trim() || !form.name.trim() || !form.imageUrl.trim()) {
      setFormError("Klasse, Pose-Schlüssel, Name und Bild sind Pflichtfelder.");
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
      setItems(prev => [item, ...prev.filter(i => !(i.classKey === item.classKey && i.poseKey === item.poseKey))]);
      setCreating(false);
      setForm({ classKey: KNOWN_CLASSES[0].key, poseKey: "neutral", name: KNOWN_CLASSES[0].label, imageUrl: "" });
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
      if (configuringId === id) setConfiguringId(null);
    } catch {
      // Löschen fehlgeschlagen -- Item bleibt sichtbar.
    } finally {
      setDeletingId(null);
    }
  }

  function openConfig(pose: BasePose) {
    setConfiguringId(pose.id);
    const existing = slots.find(s => s.basePoseId === pose.id && s.slot === slotForm.slot);
    setSlotForm({
      slot: KNOWN_SLOTS[0],
      anchorX: existing?.anchorX ?? 0.5,
      anchorY: existing?.anchorY ?? 0.5,
      rotation: existing?.rotation ?? 0,
    });
  }

  function switchSlotCategory(slotKey: string) {
    if (!configuring) return;
    const existing = slots.find(s => s.basePoseId === configuring.id && s.slot === slotKey);
    setSlotForm({
      slot: slotKey,
      anchorX: existing?.anchorX ?? 0.5,
      anchorY: existing?.anchorY ?? 0.5,
      rotation: existing?.rotation ?? 0,
    });
  }

  function handlePreviewClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = previewRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
    setSlotForm(f => ({ ...f, anchorX: x, anchorY: y }));
  }

  async function saveSlot() {
    if (!configuring) return;
    setSlotSaving(true);
    try {
      const res = await fetch("/api/admin/hero-pose-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ basePoseId: configuring.id, ...slotForm }),
      });
      if (!res.ok) throw new Error();
      const { item } = await res.json();
      setSlots(prev => [...prev.filter(s => !(s.basePoseId === item.basePoseId && s.slot === item.slot)), item]);
    } catch {
      // Speichern fehlgeschlagen -- Formularwerte bleiben erhalten, Nutzer kann erneut speichern.
    } finally {
      setSlotSaving(false);
    }
  }

  const posesByClass = useMemo(() => {
    const map = new Map<string, BasePose[]>();
    for (const p of items) {
      if (!map.has(p.classKey)) map.set(p.classKey, []);
      map.get(p.classKey)!.push(p);
    }
    return map;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Helden-Baukasten — Basis-Posen</h2>
          <p className="text-xs text-gray-500 mt-0.5">{items.length} Pose{items.length === 1 ? "" : "n"} · pro Pose Anker + Rotation je Ausrüstungs-Slot konfigurierbar</p>
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

          <div className="grid grid-cols-3 gap-4">
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
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Pose-Schlüssel *</label>
              <input value={form.poseKey} onChange={e => setForm(f => ({ ...f, poseKey: e.target.value }))}
                placeholder="z.B. combat_ready" maxLength={40}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
              <p className="text-[10px] text-gray-600 mt-1">Gleicher Schlüssel + Klasse ersetzt die bestehende Pose.</p>
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
            hint="Freigestelltes PNG, Kopf bis Fuß, leere Hände für spätere Waffen-Overlays."
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
          description="Lade oben eine erste Ganzkörper-Pose (z.B. Tank) hoch."
        />
      ) : (
        <div className="space-y-6">
          {Array.from(posesByClass.entries()).map(([classKey, poses]) => (
            <div key={classKey}>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">{KNOWN_CLASSES.find(c => c.key === classKey)?.label ?? classKey}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {poses.map(item => {
                  const slotCount = slots.filter(s => s.basePoseId === item.id).length;
                  return (
                    <div key={item.id} className="glass rounded-2xl p-4 space-y-3">
                      <div className="aspect-[3/4] rounded-xl overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
                        <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{item.name}</p>
                        <p className="text-[10px] text-gray-600 mt-0.5">{item.poseKey} · {slotCount} Slot{slotCount === 1 ? "" : "s"} konfiguriert</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openConfig(item)}
                          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 border border-purple-500/20 hover:border-purple-500/40 px-3 py-1.5 rounded-lg transition-colors">
                          <Settings2 className="w-3.5 h-3.5" /> Slots
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deletingId === item.id}
                          className="flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {configuring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setConfiguringId(null)}>
          <div className="glass rounded-2xl p-6 w-full max-w-2xl space-y-4 border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Slots für „{configuring.name}“</p>
              <button onClick={() => setConfiguringId(null)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
            </div>

            <div className="flex gap-6 flex-wrap">
              <div>
                <label className="block text-xs text-gray-400 mb-2 flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5" /> Anker setzen — auf die Pose klicken
                </label>
                <div
                  ref={previewRef}
                  onClick={handlePreviewClick}
                  className="relative rounded-xl overflow-hidden border border-white/10 bg-black/30 cursor-crosshair select-none"
                  style={{ width: DISPLAY_WIDTH, height: configuring.height * displayScale }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau, beliebige Blob-URL */}
                  <img src={configuring.imageUrl} alt="" className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
                  {refAccessory && (
                    // eslint-disable-next-line @next/next/no-img-element -- Vorschau, beliebige Blob-URL
                    <img
                      src={refAccessory.imageUrl}
                      alt=""
                      draggable={false}
                      className="absolute pointer-events-none"
                      style={{
                        left: `${slotForm.anchorX * 100}%`,
                        top: `${slotForm.anchorY * 100}%`,
                        width: refAccessory.width * displayScale,
                        transformOrigin: "0% 50%",
                        transform: `translateY(-50%) rotate(${slotForm.rotation}deg)`,
                      }}
                    />
                  )}
                  <div
                    className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-black/60 shadow -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ left: `${slotForm.anchorX * 100}%`, top: `${slotForm.anchorY * 100}%` }}
                  />
                </div>
              </div>

              <div className="flex-1 min-w-[220px] space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Slot-Kategorie</label>
                  <select
                    value={slotForm.slot}
                    onChange={e => switchSlotCategory(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50">
                    {KNOWN_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Vorschau-Accessoire</label>
                  <select
                    value={refAccessoryId}
                    onChange={e => setRefAccessoryId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50">
                    {accessories.filter(a => a.slot === slotForm.slot).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  <p className="text-[10px] text-gray-600 mt-1">Nur zur Vorschau — der Slot gilt für jedes Accessoire dieser Kategorie.</p>
                </div>

                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Rotation ({slotForm.rotation.toFixed(0)}°)</label>
                  <input type="range" min={-180} max={180} step={1} value={slotForm.rotation}
                    onChange={e => setSlotForm(f => ({ ...f, rotation: parseFloat(e.target.value) }))}
                    className="w-full accent-purple-500" />
                </div>

                <p className="text-[10px] text-gray-600">
                  Anker {slotForm.anchorX.toFixed(2)} / {slotForm.anchorY.toFixed(2)} — der Griff/Aufhängepunkt (linker Bildrand) jedes Accessoires dieser Kategorie landet hier, gedreht um den eingestellten Winkel.
                </p>

                <button
                  onClick={saveSlot}
                  disabled={slotSaving}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
                  {slotSaving ? "Speichern…" : "Slot speichern"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
