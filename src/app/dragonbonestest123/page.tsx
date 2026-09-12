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

type CatalogItem = { id: string; name: string; slot: string; imageUrl: string; pivotX: number; pivotY: number };

export default function DragonBonesTest() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Lade…");
  const [weapon, setWeapon] = useState<"Schwert" | "Axt">("Schwert");
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [equippedCatalogId, setEquippedCatalogId] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const factoryRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tankDisplayRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const betonbertDisplayRef = useRef<any>(null);
  // Pro Katalog-Item einmalig geladene Mini-Atlas-Textur, damit ein erneutes
  // Ausrüsten nicht jedes Mal neu von der Blob-URL lädt.
  const loadedCatalogAtlasesRef = useRef<Set<string>>(new Set());

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
      betonbertDisplayRef.current = armatureDisplay;

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

    // Admin-hochgeladene Accessoires für den Waffen-Slot laden -- unabhängig
    // vom Rig-Setup oben, damit ein Katalog-Fehler (z.B. nicht eingeloggt) die
    // Rig-Demo nicht blockiert.
    fetch("/api/hero-accessories?slot=Waffe_R")
      .then((r) => r.json())
      .then((data: { items?: CatalogItem[] }) => setCatalog(data.items ?? []))
      .catch(() => setCatalog([]));

    return () => {
      disposed = true;
      app?.destroy(true);
    };
  }, []);

  async function equipCatalogItem(item: CatalogItem) {
    const factory = factoryRef.current;
    const tankDisplay = tankDisplayRef.current;
    if (!factory || !tankDisplay) return;
    const PIXI = await import("pixi.js");

    const atlasName = `hero-accessory-${item.id}`;
    setCatalogLoading(item.id);
    try {
      // Jedes Admin-Item ist sein EIGENER kleiner Textur-Atlas (eine Textur,
      // ein SubTexture-Eintrag) -- so lässt sich der Katalog beliebig
      // erweitern, ohne je einen gemeinsamen Atlas neu zusammenbauen zu
      // müssen. Nur einmal pro Item laden, danach ist er im Factory-Cache.
      if (!loadedCatalogAtlasesRef.current.has(atlasName)) {
        const texture = await PIXI.Assets.load(item.imageUrl);
        const texJson = {
          width: texture.width,
          height: texture.height,
          imagePath: item.imageUrl,
          name: atlasName,
          SubTexture: [{ name: item.name, x: 0, y: 0, width: texture.width, height: texture.height }],
        };
        factory.parseTextureAtlasData(texJson, texture);
        loadedCatalogAtlasesRef.current.add(atlasName);
      }

      const slot = tankDisplay.armature.getSlot(item.slot);
      const display = factory.getTextureDisplay(item.name, atlasName);
      if (slot && display) {
        // Gleiches Pivot-Prinzip wie bei den fest verdrahteten Test-Waffen,
        // nur mit dem admin-definierten Fraction-Pivot statt hartem 0/halbe-Höhe.
        slot._pivotX = item.pivotX * display.width;
        slot._pivotY = item.pivotY * display.height;
        slot.display = display;
        setEquippedCatalogId(item.id);
      }
    } finally {
      setCatalogLoading(null);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function playAttack(display: any) {
    if (!display) return;
    // 30 Frames bei 24fps = 1250ms -- danach zurück zu Idle. Ein fixer
    // Timeout statt eines "complete"-Events, da dessen Dispatcher-API in
    // dieser Runtime-Version nicht eindeutig dokumentiert ist; die Dauer ist
    // hier ohnehin exakt bekannt (Attack-Animation duration:30 @ frameRate:24).
    // Beide Rigs (Betonbert-Mesh + Tank-Platzhalter) haben dieselbe Attack-
    // Animation mit identischer Bone-Namenskonvention (Oberarm_R/Unterarm_R/
    // Torso_Root) erhalten, obwohl Betonbert eine echte DragonBones-Export-
    // Datei ist -- die rotateFrame-Deltas sind unabhängig vom Bild (Mesh vs.
    // Teile-Bilder), sie bewegen nur Bones.
    display.animation.play("Attack", 1);
    window.setTimeout(() => {
      display.animation.play("Idle", -1);
    }, 1250);
  }

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
      // getTextureDisplay geht NICHT über die Skin-Display-Daten, also wird
      // der intern gecachte Slot-Pivot NICHT für die neue Textur-Größe neu
      // berechnet (er bleibt auf der vorherigen Waffe stehen -> Versatz, der
      // sich bei jedem weiteren Tausch verschlimmert). Für einen echten, frei
      // wachsenden Item-Katalog (beliebige zukünftige Waffengrößen) muss der
      // Pivot deshalb hier pro Tausch selbst gesetzt werden: x=0 (Griff sitzt
      // an der Hand), y=halbe Höhe der NEUEN Textur (quer zentriert).
      slot._pivotX = 0;
      slot._pivotY = display.height / 2;
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
        <button
          onClick={() => playAttack(tankDisplayRef.current)}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #333", cursor: "pointer",
            background: "#7c3aed", color: "#fff", marginLeft: 12,
          }}
        >
          Angriff (Tank)
        </button>
        <button
          onClick={() => playAttack(betonbertDisplayRef.current)}
          style={{
            padding: "6px 12px", borderRadius: 6, border: "1px solid #333", cursor: "pointer",
            background: "#0f766e", color: "#fff",
          }}
        >
          Angriff (Betonbert)
        </button>
      </div>
      <div ref={containerRef} style={{ display: "inline-block", border: "1px solid #333" }} />

      <div style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 13, color: "#999", marginBottom: 8 }}>
          Admin-Katalog (Slot Waffe_R) — {catalog.length} Item{catalog.length === 1 ? "" : "s"}
        </h2>
        {catalog.length === 0 && (
          <p style={{ fontSize: 12, color: "#666" }}>
            Noch keine Accessoires im Admin-Bereich hochgeladen (/admin/hero-accessories).
          </p>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {catalog.map((item) => (
            <button
              key={item.id}
              onClick={() => equipCatalogItem(item)}
              disabled={catalogLoading === item.id}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6,
                border: "1px solid #333", cursor: "pointer",
                background: equippedCatalogId === item.id ? "#0ea5e9" : "#222",
                color: equippedCatalogId === item.id ? "#0d0d0f" : "#ccc",
                opacity: catalogLoading === item.id ? 0.6 : 1,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- beliebige Blob-URL */}
              <img src={item.imageUrl} alt="" style={{ width: 20, height: 20, objectFit: "contain" }} />
              {item.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
