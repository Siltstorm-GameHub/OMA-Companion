"use client";

// ============================================
// DragonBones-Pipeline-Test (Betonbert-Rig)
// ============================================
// Reine Validierungsseite: lädt das von Hand in DragonBones gerigte
// Betonbert-Mesh (NewProject_1_ske/tex.json + tex.png aus public/dragonbones-test/)
// über pixi-dragonbones-runtime + PixiJS 8 und spielt die "Idle"-Animation ab.
// Keine Produktiv-Route — nur zum Prüfen, ob die technische Kette
// (Editor-Export -> Web-Runtime -> Animation) grundsätzlich funktioniert.

import { useEffect, useRef, useState } from "react";

export default function DragonBonesTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Lade…");

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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__tankDisplay = tankDisplay;

      setStatus("Links: Betonbert (Mesh). Rechts: teilebasiertes Tank-Platzhalter-Rig.");
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

  return (
    <div style={{ background: "#0d0d0f", minHeight: "100vh", padding: 32, color: "#ddd", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 16, marginBottom: 4 }}>DragonBones-Pipeline-Test — Betonbert</h1>
      <p style={{ fontSize: 13, color: "#999", marginBottom: 16 }}>{status}</p>
      <div ref={containerRef} style={{ display: "inline-block", border: "1px solid #333" }} />
    </div>
  );
}
