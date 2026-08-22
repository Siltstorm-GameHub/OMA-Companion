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
/**
 * Anhebung für "steht auf dem Schreibtisch"-Items (Monitor, Tastatur, Maus,
 * Headset, Mikro, Webcam, Stream-Deck) — derselbe fixe Wert wie
 * `DESK_STAND_HEIGHT` in RoomStage3D.tsx. Gilt NACH `MODEL_ORIGIN_FIX` (siehe
 * unten) — manche GLBs bringen bereits eine eigene Tischhöhe mit, die zuerst
 * auf den Fußpunkt Y=0 normalisiert wird, sonst würden sich beide Anhebungen
 * addieren und das Item über der Tischplatte schweben lassen.
 */
const DESK_STAND_HEIGHT = 0.74;
/** Wandregal-Höhe — grobe Augenhöhe, da das eigene Raum-Shell kein Grid-Koordinatensystem hat. */
const SHELF_Y = 1.35;

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
      {/* Deutlich angehobener Grundpegel: die Raum-Hülle ist bewusst voll
          umschlossen (kein Void beim 360°-Umschauen), muss also überall lesbar
          bleiben — nicht nur am Schreibtisch, der Rest des Zimmers ist sonst
          beim Umschauen fast schwarz. */}
      <ambientLight intensity={0.85} />
      <hemisphereLight args={["#5a7a90", "#141b26", 0.9]} />
      <directionalLight position={[DESK_X - 2, 3.5, DESK_Z + 2]} intensity={1.8} color="#fff3df" />
      <pointLight position={[DESK_X, 1.8, DESK_Z + 1]} intensity={1.3} color="#2dd4bf" distance={7} decay={2} />
      <pointLight position={[2, 1.6, ROOM_D - 1.5]} intensity={1.1} color="#2dd4bf" distance={7} decay={2} />
      <pointLight position={[DESK_X, 2.2, EYE.z]} intensity={0.9} color="#ffffff" distance={5} decay={2} />
      {/* Zusätzliche Füll-Lichter für die möblierten Ecken (Wandregal, leere Raumhälfte) */}
      <pointLight position={[1.6, SHELF_Y + 0.6, 0.6]} intensity={0.9} color="#ffd9a0" distance={4} decay={2} />
      <pointLight position={[ROOM_W - 1.5, 2.0, ROOM_D - 2]} intensity={0.6} color="#4d6a80" distance={7} decay={2} />
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

/**
 * Korrektur-Versatz je Katalog-Key, gemessen per Box3 an den echten GLBs
 * (`public/models/*.glb`) — die Modelle sind NICHT einheitlich exportiert:
 * manche sitzen sauber mit dem Fußpunkt bei (0,0,0) (z.B. `roehrenmonitor`,
 * `gaming_maus`), andere haben ihren Ursprung an einer völlig beliebigen
 * Stelle aus der ursprünglichen Blender-Szene stehen gelassen (`tastatur_mech`
 * z.B. bei X≈-3.3/Z≈-2.8 statt bei 0) oder bringen bereits eine eigene
 * Tischhöhe mit (`monitor_flach`/`monitor_144`/`monitor_dreifach`/
 * `schreibtischlampe` starten alle schon bei Y≈0.85 statt bei 0). Dieser
 * Versatz zentriert jedes Modell auf (X=0, Z=0, Y=Fußpunkt) — DANACH ist die
 * einheitliche Außen-Platzierung (DESK_STAND_HEIGHT etc.) für alle Items
 * gleich verlässlich, egal wie das einzelne GLB ursprünglich exportiert
 * wurde. Fehlt ein Key hier, war das Modell beim Nachmessen bereits sauber.
 */
const MODEL_ORIGIN_FIX: Partial<Record<string, [number, number, number]>> = {
  monitor_flach:      [0, -0.615, -0.4],
  monitor_144:        [0, -0.85, 0],
  monitor_dreifach:   [0, -0.85, 0],
  pc_highend:         [-8.674, 0.721, 0.2025],
  konsole_retro:      [1.321, 0, -1.7285],
  steckdosenleiste:   [-0.059, 0.158, 2.448],
  tastatur_mech:      [3.2795, -2.331, 2.811],
  mikrofon:           [-3.2765, -0.082, 1.164],
  schreibtischlampe:  [0, -0.85, 0],
  stehlampe:          [-1.3905, -0.018, 0.509],
  pc_billig:          [-0.357, 0.011, -0.09],
  regal_holz:         [0, 0, -0.277],
  schreibtisch_neon:  [0, -0.138, -0.2115],
  schreibtisch_eck:   [0, -0.019, 0],
};

function Item({ def, position, rotationY = 0 }: { def: RoomItemDef; position: [number, number, number]; rotationY?: number }) {
  const fix = MODEL_ORIGIN_FIX[def.key];
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <group position={fix ?? [0, 0, 0]}>
        <FurniturePrimitive def={def} />
      </group>
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
        <fog attach="fog" args={["#050810", 9, 17]} />
        <RoomLighting />
        <RoomShell />
        <LookAroundRig containerRef={containerRef} />
        <Suspense fallback={null}>
          {/*
           * Layout nach dem Vorbild der Blender-Referenzszene
           * (3DAssetsRoom/LP_Ortographic_Gaming_Room.glb, siehe
           * [[mancave-front-photos-project]] in memory): dort steht der PC
           * NICHT auf dem Boden neben dem Tisch, sondern MIT auf der
           * Tischplatte neben dem Monitor — alles an einer Wand versammelt,
           * statt über den Boden verstreut. Monitor bleibt zentral/leicht
           * links, PC rückt rechts daneben auf den Tisch.
           */}
          <Item def={desk} position={[DESK_X, 0, DESK_Z]} />
          <Item def={monitor} position={[DESK_X - 0.6, DESK_STAND_HEIGHT, DESK_Z - 0.5]} />
          <Item def={pc} position={[DESK_X + 1.3, DESK_STAND_HEIGHT, DESK_Z - 0.35]} />
          {/* Peripherie steht IMMER auf der Tischplatte — nahe der Vorderkante
              (größeres Z = näher an der Kamera/dem Sitzplatz), unter dem
              Monitor zentriert, damit sich Maus/Tastatur/Headset nicht mit
              dem PC rechts überschneiden. */}
          {peripherals.map((d, i) => (
            <Item key={d.key} def={d} position={[DESK_X - 1.3 + i * 0.65, DESK_STAND_HEIGHT, DESK_Z + 0.9]} />
          ))}
          {/* Licht: nur Schreibtischlampen (mustStandOn "desk") stehen auf der
              Tischplatte (freier Platz links vom Monitor), Steh-/Ringlicht
              bleiben auf dem Boden daneben. */}
          {lights.map((d, i) => (
            <Item key={d.key} def={d}
              position={d.mustStandOn === "desk"
                ? [DESK_X - 2.2, DESK_STAND_HEIGHT, DESK_Z - 0.3]
                : [DESK_X + 2.9, 0, DESK_Z + 0.6 + i * 0.7]} />
          ))}
          {konsolen.map((d, i) => (
            <Item key={d.key} def={d} position={[DESK_X - 3.0, 0, DESK_Z + 0.8 + i * 0.5]} />
          ))}
          {shelf && <Item def={shelf} position={[1.6, SHELF_Y, 0.12]} />}

          {/* Live-Dashboard direkt auf dem Monitor-Screen — 3D-verankert, immer sichtbar */}
          <Html center occlude
            position={[DESK_X - 0.6, 1.12, DESK_Z - 0.66]}
            style={{ pointerEvents: "auto" }}>
            <div className="w-[150px] h-[84px] rounded-[3px] overflow-hidden shadow-[0_0_18px_rgba(45,212,191,0.35)]">
              <MonitorScreenContent data={data} />
            </div>
          </Html>

          {/* Wandregal-Hotspot */}
          {shelf && (
            <Html position={[1.6, SHELF_Y + 0.55, 0.15]} center>
              <button onClick={() => setPanel("trophy")}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full whitespace-nowrap"
                style={{ background: "rgba(4,10,9,0.7)", border: "1px solid rgba(245,158,11,0.3)", backdropFilter: "blur(3px)" }}>
                <span className="text-[10px] font-semibold text-amber-300">🏆 Pokale &amp; Abzeichen</span>
              </button>
            </Html>
          )}

          {/* Gadgets-Hotspot beim PC (jetzt auf dem Tisch statt am Boden) */}
          {hasGadgets && (
            <Html position={[DESK_X + 1.3, DESK_STAND_HEIGHT + 0.35, DESK_Z - 0.35]} center>
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
