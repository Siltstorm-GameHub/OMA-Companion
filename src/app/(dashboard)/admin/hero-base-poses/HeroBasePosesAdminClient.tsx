"use client";
import { useRef, useState } from "react";
import { Plus, X, Trash2, MousePointerClick, Settings2, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import ImageUploadField from "@/components/ImageUploadField";

type Archetype = { id: string; classKey: string; name: string; createdAt: string };
type BasePose = {
  id: string;
  archetypeId: string;
  poseKey: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  createdAt: string;
};
type PoseSlot = { id: string; basePoseId: string; slot: string; anchorX: number; anchorY: number; rotation: number; scale: number };
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
  archetypes: initialArchetypes, items: initialItems, slots: initialSlots, accessories,
}: { archetypes: Archetype[]; items: BasePose[]; slots: PoseSlot[]; accessories: Accessory[] }) {
  const [archetypes, setArchetypes] = useState(initialArchetypes);
  const [items, setItems] = useState(initialItems);
  const [slots, setSlots] = useState(initialSlots);

  const [creatingArchetype, setCreatingArchetype] = useState(false);
  const [archetypeForm, setArchetypeForm] = useState({ classKey: KNOWN_CLASSES[0].key, name: "" });
  const [archetypeFormError, setArchetypeFormError] = useState("");
  const [archetypeFormLoading, setArchetypeFormLoading] = useState(false);
  const [deletingArchetypeId, setDeletingArchetypeId] = useState<string | null>(null);

  const [creatingPoseFor, setCreatingPoseFor] = useState<string | null>(null);
  const [poseForm, setPoseForm] = useState({ poseKey: "idle", name: "", imageUrl: "" });
  const [poseFormError, setPoseFormError] = useState("");
  const [poseFormLoading, setPoseFormLoading] = useState(false);
  const [deletingPoseId, setDeletingPoseId] = useState<string | null>(null);

  const [configuringId, setConfiguringId] = useState<string | null>(null);
  const [slotForm, setSlotForm] = useState({ slot: KNOWN_SLOTS[0], anchorX: 0.5, anchorY: 0.5, rotation: 0, scale: 1 });
  const [refAccessoryId, setRefAccessoryId] = useState<string>(accessories[0]?.id ?? "");
  const [slotSaving, setSlotSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const configuring = items.find(i => i.id === configuringId) ?? null;
  const displayScale = configuring ? DISPLAY_WIDTH / configuring.width : 1;
  const refAccessory = accessories.find(a => a.id === refAccessoryId) ?? null;

  async function handleCreateArchetype(e: React.FormEvent) {
    e.preventDefault();
    if (!archetypeForm.classKey.trim() || !archetypeForm.name.trim()) {
      setArchetypeFormError("Klasse und Name sind Pflichtfelder.");
      return;
    }
    setArchetypeFormLoading(true);
    setArchetypeFormError("");
    try {
      const res = await fetch("/api/admin/hero-archetypes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(archetypeForm),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { item } = await res.json();
      setArchetypes(prev => [...prev, item]);
      setCreatingArchetype(false);
      setArchetypeForm({ classKey: KNOWN_CLASSES[0].key, name: "" });
    } catch (err: unknown) {
      setArchetypeFormError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setArchetypeFormLoading(false);
    }
  }

  async function handleDeleteArchetype(id: string) {
    setDeletingArchetypeId(id);
    try {
      const res = await fetch(`/api/admin/hero-archetypes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setArchetypes(prev => prev.filter(a => a.id !== id));
      setItems(prev => prev.filter(i => i.archetypeId !== id));
    } catch {
      // Löschen fehlgeschlagen -- Item bleibt sichtbar.
    } finally {
      setDeletingArchetypeId(null);
    }
  }

  async function handleCreatePose(e: React.FormEvent) {
    e.preventDefault();
    if (!creatingPoseFor) return;
    if (!poseForm.poseKey.trim() || !poseForm.name.trim() || !poseForm.imageUrl.trim()) {
      setPoseFormError("Pose-Schlüssel, Name und Bild sind Pflichtfelder.");
      return;
    }
    setPoseFormLoading(true);
    setPoseFormError("");
    try {
      const { width, height } = await imageDimensions(poseForm.imageUrl);
      const res = await fetch("/api/admin/hero-base-poses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archetypeId: creatingPoseFor, ...poseForm, width, height }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { item } = await res.json();
      setItems(prev => [item, ...prev.filter(i => !(i.archetypeId === item.archetypeId && i.poseKey === item.poseKey))]);
      setCreatingPoseFor(null);
      setPoseForm({ poseKey: "idle", name: "", imageUrl: "" });
    } catch (err: unknown) {
      setPoseFormError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setPoseFormLoading(false);
    }
  }

  async function handleDeletePose(id: string) {
    setDeletingPoseId(id);
    try {
      const res = await fetch(`/api/admin/hero-base-poses/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(i => i.id !== id));
      if (configuringId === id) setConfiguringId(null);
    } catch {
      // Löschen fehlgeschlagen -- Item bleibt sichtbar.
    } finally {
      setDeletingPoseId(null);
    }
  }

  function openConfig(pose: BasePose) {
    setConfiguringId(pose.id);
    const existing = slots.find(s => s.basePoseId === pose.id && s.slot === KNOWN_SLOTS[0]);
    setSlotForm({
      slot: KNOWN_SLOTS[0],
      anchorX: existing?.anchorX ?? 0.5,
      anchorY: existing?.anchorY ?? 0.5,
      rotation: existing?.rotation ?? 0,
      scale: existing?.scale ?? 1,
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
      scale: existing?.scale ?? 1,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Helden-Baukasten — Archetypen &amp; Posen</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {archetypes.length} Archetyp{archetypes.length === 1 ? "" : "en"} · {items.length} Pose{items.length === 1 ? "" : "n"} · öffentlich sichtbar sind nur Archetyp- und Pose-Namen, nie die Klasse
          </p>
        </div>
        <button
          onClick={() => { setCreatingArchetype(true); setArchetypeFormError(""); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Neuer Archetyp
        </button>
      </div>

      {creatingArchetype && (
        <form onSubmit={handleCreateArchetype} className="glass rounded-2xl p-5 space-y-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white">Archetyp anlegen</p>
            <button type="button" onClick={() => setCreatingArchetype(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Klasse (intern) *</label>
              <div className="relative">
                <select
                  value={archetypeForm.classKey}
                  onChange={e => setArchetypeForm(f => ({ ...f, classKey: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:border-purple-500/50">
                  {KNOWN_CLASSES.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
              <p className="text-[10px] text-gray-600 mt-1">Bestimmt die Gameplay-Rolle, wird Usern nie angezeigt.</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Öffentlicher Name *</label>
              <input value={archetypeForm.name} onChange={e => setArchetypeForm(f => ({ ...f, name: e.target.value }))}
                placeholder="z.B. Der Fels" maxLength={60}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>
          </div>
          {archetypeFormError && <p className="text-red-400 text-sm">{archetypeFormError}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreatingArchetype(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Abbrechen</button>
            <button type="submit" disabled={archetypeFormLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
              {archetypeFormLoading ? "Speichern…" : "Anlegen"}
            </button>
          </div>
        </form>
      )}

      {archetypes.length === 0 ? (
        <EmptyState
          type="generic"
          title="Noch kein Archetyp angelegt"
          description="Lege oben einen Archetyp an (z.B. für die Klasse Tank), dann kannst du ihm Posen hinzufügen."
        />
      ) : (
        <div className="space-y-6">
          {archetypes.map(archetype => {
            const poses = items.filter(i => i.archetypeId === archetype.id);
            return (
              <div key={archetype.id} className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">{archetype.name}</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">{KNOWN_CLASSES.find(c => c.key === archetype.classKey)?.label ?? archetype.classKey} · {poses.length} Pose{poses.length === 1 ? "" : "n"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setCreatingPoseFor(archetype.id); setPoseFormError(""); }}
                      className="flex items-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 border border-purple-500/20 hover:border-purple-500/40 px-3 py-1.5 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Pose
                    </button>
                    <button
                      onClick={() => handleDeleteArchetype(archetype.id)}
                      disabled={deletingArchetypeId === archetype.id}
                      className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {creatingPoseFor === archetype.id && (
                  <form onSubmit={handleCreatePose} className="rounded-xl p-4 space-y-3 border border-purple-500/20 bg-black/20">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Pose-Schlüssel *</label>
                        <input value={poseForm.poseKey} onChange={e => setPoseForm(f => ({ ...f, poseKey: e.target.value }))}
                          placeholder="z.B. idle, combat_ready, victory" maxLength={40}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                        <p className="text-[10px] text-gray-600 mt-1">Intern, eindeutig je Archetyp. "idle" wird als Baukasten-Vorschau genutzt.</p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Öffentlicher Pose-Name *</label>
                        <input value={poseForm.name} onChange={e => setPoseForm(f => ({ ...f, name: e.target.value }))}
                          placeholder="z.B. Kampfbereit" maxLength={60}
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
                      </div>
                    </div>
                    <ImageUploadField
                      value={poseForm.imageUrl}
                      onChange={url => setPoseForm(f => ({ ...f, imageUrl: url }))}
                      kind="hero-base-pose"
                      label="Ganzkörper-Grafik *"
                      hint="Freigestelltes PNG, Kopf bis Fuß, leere Hände für spätere Waffen-Overlays."
                      previewAspect="1/2"
                    />
                    {poseFormError && <p className="text-red-400 text-sm">{poseFormError}</p>}
                    <div className="flex gap-3 justify-end">
                      <button type="button" onClick={() => setCreatingPoseFor(null)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Abbrechen</button>
                      <button type="submit" disabled={poseFormLoading}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
                        {poseFormLoading ? "Speichern…" : "Pose anlegen"}
                      </button>
                    </div>
                  </form>
                )}

                {poses.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {poses.map(pose => {
                      const slotCount = slots.filter(s => s.basePoseId === pose.id).length;
                      return (
                        <div key={pose.id} className="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
                          <div className="aspect-[3/4] rounded-lg overflow-hidden border border-white/10 bg-black/30 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
                            <img src={pose.imageUrl} alt={pose.name} className="max-w-full max-h-full object-contain" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{pose.name}</p>
                            <p className="text-[10px] text-gray-600 mt-0.5">{pose.poseKey} · {slotCount} Slot{slotCount === 1 ? "" : "s"}</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openConfig(pose)}
                              className="flex-1 flex items-center justify-center gap-1.5 text-xs text-purple-300 hover:text-purple-200 border border-purple-500/20 hover:border-purple-500/40 px-3 py-1.5 rounded-lg transition-colors">
                              <Settings2 className="w-3.5 h-3.5" /> Slots
                            </button>
                            <button
                              onClick={() => handleDeletePose(pose.id)}
                              disabled={deletingPoseId === pose.id}
                              className="flex items-center justify-center gap-1.5 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
                        width: refAccessory.width * displayScale * slotForm.scale,
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

                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Größe ({(slotForm.scale * 100).toFixed(0)}%)</label>
                  <input type="range" min={0.2} max={3} step={0.05} value={slotForm.scale}
                    onChange={e => setSlotForm(f => ({ ...f, scale: parseFloat(e.target.value) }))}
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
