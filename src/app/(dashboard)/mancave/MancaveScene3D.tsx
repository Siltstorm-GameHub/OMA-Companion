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
 * Konsequenz: die Szene zeigt (noch) NICHT die individuellen Gaming-Zimmer-
 * Items des Users, sondern die feste Referenz-Kulisse — passt zur
 * angekündigten Stufen-Planung (Position bleibt fix, nur das Aussehen pro
 * Slot wechselt später mit dem Ausbaustand). Das Gadgets-Panel zeigt die
 * echten besessenen Items weiterhin als Foto-Liste (siehe MancaveSharedUI).
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
import { MonitorScreenContent, TrophyPanel, GadgetsPanel, type MancavePanel } from "./MancaveSharedUI";
import type { MancaveData } from "./mancave-data";

const ROOM_MODEL_URL = "/models/mancave_room.glb";
useGLTF.preload(ROOM_MODEL_URL);

// ── Kamera: 1:1 aus der Blender-Referenzkamera "DeskCam" übernommen ──────
// Blender (Z-up): eye=(0.05,0.95,1.28), forward=(0.9598,0,-0.2806).
// glTF/three.js (Y-up): x→x, y→z_blender, z→-y_blender.
const EYE = new THREE.Vector3(0.05, 1.28, -0.95);
const FORWARD = new THREE.Vector3(0.9598, -0.2806, 0);
const LOOK_TARGET = EYE.clone().add(FORWARD);

// Bildschirm-Mitte des Haupt-Monitors ("Cube.015" in der Blender-Szene, Material
// "Pc screen3") — um 0.05 Richtung Kamera versetzt (entlang -FORWARD), sonst
// verdeckt die Bildschirm-Fläche selbst das Html-Overlay (Selbst-Okklusion,
// da die Position sonst exakt AUF der Glasfläche liegt statt knapp davor).
const SCREEN_POS = new THREE.Vector3(1.215, 1.091, -0.741);
// PC-Tower-Position ("Cube.017") — Anker für den Gadgets-Hotspot.
const PC_POS = new THREE.Vector3(1.05, 1.02, -0.29);
// Wand-/Deko-Bereich (Nanoleaf-Panels über dem Schreibtisch) — Anker für den
// Pokale-Hotspot. Y abgesenkt (war zu nah an der Decke, außerhalb des
// sichtbaren Standard-Ausschnitts).
const SHELF_POS = new THREE.Vector3(0.55, 1.7, -0.75);

function RoomModel() {
  const { scene } = useGLTF(ROOM_MODEL_URL);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
}

function RoomLighting() {
  return (
    <>
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#5a7a90", "#141b26", 0.7]} />
      <directionalLight position={[EYE.x - 1, 3.2, EYE.z + 1]} intensity={1.6} color="#fff3df" />
      <pointLight position={[SCREEN_POS.x - 0.3, 1.9, SCREEN_POS.z]} intensity={1.2} color="#2dd4bf" distance={5} decay={2} />
      <pointLight position={[EYE.x, 2.0, EYE.z]} intensity={0.8} color="#ffffff" distance={4} decay={2} />
      <pointLight position={[SHELF_POS.x, SHELF_POS.y, SHELF_POS.z]} intensity={0.7} color="#a78bfa" distance={4} decay={2} />
    </>
  );
}

/** Freies Umschauen per Drag — Kamera bleibt am festen Sitzplatz, nur die Blickrichtung dreht sich, unbegrenzt in alle Richtungen. */
function LookAroundRig({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { camera } = useThree();
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

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
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
    };
  }, [containerRef]);

  return null;
}

export default function MancaveScene3D({ data }: { data: MancaveData }) {
  const [panel, setPanel] = useState<MancavePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const hasGadgets = data.gadgets.some(g => g.zone === "other");

  return (
    <div ref={containerRef}
      className="relative w-full overflow-hidden rounded-3xl border border-white/[0.06] touch-none select-none"
      style={{ aspectRatio: "16 / 9", background: "#050810", cursor: "grab" }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={["#050810"]} />
        <fog attach="fog" args={["#050810", 5, 11]} />
        <RoomLighting />
        <LookAroundRig containerRef={containerRef} />
        <Suspense fallback={null}>
          <RoomModel />

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

          {/* Gadgets (echte besessene Items als Foto-Liste im Panel) */}
          {hasGadgets && (
            <Html position={PC_POS} center>
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
        <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: "rgba(2,5,8,0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setPanel(null)}>
          <div onClick={e => e.stopPropagation()}
            className="glass card-shine rounded-2xl p-5 w-full max-w-md max-h-[85%] overflow-y-auto relative animate-fade-in">
            <button onClick={() => setPanel(null)} aria-label="Schließen"
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
              ✕
            </button>
            {panel === "trophy" && <TrophyPanel data={data} />}
            {panel === "gadgets" && <GadgetsPanel data={data} />}
          </div>
        </div>
      )}
    </div>
  );
}
