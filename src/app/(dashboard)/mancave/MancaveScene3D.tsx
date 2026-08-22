"use client";

/**
 * Echte interaktive 3D-Ego-Ansicht — löst zwei Anforderungen zusammen ab:
 * (1) die tatsächlichen Gaming-Zimmer-3D-Modelle (dieselben GLBs wie
 * `FurniturePrimitive`/`RoomStage3D`) statt vorgerenderter Fotos, und
 * (2) echtes, unbegrenztes 360°-Umschauen per Drag statt Foto-Überblendung.
 *
 * Eigene, einfache Raum-Hülle (Boden + 4 Wände + Decke, blockfarben, kein
 * Grid-System) statt der komplexen Iso-Editor-Geometrie aus room-3d.ts/
 * RoomStage3D.tsx — die ist an den Möbel-Editor gekoppelt (Wandflächen-
 * Auswahl, Drag&Drop-Snapping) und für eine reine Ego-Betrachtung unnötig
 * komplex. Die Möbel-Primitiven selbst (`FurniturePrimitive`) sind aber exakt
 * dieselben wie im echten Zimmer — 1 Rasterzelle = 1 Three.js-Einheit, jedes
 * Item positioniert sich intern relativ zu einem Fußpunkt bei Y=0 (siehe
 * FurniturePrimitive.tsx-Doku), die Raum-Hülle hier nutzt dieselbe Einheit.
 */

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { FurniturePrimitive } from "@/app/(dashboard)/zimmer/furniture/FurniturePrimitive";
import { getRoomItem, type RoomItemDef, type RoomCategory } from "@/lib/room-items";
import type { MancaveData } from "./mancave-data";
import { MonitorScreenContent, TrophyPanel, GadgetsPanel, type MancavePanel } from "./MancaveSharedUI";

// ── Raum-Maße (Three.js-Einheiten, dieselbe Skala wie das echte Zimmer) ──
const ROOM_W = 9;
const ROOM_D = 8;
const ROOM_H = 4;
const DESK_X = ROOM_W * 0.5;
const DESK_Z = 2.5;
const EYE = new THREE.Vector3(DESK_X, 1.15, 4.45);

function pick(items: RoomItemDef[], category: RoomCategory): RoomItemDef | undefined {
  return items.find(d => d.category === category);
}

/** Boden + 4 Wände + Decke — reine Blockfarben, kein Void egal wohin man schaut. */
function RoomShell() {
  const wallMat = { color: "#0a1018", roughness: 0.85, metalness: 0.05 } as const;
  const floorMat = { color: "#141b22", roughness: 0.7, metalness: 0.1 } as const;
  return (
    <group>
      <mesh position={[ROOM_W / 2, 0, ROOM_D / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial {...floorMat} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H, ROOM_D / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial color="#05080c" roughness={0.9} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[ROOM_W / 2, ROOM_H / 2, ROOM_D]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[0, ROOM_H / 2, ROOM_D / 2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[ROOM_W, ROOM_H / 2, ROOM_D / 2]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[ROOM_D, ROOM_H]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Teal-Lichtfuge Boden/Rückwand — dieselbe Stimmung wie die restlige Mancave */}
      <mesh position={[ROOM_W / 2, 0.01, 0.02]}>
        <boxGeometry args={[ROOM_W, 0.02, 0.02]} />
        <meshStandardMaterial color="#2dd4bf" emissive="#2dd4bf" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RoomLighting() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={["#4d6a80", "#0a0f14", 0.6]} />
      <directionalLight position={[DESK_X - 2, 3.5, DESK_Z + 2]} intensity={1.8} color="#fff3df" />
      <pointLight position={[DESK_X, 1.8, DESK_Z + 1]} intensity={1.2} color="#2dd4bf" distance={6} decay={2} />
      <pointLight position={[2, 1.6, ROOM_D - 1.5]} intensity={0.8} color="#2dd4bf" distance={6} decay={2} />
      <pointLight position={[DESK_X, 2.2, EYE.z]} intensity={0.9} color="#ffffff" distance={5} decay={2} />
    </>
  );
}

/** Freies Umschauen per Drag — Kamera bleibt am festen Sitzplatz, nur die Blickrichtung dreht sich, unbegrenzt in alle Richtungen. */
function LookAroundRig({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { camera } = useThree();
  const yaw = useRef(0);
  const pitch = useRef(0.12);
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  /* eslint-disable react-hooks/immutability -- Three.js-Objekt (R3F `camera`),
     keine React-Hook-Semantik: direktes Mutieren pro Frame ist der von R3F
     selbst dokumentierte Weg, dieselbe Ausnahme wie in RoomStage3D.tsx. */
  useEffect(() => {
    camera.position.copy(EYE);
    camera.rotation.order = "YXZ";
  }, [camera]);

  useFrame(() => {
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

function Item({ def, position, rotationY = 0 }: { def: RoomItemDef; position: [number, number, number]; rotationY?: number }) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <FurniturePrimitive def={def} />
    </group>
  );
}

export default function MancaveScene3D({ data }: { data: MancaveData }) {
  const [panel, setPanel] = useState<MancavePanel>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => data.roomItemKeys.map(k => getRoomItem(k)).filter((d): d is RoomItemDef => !!d),
    [data.roomItemKeys],
  );
  const desk       = pick(items, "schreibtisch") ?? getRoomItem("schreibtisch_alt")!;
  const monitor    = pick(items, "bildschirm")   ?? getRoomItem("roehrenmonitor")!;
  const pc         = pick(items, "rechner")      ?? getRoomItem("pc_billig")!;
  const peripherals = items.filter(d => d.category === "peripherie").slice(0, 3);
  const lights      = items.filter(d => d.category === "licht").slice(0, 2);
  const konsolen    = items.filter(d => d.category === "konsole").slice(0, 1);
  const shelf       = items.find(d => d.key === "pokalregal") ?? items.find(d => d.key === "regal_holz");

  const hasGadgets = peripherals.length > 0 || lights.length > 0 || konsolen.length > 0 || !!pc;

  return (
    <div ref={containerRef}
      className="relative w-full overflow-hidden rounded-3xl border border-white/[0.06] touch-none select-none"
      style={{ aspectRatio: "16 / 9", background: "#050810", cursor: "grab" }}>
      <Canvas shadows dpr={[1, 1.5]} gl={{ antialias: true }}>
        <color attach="background" args={["#050810"]} />
        <fog attach="fog" args={["#050810", 6, 13]} />
        <RoomLighting />
        <RoomShell />
        <LookAroundRig containerRef={containerRef} />
        <Suspense fallback={null}>
          <Item def={desk} position={[DESK_X, 0, DESK_Z]} />
          <Item def={monitor} position={[DESK_X, 0, DESK_Z - 0.35]} />
          <Item def={pc} position={[DESK_X - 2.6, 0, DESK_Z + 0.1]} />
          {peripherals.map((d, i) => (
            <Item key={d.key} def={d} position={[DESK_X - 0.6 + i * 0.55, 0, DESK_Z - 0.55]} />
          ))}
          {lights.map((d, i) => (
            <Item key={d.key} def={d} position={[DESK_X + 1.3, 0, DESK_Z - 0.2 - i * 0.6]} />
          ))}
          {konsolen.map((d, i) => (
            <Item key={d.key} def={d} position={[DESK_X - 2.6, 0, DESK_Z + 0.8 + i * 0.5]} />
          ))}
          {shelf && <Item def={shelf} position={[1.6, 0, 0.12]} />}

          {/* Live-Dashboard direkt auf dem Monitor-Screen — 3D-verankert, immer sichtbar */}
          <Html center occlude
            position={[DESK_X, 1.12, DESK_Z - 0.66]}
            style={{ pointerEvents: "auto" }}>
            <div className="w-[150px] h-[84px] rounded-[3px] overflow-hidden shadow-[0_0_18px_rgba(45,212,191,0.35)]">
              <MonitorScreenContent data={data} />
            </div>
          </Html>

          {/* Wandregal-Hotspot */}
          {shelf && (
            <Html position={[1.6, 1.7, 0.15]} center>
              <button onClick={() => setPanel("trophy")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full whitespace-nowrap"
                style={{ background: "rgba(4,10,9,0.7)", border: "1px solid rgba(245,158,11,0.3)", backdropFilter: "blur(3px)" }}>
                <span className="text-[10px] font-semibold text-amber-300">🏆 Pokale &amp; Abzeichen</span>
              </button>
            </Html>
          )}

          {/* Gadgets-Hotspot beim PC */}
          {hasGadgets && (
            <Html position={[DESK_X - 2.6, 1.0, DESK_Z + 0.1]} center>
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
