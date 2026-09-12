"use client";

// ============================================
// Helden-Baukasten-Paperdoll-Test
// ============================================
// Validierungsseite für das statische Ebenen-System (siehe
// Helden-Baukasten-Plan-Artefakt): lädt eine Basis-Pose + ihre Pose-Slots
// (Anker + Rotation je Ausrüstungs-Kategorie) und legt ein gewähltes
// Accessoire live per CSS darüber. Accessoires sind posen-unabhängig, in
// neutraler Referenz-Ausrichtung gezeichnet -- Position UND Drehwinkel kommen
// ausschließlich aus dem Pose-Slot. Keine Produktiv-Route.

import { useEffect, useState } from "react";

type BasePose = { id: string; classKey: string; poseKey: string; name: string; imageUrl: string; width: number; height: number };
type PoseSlot = { id: string; slot: string; anchorX: number; anchorY: number; rotation: number };
type Accessory = { id: string; name: string; slot: string; imageUrl: string; width: number; height: number };

const DISPLAY_WIDTH = 360;

export default function HeroPaperdollTest() {
  const [status, setStatus] = useState("Lade…");
  const [basePose, setBasePose] = useState<BasePose | null>(null);
  const [poseSlots, setPoseSlots] = useState<PoseSlot[]>([]);
  const [accessories, setAccessories] = useState<Accessory[]>([]);
  const [equippedId, setEquippedId] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      const poseRes = await fetch("/api/hero-base-poses?classKey=tank").then(r => r.json());
      const pose: BasePose | undefined = poseRes.items?.[0];
      if (!pose) {
        setStatus("Keine Tank-Basis-Pose gefunden — erst unter /admin/hero-base-poses hochladen.");
        return;
      }
      setBasePose(pose);

      const [slotsRes, accRes] = await Promise.all([
        fetch(`/api/hero-pose-slots?basePoseId=${pose.id}`).then(r => r.json()),
        fetch(`/api/hero-accessories?slot=weapon`).then(r => r.json()),
      ]);
      const slotsList: PoseSlot[] = slotsRes.items ?? [];
      const accList: Accessory[] = accRes.items ?? [];
      setPoseSlots(slotsList);
      setAccessories(accList);
      setEquippedId(accList[0]?.id ?? null);
      setStatus(`Basis-Pose "${pose.name}" (${pose.poseKey}) geladen — ${slotsList.length} Slot${slotsList.length === 1 ? "" : "s"} konfiguriert, ${accList.length} Waffe${accList.length === 1 ? "" : "n"} verfügbar.`);
    }
    run().catch(err => {
      console.error(err);
      setStatus(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    });
  }, []);

  const displayScale = basePose ? DISPLAY_WIDTH / basePose.width : 1;
  const equipped = accessories.find(a => a.id === equippedId) ?? null;
  const weaponSlot = poseSlots.find(s => s.slot === "weapon") ?? null;

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: 32, color: "#ddd", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 16, marginBottom: 4 }}>Helden-Baukasten-Paperdoll-Test</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 12 }}>{status}</p>

      {accessories.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {accessories.map(a => (
            <button
              key={a.id}
              onClick={() => setEquippedId(a.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderRadius: 6,
                border: "1px solid #333", cursor: "pointer",
                background: equippedId === a.id ? "#7c3aed" : "#222",
                color: equippedId === a.id ? "#fff" : "#ccc",
              }}
            >
              {a.name}
            </button>
          ))}
          <button
            onClick={() => setEquippedId(null)}
            style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #333", cursor: "pointer", background: "#222", color: "#ccc" }}
          >
            Nichts ausgerüstet
          </button>
        </div>
      )}

      {basePose && (
        <div
          style={{
            position: "relative",
            width: DISPLAY_WIDTH,
            height: basePose.height * displayScale,
            border: "1px solid #333",
            borderRadius: 8,
            overflow: "hidden",
            background: "#1a1a1a",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
          <img src={basePose.imageUrl} alt={basePose.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
          {equipped && weaponSlot && (
            // eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL
            <img
              src={equipped.imageUrl}
              alt={equipped.name}
              style={{
                position: "absolute",
                left: `${weaponSlot.anchorX * 100}%`,
                top: `${weaponSlot.anchorY * 100}%`,
                width: equipped.width * displayScale,
                transformOrigin: "0% 50%",
                transform: `translateY(-50%) rotate(${weaponSlot.rotation}deg)`,
              }}
            />
          )}
          {equipped && !weaponSlot && (
            <p style={{ position: "absolute", bottom: 8, left: 8, right: 8, fontSize: 11, color: "#f59e0b" }}>
              Kein "weapon"-Slot für diese Pose konfiguriert (/admin/hero-base-poses → Slots).
            </p>
          )}
        </div>
      )}
    </div>
  );
}
