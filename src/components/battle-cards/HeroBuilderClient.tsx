"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Check } from "lucide-react";

type Archetype = { id: string; name: string; basePose: { id: string; imageUrl: string; width: number; height: number } };
type Accessory = { id: string; name: string; slot: string; imageUrl: string; width: number; height: number };
type PoseSlot = { id: string; slot: string; anchorX: number; anchorY: number; rotation: number; scale: number };
type Loadout = { archetypeId: string; equipment: Record<string, string> } | null;

const DISPLAY_WIDTH = 280;

export default function HeroBuilderClient({ archetypes, accessories, initialLoadout }: {
  archetypes: Archetype[];
  accessories: Accessory[];
  initialLoadout: Loadout;
}) {
  const [archetypeId, setArchetypeId] = useState<string>(initialLoadout?.archetypeId ?? archetypes[0]?.id ?? "");
  const [weaponId, setWeaponId] = useState<string | null>(initialLoadout?.equipment?.weapon ?? null);
  const [poseSlots, setPoseSlots] = useState<PoseSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const archetype = useMemo(() => archetypes.find(a => a.id === archetypeId) ?? null, [archetypes, archetypeId]);
  const weapon = useMemo(() => accessories.find(a => a.id === weaponId) ?? null, [accessories, weaponId]);
  const weaponSlot = poseSlots.find(s => s.slot === "weapon") ?? null;
  const displayScale = archetype ? DISPLAY_WIDTH / archetype.basePose.width : 1;

  async function selectArchetype(nextId: string) {
    setArchetypeId(nextId);
    const next = archetypes.find(a => a.id === nextId);
    if (!next) { setPoseSlots([]); return; }
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/hero-pose-slots?basePoseId=${next.basePose.id}`);
      const data = await res.json();
      setPoseSlots(data.items ?? []);
    } catch {
      setPoseSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  // Slots für den anfangs vorausgewählten Archetyp einmalig nachladen.
  useMemo(() => {
    if (archetype && poseSlots.length === 0 && !slotsLoading) {
      selectArchetype(archetype.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!archetypeId) {
      toast.error("Bitte zuerst einen Archetyp wählen.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hero-loadout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archetypeId, equipment: { weapon: weaponId } }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      toast.success("Held gespeichert!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-6 items-start">
      <div>
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/30"
          style={{ width: DISPLAY_WIDTH, height: archetype ? archetype.basePose.height * displayScale : DISPLAY_WIDTH * 1.3 }}
        >
          {archetype ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
              <img src={archetype.basePose.imageUrl} alt={archetype.name} className="absolute inset-0 w-full h-full object-contain" />
              {weapon && weaponSlot && (
                // eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL
                <img
                  src={weapon.imageUrl}
                  alt={weapon.name}
                  className="absolute"
                  style={{
                    left: `${weaponSlot.anchorX * 100}%`,
                    top: `${weaponSlot.anchorY * 100}%`,
                    width: weapon.width * displayScale * weaponSlot.scale,
                    transformOrigin: "0% 50%",
                    transform: `translateY(-50%) rotate(${weaponSlot.rotation}deg)`,
                  }}
                />
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-gray-600 p-4 text-center">
              Wähle einen Archetyp
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs text-gray-400 mb-2">Archetyp</p>
          {archetypes.length === 0 ? (
            <p className="text-xs text-gray-600">Noch keine Archetypen verfügbar.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              {archetypes.map(a => {
                const active = archetypeId === a.id;
                return (
                  <button
                    key={a.id}
                    onClick={() => selectArchetype(a.id)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                      active
                        ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                        : "bg-white/[0.03] border-white/10 text-gray-300 hover:border-violet-500/30"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
                    <img src={a.basePose.imageUrl} alt="" className="w-6 h-6 object-contain" />
                    {a.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-gray-400 mb-2">Waffe</p>
          {accessories.length === 0 ? (
            <p className="text-xs text-gray-600">Noch keine Waffen verfügbar.</p>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setWeaponId(null)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                  !weaponId ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/[0.03] border-white/10 text-gray-300 hover:border-violet-500/30"
                }`}
              >
                {!weaponId && <Check className="w-3.5 h-3.5" />} Keine
              </button>
              {accessories.map(a => (
                <button
                  key={a.id}
                  onClick={() => setWeaponId(a.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-colors ${
                    weaponId === a.id ? "bg-violet-600/20 border-violet-500/40 text-violet-300" : "bg-white/[0.03] border-white/10 text-gray-300 hover:border-violet-500/30"
                  }`}
                >
                  {weaponId === a.id && <Check className="w-3.5 h-3.5" />}
                  {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
                  <img src={a.imageUrl} alt="" className="w-5 h-5 object-contain" />
                  {a.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={save}
          disabled={saving || !archetypeId}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Held speichern
        </button>
      </div>
    </div>
  );
}
