"use client";

// ============================================
// DragonBones-Pipeline-Test (Betonbert-Rig + Tank-Basis-Rig)
// ============================================
// Reine Validierungsseite: lädt Betonbert (Mesh-Rig) UND das teilebasierte
// Tank-Platzhalter-Rig über pixi-dragonbones-runtime + PixiJS 8. Testet
// zusätzlich das Ausrüstungs-Slot-Prinzip aus dem Plan (Phase 3): eine Waffe
// hängt am Hand-Bone und wird per Knopf zur LAUFZEIT gegen eine andere
// Waffen-Textur getauscht (factory.getTextureDisplay + slot.display), ohne
// die Rig-Datei anzufassen — genau der Mechanismus, den der Item-Katalog
// später nutzen soll. Keine Produktiv-Route.

import { useEffect, useRef, useState } from "react";

export default function DragonBonesTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Lade…");
  const [weapon, setWeapon] = useState<"Schwert" | "Axt">("Schwert");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factoryRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tankDisplayRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;
    let app: import("pixi.js").Application | null = null;

    async function run() {
      const PIXI = await import("pixi.js");
      const { PixiFactory } = await import("pixi-dragonbones-runtime");

      app = new PIXI.Application();
      await app.init({ width: 900, height: 720, background: "#1a1a1a", antialias: true });
      if (disposed) {
        app.destroy(true);
        return;
      }
      containerRef.current?.appendChild(app.canvas);

      const [skeRes, texRes, texture, tankSkeRes, tankTexRes, tankTexture] = await Promise.all([
        fetch("/dragonbones-test/NewProject_1_ske.json").then((r) => r.json()),
        fetch("/dragonbones-test/NewProject_1_tex.json").then((r) => r.json()),
        PIXI.Assets.load("/dragonbones-test/NewProject_1_tex.png"),
        fetch("/dragonbones-test/TankBase_ske.json").then((r) => r.json()),
        fetch("/dragonbones-test/TankBase_tex.json").then((r) => r.json()),
        PIXI.Assets.load("/dragonbones-test/TankBase_tex.png"),
      ]);

      PixiFactory.useSharedTicker = true;
      const factory = PixiFactory.factory;
      factory.parseDragonBonesData(skeRes);
      factory.parseTextureAtlasData(texRes, texture);
      factory.parseDragonBonesData(tankSkeRes);
      factory.parseTextureAtlasData(tankTexRes, tankTexture);
      factoryRef.current = factory;

      const armatureDisplay = factory.buildArmatureDisplay("Armature", "NewProject_1");
      if (!armatureDisplay) {
        setStatus("Fehler: Armature konnte nicht gebaut werden.");
        return;
      }
      armatureDisplay.x = 220;
      armatureDisplay.y = app.screen.height / 1.7;
      armatureDisplay.scale.set(0.7);
      armatureDisplay.animation.play("Idle", -1);
      app.stage.addChild(armatureDisplay);

      const tankDisplay = factory.buildArmatureDisplay("Armature", "TankBase");
      if (!tankDisplay) {
        setStatus("Fehler: Tank-Armature konnte nicht gebaut werden.");
        return;
      }
      tankDisplay.x = 620;
      tankDisplay.y = app.screen.height / 2.6;
      tankDisplay.scale.set(1.6);
      tankDisplay.animation.play("Idle", -1);
      app.stage.addChild(tankDisplay);
      tankDisplayRef.current = tankDisplay;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__tankDisplay = tankDisplay;

      setStatus("Links: Betonbert (Mesh). Rechts: Tank-Platzhalter-Rig mit Waffen-Slot (Hand_R).");
    }

    run().catch((err) => {
      console.error(err);
      setStatus(`Fehler: ${err instanceof Error ? err.message : String(err)}`);
    });

    return () => {
      disposed = true;
      app?.destroy(true);
    };
  }, []);

  function swapWeapon(name: "Schwert" | "Axt") {
    const factory = factoryRef.current;
    const tankDisplay = tankDisplayRef.current;
    if (!factory || !tankDisplay) return;
    // Genau der Laufzeit-Mechanismus aus Phase 3: eine im Atlas registrierte
    // Textur wird als neues Display in ein bestehendes Slot gesetzt — kein
    // erneuter Export, kein Anfassen der Rig-Datei.
    const slot = tankDisplay.armature.getSlot("Waffe_R");
    const display = factory.getTextureDisplay(name, "TankBase");
    if (slot && display) {
      slot.display = display;
      setWeapon(name);
    }
  }

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: 32, color: "#ddd", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 16, marginBottom: 4 }}>DragonBones-Pipeline-Test — Betonbert + Tank-Basis-Rig</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 12 }}>{status}</p>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          onClick={() => swapWeapon("Schwert")}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #333", cursor: "pointer",
            background: weapon === "Schwert" ? "#f59e0b" : "#222", color: weapon === "Schwert" ? "#1a1a1a" : "#ccc",
          }}
        >
          Schwert ausrüsten
        </button>
        <button
          onClick={() => swapWeapon("Axt")}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #333", cursor: "pointer",
            background: weapon === "Axt" ? "#ef4444" : "#222", color: weapon === "Axt" ? "#1a1a1a" : "#ccc",
          }}
        >
          Axt ausrüsten
        </button>
      </div>
      <div ref={containerRef} style={{ display: "inline-block", border: "1px solid #333" }} />
    </div>
  );
}
