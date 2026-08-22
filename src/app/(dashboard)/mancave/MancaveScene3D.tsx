"use client";

/**
 * Echte interaktive 3D-Ego-Ansicht — lädt die tatsächliche Blender-Referenz-
 * szene (`3DAssetsRoom/LP_Ortographic_Gaming_Room.glb`, für den Browser als
 * `public/models/mancave_room.glb` mit Draco-Kompression exportiert, siehe
 * [[mancave-front-photos-project]] in memory) als EIN statisches Modell,
 * statt sie aus den generischen `public/models/*.glb`-Einzelteilen
 * (`FurniturePrimitive`) nachzubauen — ein früherer Versuch, sah aber nie
 * wie die echte Szene aus, weil das andere Assets mit anderem Stil sind.
 *
 * Konsequenz: die Szene zeigt größtenteils NICHT die individuellen Objekte
 * des Users, sondern die feste Referenz-Kulisse — außer den Slots, die schon
 * auf das neue Stufen-System (mancave-items.ts) umgestellt wurden: dafür
 * wurde das jeweilige Referenz-Mesh aus `mancave_room.glb` entfernt (siehe
 * Blender-Export-Notiz) und wird hier durch ein per Stufe austauschbares GLB
 * aus dem alten Möbel-Katalog (`public/models/*.glb`) ersetzt (siehe
 * SwappablePc als Pilot). Das ist ein bewusster Stilbruch (andere Assets als
 * die handgebaute Referenzszene) — Ziel ist erst die Swap-PIPELINE zu
 * validieren, echte stilgetreue Stufen-Modelle sind ein separater
 * Blender-Arbeitsblock für später. Das Gadgets-Panel zeigt die echten
 * besessenen Items weiterhin als Foto-Liste (siehe MancaveSharedUI).
 *
 * Kamera-Position/-Blickrichtung sind 1:1 aus der Blender-Kamera (`DeskCam`)
 * übernommen, per Blender→glTF-Achsenkonvertierung (X→X, Z→Y, -Y→Z) — siehe
 * `EYE`/`FORWARD` unten. Kein KHR_lights_punctual im Export (Blenders
 * Area-Lights werden von glTF nicht unterstützt, nur Point/Spot/Directional)
 * — die Beleuchtung kommt komplett aus `RoomLighting` hier im Code.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MonitorScreenContent, TrophyPanel, GadgetsPanel, ItemsPanel, type MancavePanel } from "./MancaveSharedUI";
import type { MancaveData } from "./mancave-data";

const ROOM_MODEL_URL = "/models/mancave_room.glb";
useGLTF.preload(ROOM_MODEL_URL);

// ── Kamera: 1:1 aus der Blender-Referenzkamera "DeskCam" übernommen ──────
// Blender (Z-up): eye=(0.05,0.95,1.28), forward=(0.9598,0,-0.2806).
// glTF/three.js (Y-up): x→x, y→z_blender, z→-y_blender.
const EYE = new THREE.Vector3(0.05, 1.28, -0.95);
const FORWARD = new THREE.Vector3(0.9598, -0.2806, 0);
const LOOK_TARGET = EYE.clone().add(FORWARD);

// Bildschirm-Mitte des Haupt-Monitors ("Cube.015") — bewusst NICHT auf die
// höhere, gemeinsame Mitte von Cube.015+Cube.002 verschoben (das wurde
// ausprobiert, vom User aber als schlechter beurteilt und zurückgesetzt) —
// diese niedrigere Position bleibt der bevorzugte Stand. Um 0.05 Richtung
// Kamera versetzt (entlang -FORWARD), sonst verdeckt die Bildschirm-Fläche
// selbst das Html-Overlay (Selbst-Okklusion).
const SCREEN_POS = new THREE.Vector3(1.215, 1.091, -0.741);
// PC-Tower-Position ("Cube.017", inzwischen aus dem Room-Export entfernt,
// siehe SwappablePc) — Anker für den Gadgets-Hotspot UND den Tower selbst.
// PC_POS ist die Tischoberfläche unter dem Tower (Blender-Z-min der alten
// Cube.017-Bounding-Box), PC_LABEL_POS der alte visuelle Mittelpunkt (für
// den Hotspot-Button, unabhängig von der aktuellen Tower-Höhe).
const PC_POS = new THREE.Vector3(1.05, 0.816, -0.29);
const PC_LABEL_POS = new THREE.Vector3(1.05, 1.02, -0.29);

/**
 * Neues Stufen-Ausbausystem: pro Slot lädt `SwappableProp` je nach Stufe
 * eines der bestehenden Katalog-GLBs aus dem alten Gaming-Zimmer nach — die
 * jeweilige Referenz-Geometrie wurde dafür aus `mancave_room.glb` entfernt
 * (siehe Blender-Export-Notizen bei den einzelnen `_TIER_MODELS`-Konstanten).
 * `fix` normalisiert jedes Modell auf "Ursprung am Boden-Mittelpunkt"
 * (gemessen per Node/three.js-Skript, siehe [[mancave-profile-project]] in
 * memory für die Mess-Methode) — die Modelle wurden nie für ein gemeinsames
 * Koordinatensystem gebaut, jedes hat einen eigenen, willkürlichen Ursprung.
 * `scale` gleicht grobe Größenunterschiede zwischen den Modellen einer
 * Stufenreihe aus. Bewusst NICHT versucht, die alte Referenz-Bounding-Box
 * exakt zu treffen — andere Modell-Silhouette, exaktes Nachbauen wäre nur Zufall.
 */
interface TierModelCfg {
  url: string; fix: [number, number, number]; scale: number;
  /** Yaw-Korrektur (Radiant), falls die "Vorderseite" des Modells nicht schon lokal +Z/-X entspricht. */
  rotationY?: number;
  /** Mesh-Namen, die nach dem Laden entfernt werden (z.B. eine mitgelieferte Boden-/Sockel-Fläche im Modell). */
  excludeMeshNames?: string[];
}

function SwappableProp({ tier, models, position }: { tier: number; models: Record<number, TierModelCfg>; position: THREE.Vector3 }) {
  const cfg = models[Math.min(4, Math.max(1, tier))];
  const { scene } = useGLTF(cfg.url);
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    if (cfg.excludeMeshNames?.length) {
      const toRemove: THREE.Object3D[] = [];
      clone.traverse(obj => { if (cfg.excludeMeshNames!.includes(obj.name)) toRemove.push(obj); });
      for (const obj of toRemove) obj.removeFromParent();
    }
    return clone;
  }, [scene, cfg]);
  return (
    <group position={position} rotation={[0, cfg.rotationY ?? 0, 0]}>
      <group scale={cfg.scale}>
        <primitive object={cloned} position={cfg.fix} />
      </group>
    </group>
  );
}

/**
 * PC-Turm (Stufen 1-4): pc_billig → pc_violett → pc_gaming → pc_highend.
 * Stufe 3/4-Rotation nach User-Feedback korrigiert (nicht geometrisch
 * hergeleitet wie bei Monitor Stufe 1 — hier direkt als "um X Grad drehen"
 * gemeldet): Stufe 3 (pc_white_rgb) 180°, Stufe 4 (pc_highend) 90° (Richtung
 * nicht spezifiziert, positive Drehrichtung als erster Versuch — bei Bedarf
 * Vorzeichen tauschen). Stufe 4 hatte außerdem eine mitgelieferte Boden-/
 * Sockel-Fläche direkt unter dem Gehäuse (Mesh "Object_6_24", Material
 * "Material.106", per Node/three.js-Messscript gefunden: eine dünne, flache
 * Platte, die fast genau die gesamte Grundfläche des Modells abdeckt) — als
 * `excludeMeshNames` entfernt, da sie laut User sichtbar störte.
 */
const PC_TIER_MODELS: Record<number, TierModelCfg> = {
  1: { url: "/models/pc_billig.glb",       fix: [-0.357, 0.011, -0.090], scale: 0.69 },
  2: { url: "/models/pc_tower_purple.glb", fix: [0, 0, 0],                scale: 0.77 },
  3: { url: "/models/pc_white_rgb.glb",    fix: [0, 0, 0],                scale: 0.89, rotationY: Math.PI },
  4: {
    url: "/models/pc_highend.glb", fix: [-8.674, 0.721, 0.203], scale: 1.14,
    rotationY: Math.PI / 2, excludeMeshNames: ["Object_6_24"],
  },
};

/**
 * Monitor (Stufen 1-4): roehrenmonitor → monitor_flach → monitor_144(curved)
 * → monitor_dreifach(triple). Ersetzt "Cube.015"+"Cube.002" (der Haupt-
 * Screen) UND "Cube.016" (ein zweiter, kleinerer Screen-Kasten links auf dem
 * Tisch, der laut User ebenfalls entfernt werden sollte) aus der Referenzszene.
 *
 * `fix.y` ist jetzt einheitlich "-eigene min.y" (Boden-Anker auf lokalen
 * Ursprung 0) für ALLE vier Modelle — die eigentliche Tischhöhen-Anhebung
 * (0.816) steckt in `MONITOR_MODEL_POS.y`, genau wie beim PC-Turm. Wichtig:
 * diese Reihenfolge ist SKALIERUNGS-SICHER, weil sie auf 0 zielt (0*scale=0
 * bleibt immer 0) — ein früherer Versuch zielte direkt auf einen absoluten
 * Wert (0.816) INNERHALB der Skalierungs-Gruppe, was bei Stufe 4s neuer,
 * größerer Skalierung (siehe unten) zu falscher Höhe geführt hätte.
 *
 * `rotationY`: geometrisch hergeleitet (nicht geraten), per Node/three.js-
 * Skript — flächengewichteter Durchschnitts-Normalenvektor jedes Meshes
 * (Dreiecksfläche × Normale, aufsummiert, normalisiert):
 * - roehrenmonitor: "Screen.001"-Material, Normale (0,0,1) → lokal +Z → -90°
 * - monitor_flach_neu: "Mac"-Mesh (größte Fläche), Normale (0,-0.02,1.0) →
 *   ebenfalls lokal +Z → -90° (gleiche Konvention wie roehrenmonitor)
 * - monitor_curved: "tv"-Mesh, Normale (-0.612,0.04,-0.79) — keine reine
 *   Kardinalrichtung (gekrümmter Screen), Rotationswinkel algebraisch gelöst
 *   (R(θ)·(x,z)=(-1,0)) → θ≈0.912rad (≈52°)
 * - monitor_triple: die drei "Wallpaper"-Screen-Meshes zeigen alle
 *   überwiegend +X (Mitte (1,0,0), Seiten leicht nach ∓Z gefächert) → 180°
 * `scale` bei Stufe 4 von 1 auf 1.4 erhöht (User: "viel zu klein").
 */
const MONITOR_TIER_MODELS: Record<number, TierModelCfg> = {
  1: { url: "/models/roehrenmonitor.glb",    fix: [0, 0, 0],         scale: 1,   rotationY: -Math.PI / 2 },
  2: { url: "/models/monitor_flach_neu.glb", fix: [0, -0.615, -0.4], scale: 1,   rotationY: -Math.PI / 2 },
  3: { url: "/models/monitor_curved.glb",    fix: [0, -0.850, 0],    scale: 1,   rotationY: 0.912 },
  4: { url: "/models/monitor_triple.glb",    fix: [0, -0.850, 0],    scale: 1.4, rotationY: Math.PI },
};
const MONITOR_MODEL_POS = new THREE.Vector3(1.215, 0.816, -0.741);

for (const m of [...Object.values(PC_TIER_MODELS), ...Object.values(MONITOR_TIER_MODELS)]) useGLTF.preload(m.url);
// Nanoleaf-Dreieck-Panels über dem Schreibtisch (Mittelpunkt aller 21
// "Circle.*"-Meshes, nachgemessen) — Anker für den Pokale-Hotspot.
const SHELF_POS = new THREE.Vector3(0.19, 1.56, -0.11);
// Vordere Tischkante ("Cube.001", Blender-Zentrum umgerechnet) — Anker für den
// neuen Ausbau-Hotspot (Stufen-Upgrades, siehe mancave-items.ts).
const DESK_FRONT_POS = new THREE.Vector3(0.95, 0.86, -0.55);

function RoomModel() {
  const { scene } = useGLTF(ROOM_MODEL_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
}

function RoomLighting() {
  return (
    <>
      {/* Tisch/Couch/Raumschale ("Material.001") hatten trotz dunkler Grundfarbe
          (0.045) große weißflächige Specular-Highlights: bei Roughness=0.4
          reflektieren nahe Punktlichter auf einer flachen Fläche breit und hart,
          unabhängig von der dunklen Diffusfarbe (Fresnel-Reflexion ist bei
          Nicht-Metallen farbunabhängig). Fix: Rauheits-Textur auf Material.001
          (siehe Blender-Export) + hier zusätzlich etwas weniger und weiter
          entfernte Punktlichter, damit die Highlights nicht mehr ausbrennen. */}
      <ambientLight intensity={0.4} />
      <hemisphereLight args={["#5a7a90", "#141b26", 0.5]} />
      <directionalLight position={[EYE.x - 1, 3.2, EYE.z + 1]} intensity={0.85} color="#fff3df" />
      <pointLight position={[SCREEN_POS.x - 0.3, 1.9, SCREEN_POS.z]} intensity={0.7} color="#2dd4bf" distance={5} decay={2} />
      <pointLight position={[EYE.x, 2.3, EYE.z]} intensity={0.4} color="#ffffff" distance={4.5} decay={2} />
      <pointLight position={[SHELF_POS.x, SHELF_POS.y, SHELF_POS.z]} intensity={0.5} color="#a78bfa" distance={4} decay={2} />
    </>
  );
}

/**
 * Freies Umschauen per Drag — Kamera bleibt am festen Sitzplatz, nur die
 * Blickrichtung dreht sich, unbegrenzt in alle Richtungen.
 *
 * Die Pointer-Listener hängen bewusst am `<canvas>`-Element (`gl.domElement`),
 * NICHT am äußeren Container-Div: die Html-Hotspot-Buttons (Ausbau/Gadgets/
 * Pokale) werden von drei's `<Html>` als GESCHWISTER-Elemente des Canvas in
 * denselben Container gerendert. Lägen die Listener am Container, würde JEDER
 * Klick — auch auf einen Button — dort `pointerdown` auslösen und
 * `setPointerCapture` aufrufen; laut Pointer-Events-Spec wird dadurch auch
 * das synthetische `click`-Event auf das capture-haltende Element umgeleitet,
 * sodass der Button-`onClick` nie feuert (genau der Bug, der hier gemeldet
 * wurde — Ausbau/Gadgets/Pokale reagierten auf nichts). Am Canvas selbst
 * hängend bekommen die Buttons diese Events gar nicht erst ab.
 */
function LookAroundRig() {
  const { camera, gl } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0);
  const initialized = useRef(false);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  /* eslint-disable react-hooks/immutability -- Three.js-Objekt (R3F `camera`),
     keine React-Hook-Semantik: direktes Mutieren pro Frame ist der von R3F
     selbst dokumentierte Weg, dieselbe Ausnahme wie in RoomStage3D.tsx. */
  useEffect(() => {
    camera.position.copy(EYE);
    camera.up.set(0, 1, 0);
    camera.lookAt(LOOK_TARGET);
    const euler = new THREE.Euler().setFromQuaternion(camera.quaternion, "YXZ");
    yaw.current = euler.y;
    pitch.current = euler.x;
    camera.rotation.order = "YXZ";
    initialized.current = true;
  }, [camera]);

  useFrame(() => {
    if (!initialized.current) return;
    camera.position.copy(EYE);
    camera.rotation.set(pitch.current, yaw.current, 0);
  });
  /* eslint-enable react-hooks/immutability */

  /* eslint-disable react-hooks/immutability -- gl.domElement ist das reale
     <canvas>-DOM-Element (kein React-verwalteter Zustand); sein .style direkt
     zu setzen ist normales DOM-API-Verhalten, keine Hook-Wert-Mutation. */
  useEffect(() => {
    const el = gl.domElement;
    // touch-action:none NUR hier am Canvas, nicht am äußeren Container (siehe
    // dessen Kommentar unten) — sonst schränkt die CSS-Spec-Regel "Kind-
    // touch-action ist die Schnittmenge mit allen Vorfahren" auch das
    // Scrollen im Ausbau/Gadgets/Pokale-Popup ein, das ja ein Nachfahre
    // desselben Containers ist (genau der gemeldete "nicht scrollbar"-Bug).
    const prevTouchAction = el.style.touchAction;
    el.style.touchAction = "none";
    const onDown = (e: PointerEvent) => { dragging.current = true; last.current = { x: e.clientX, y: e.clientY }; el.setPointerCapture(e.pointerId); };
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - last.current.x, dy = e.clientY - last.current.y;
      last.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * 0.0045;
      pitch.current = Math.min(0.9, Math.max(-0.9, pitch.current - dy * 0.0045));
    };
    const onUp = () => { dragging.current = false; };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.style.touchAction = prevTouchAction;
    };
  }, [gl]);
  /* eslint-enable react-hooks/immutability */

  return null;
}

export default function MancaveScene3D({ data }: { data: MancaveData }) {
  const [panel, setPanel] = useState<MancavePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasGadgets = data.gadgets.some(g => g.zone === "other");
  const hasAffordableUpgrade = data.items.some(i => i.nextCost !== null && i.nextCost <= data.totalPoints);
  const pcTier = data.items.find(i => i.key === "computer")?.tier ?? 1;
  const monitorTier = data.items.find(i => i.key === "monitor")?.tier ?? 1;

  return (
    <div ref={containerRef}
      // touch-action:none absichtlich NICHT hier (siehe LookAroundRig-
      // Kommentar) — landet stattdessen gezielt nur auf dem Canvas, damit
      // Touch-Scrollen in den Popups (Ausbau/Gadgets/Pokale) funktioniert.
      className="relative w-full overflow-hidden rounded-3xl border border-white/[0.06] select-none"
      style={{ aspectRatio: "16 / 9", background: "#050810", cursor: "grab" }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={["#050810"]} />
        <fog attach="fog" args={["#050810", 5, 11]} />
        <RoomLighting />
        <LookAroundRig />
        <Suspense fallback={null}>
          <RoomModel />
          <SwappableProp tier={pcTier} models={PC_TIER_MODELS} position={PC_POS} />
          <SwappableProp tier={monitorTier} models={MONITOR_TIER_MODELS} position={MONITOR_MODEL_POS} />

          {/* Live-Dashboard direkt auf dem Monitor-Screen — 3D-verankert, immer sichtbar */}
          <Html center position={SCREEN_POS} style={{ pointerEvents: "auto" }}>
            <div className="w-[150px] h-[84px] rounded-[3px] overflow-hidden shadow-[0_0_18px_rgba(45,212,191,0.35)]">
              <MonitorScreenContent data={data} />
            </div>
          </Html>

          {/* Pokale & Abzeichen */}
          <Html position={SHELF_POS} center>
            <button onClick={() => setPanel("trophy")}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full whitespace-nowrap"
              style={{ background: "rgba(4,10,9,0.7)", border: "1px solid rgba(245,158,11,0.3)", backdropFilter: "blur(3px)" }}>
              <span className="text-[10px] font-semibold text-amber-300">🏆 Pokale &amp; Abzeichen</span>
            </button>
          </Html>

          {/* Ausbau (neues Stufen-Upgrade-System) — pulsiert, wenn sich ein
              Upgrade gerade leisten lässt, damit es auffällt. */}
          <Html position={DESK_FRONT_POS} center>
            <button onClick={() => setPanel("items")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full whitespace-nowrap ${hasAffordableUpgrade ? "animate-pulse" : ""}`}
              style={{ background: "rgba(4,10,9,0.7)", border: "1px solid rgba(94,234,212,0.35)", backdropFilter: "blur(3px)" }}>
              <span className="text-[10px] font-semibold text-teal-300">🛠️ Ausbau</span>
            </button>
          </Html>

          {/* Gadgets (echte besessene Items als Foto-Liste im Panel) */}
          {hasGadgets && (
            <Html position={PC_LABEL_POS} center>
              <button onClick={() => setPanel("gadgets")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full whitespace-nowrap"
                style={{ background: "rgba(4,10,9,0.7)", border: "1px solid rgba(45,212,191,0.3)", backdropFilter: "blur(3px)" }}>
                <span className="text-[10px] font-semibold text-teal-200">🎮 Gadgets</span>
              </button>
            </Html>
          )}
        </Suspense>
      </Canvas>

      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full pointer-events-none"
        style={{ background: "rgba(4,10,9,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <span className="text-[9px] text-gray-400">Klicken &amp; ziehen zum Umschauen</span>
      </div>

      {panel && (
        // z-index bewusst hoch gesetzt: drei's <Html>-Hotspots (Dashboard,
        // Pokale/Ausbau/Gadgets-Buttons) werden per React-Portal in denselben
        // Container gerendert, aber ERST asynchron beim R3F-Render-Loop
        // angehängt — sie landen dadurch im rohen DOM NACH diesem Overlay,
        // obwohl sie in der JSX weiter oben stehen. Ohne explizites z-index
        // gewinnt reine DOM-Reihenfolge, und die Buttons lagen sichtbar über
        // dem Popup statt darunter — das war der gemeldete Bug.
        <div className="absolute inset-0 z-50 flex items-center justify-center p-6" style={{ background: "rgba(2,5,8,0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setPanel(null)}>
          {/* min-h-0 ist Pflicht: als Flex-Kind von "items-center" hat dieses
              Div sonst ein implizites min-height:auto, das max-h+overflow-y-
              auto aushebelt (Inhalt läuft über statt zu scrollen) — der
              klassische Flexbox-Scroll-Bug, genau der gemeldete Fehler. */}
          <div onClick={e => e.stopPropagation()}
            className="glass card-shine rounded-2xl p-5 w-full max-w-md max-h-[85%] min-h-0 overflow-y-auto relative animate-fade-in">
            <button onClick={() => setPanel(null)} aria-label="Schließen"
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
              ✕
            </button>
            {panel === "trophy" && <TrophyPanel data={data} />}
            {panel === "gadgets" && <GadgetsPanel data={data} />}
            {panel === "items" && <ItemsPanel data={data} />}
          </div>
        </div>
      )}
    </div>
  );
}
