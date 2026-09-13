"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Check } from "lucide-react";

type BasePose = { id: string; classKey: string; poseKey: string; name: string; imageUrl: string; width: number; height: number };
type Accessory = { id: string; name: string; slot: string; imageUrl: string; width: number; height: number };
type PoseSlot = { id: string; slot: string; anchorX: number; anchorY: number; rotation: number; scale: number };
type Loadout = { classKey: string; equipment: Record<string, string> } | null;

const CLASS_LABELS: Record<string, string> = {
  tank: "Tank",
  damage_dealer: "Damage Dealer",
  support: "Support",
};

const DISPLAY_WIDTH = 280;

export default function HeroBuilderClient({ basePoses, accessories, initialLoadout }: {
  basePoses: BasePose[];
  accessories: Accessory[];
  initialLoadout: Loadout;
}) {
  const [classKey, setClassKey] = useState<string>(initialLoadout?.classKey ?? basePoses[0]?.classKey ?? "");
  const [weaponId, setWeaponId] = useState<string | null>(initialLoadout?.equipment?.weapon ?? null);
  const [poseSlots, setPoseSlots] = useState<PoseSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const basePose = useMemo(() => basePoses.find(p => p.classKey === classKey) ?? null, [basePoses, classKey]);
  const weapon = useMemo(() => accessories.find(a => a.id === weaponId) ?? null, [accessories, weaponId]);
  const weaponSlot = poseSlots.find(s => s.slot === "weapon") ?? null;
  const displayScale = basePose ? DISPLAY_WIDTH / basePose.width : 1;

  async function selectClass(nextClassKey: string) {
    setClassKey(nextClassKey);
    const pose = basePoses.find(p => p.classKey === nextClassKey);
    if (!pose) { setPoseSlots([]); return; }
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/hero-pose-slots?basePoseId=${pose.id}`);
      const data = await res.json();
      setPoseSlots(data.items ?? []);
    } catch {
      setPoseSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  // Slots für die anfangs vorausgewählte Klasse einmalig nachladen.
  useMemo(() => {
    if (basePose && poseSlots.length === 0 && !slotsLoading) {
      selectClass(basePose.classKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!classKey) {
      toast.error("Bitte zuerst eine Klasse wählen.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hero-loadout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classKey, equipment: { weapon: weaponId } }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      toast.success("Held gespeichert!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const availableClasses = Array.from(new Set(basePoses.map(p => p.classKey)));
  const allClasses = ["tank", "damage_dealer", "support"];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[280px_1fr] gap-6 items-start">
      <div>
        <div
          className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/30"
          style={{ width: DISPLAY_WIDTH, height: basePose ? basePose.height * displayScale : DISPLAY_WIDTH * 1.3 }}
        >
          {basePose ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
              <img src={basePose.imageUrl} alt={basePose.name} className="absolute inset-0 w-full h-full object-contain" />
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
              Wähle eine Klasse
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs text-gray-400 mb-2">Klasse</p>
          <div className="flex gap-2 flex-wrap">
            {allClasses.map(key => {
              const available = availableClasses.includes(key);
              const active = classKey === key;
              return (
                <button
                  key={key}
                  disabled={!available}
                  onClick={() => selectClass(key)}
                  className={`px-3.5 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    active
                      ? "bg-violet-600/20 border-violet-500/40 text-violet-300"
                      : available
                        ? "bg-white/[0.03] border-white/10 text-gray-300 hover:border-violet-500/30"
                        : "bg-white/[0.02] border-white/5 text-gray-700 cursor-not-allowed"
                  }`}
                >
                  {CLASS_LABELS[key] ?? key}
                  {!available && <span className="block text-[10px] text-gray-700">bald verfügbar</span>}
                </button>
              );
            })}
          </div>
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
          disabled={saving || !classKey}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Held speichern
        </button>
      </div>
    </div>
  );
}
