"use client";

/**
 * Prozedurale Low-Poly-Möbel für die 3D-Zimmer-Bühne — kein Foto-Sprite,
 * kein glTF-Asset. Ein Dispatcher (`FurniturePrimitive`) mappt `item.key`
 * bzw. `item.category` auf ein kleines Set wiederverwendbarer "Shape-Rezepte"
 * (Desk, Monitor, Chair, Shelf, Light, Plant, Box) — die meisten Katalog-Items
 * teilen sich eine Silhouette und unterscheiden sich nur in Maß/Farbe.
 *
 * Alle Rezepte sind in Rasterzellen-Einheiten (w×h aus RoomItemDef) gebaut und
 * werden vom Aufrufer per `gridToWorld` positioniert — hier wird nur um den
 * lokalen Ursprung (Fußmittelpunkt) herum modelliert.
 */

import { useMemo } from "react";
import { RoundedBox, useGLTF } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, type Material } from "three";
import { ACCENT_COLORS } from "@/lib/room-3d";
import type { RoomItemDef } from "@/lib/room-items";

interface ShapeProps {
  def: RoomItemDef;
}

const METAL = "#3a3f4c";

/**
 * Authored-Modelle (Blender → GLB) für einzelne "Hero"-Möbelstücke, die mehr
 * Detail verdienen als sich sinnvoll aus Primitiven zusammensetzen lässt.
 * Key → Pfad unter public/, damit ein Item OHNE Eintrag hier automatisch auf
 * sein prozedurales Shape-Rezept zurückfällt (siehe pickShape/Dispatcher
 * unten) — kein Alles-oder-nichts-Umbau des Katalogs nötig.
 */
const GLB_MODELS: Partial<Record<string, string>> = {
  schreibtisch_alt: "/models/desk_simple.glb",
  schreibtisch_eck: "/models/desk_eck.glb",
  stuhl_gaming:     "/models/chair_gaming.glb",
  stuhl_buero:      "/models/chair_office.glb",
  monitor_144:      "/models/monitor_curved.glb",
  monitor_flach:    "/models/monitor_flach_neu.glb",
  monitor_dreifach: "/models/monitor_triple.glb",
  pflanze:          "/models/plant_succulent.glb",
  stehlampe:         "/models/lamp_floor.glb",
  schreibtischlampe: "/models/lamp_desk.glb",
  gitarre_deko:      "/models/guitar_deco.glb",
  konsole_neu:       "/models/console_modern.glb",
  plattenspieler:    "/models/turntable.glb",
  regal_holz:        "/models/regal_buecher.glb",
  nanoleaf:          "/models/nanoleaf_tri.glb",
  neon_blitz:        "/models/neon_blitz.glb",
  schreibtisch_neon: "/models/desk_neon.glb",
  stuhl_racing:      "/models/chair_racing.glb",
  tastatur_mech:     "/models/keyboard_mech.glb",
  gaming_maus:       "/models/mouse_gaming.glb",
};

for (const path of Object.values(GLB_MODELS)) {
  if (path) useGLTF.preload(path);
}

/**
 * Jede Instanz braucht ihre EIGENE Kopie der geladenen Szene: dasselbe
 * `scene`-Objekt aus dem useGLTF-Cache zweimal gleichzeitig einzuhängen
 * (z.B. platziertes Item + Ghost-Vorschau beim Verschieben im Editor) würde
 * Three.js dazu bringen, es zwischen den beiden Eltern hin- und
 * herzureißen — nur die zuletzt gerenderte Stelle zeigt es dann noch an.
 */
function GltfFurniture({ path }: { path: string }) {
  const { scene } = useGLTF(path);
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    // Dieselbe Tonemapping-Falle wie bei den Primitiven (siehe matteProps
    // oben): Blender-Materialien ohne eigenes Glühen wirken unter Three.js'
    // Standard-Tonemapping erheblich dunkler als beabsichtigt. Bereits
    // bewusst leuchtende Materialien (z.B. der Bildschirm-Glow, in Blender
    // extra mit hoher Emission gebaut) bleiben unangetastet.
    clone.traverse(obj => {
      if (!(obj instanceof Mesh)) return;
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      obj.material = Array.isArray(obj.material)
        ? mats.map(m => boostMatte(m))
        : boostMatte(mats[0]);
    });
    return clone;
  }, [scene]);
  return <primitive object={cloned} />;
}

function boostMatte(material: Material) {
  if (!(material instanceof MeshStandardMaterial)) return material;
  if (material.emissiveIntensity > 0.5) return material; // absichtlich schon leuchtend (z.B. Screen)
  const m = material.clone();
  m.emissive.copy(m.color);
  m.emissiveIntensity = 0.35;
  return m;
}

/**
 * Kleiner Eigenleuchtanteil auf jedem matten Material — ohne das komprimiert
 * Three.js' Standard-Tonemapping normal beleuchtete Flächen erheblich dunkler
 * als der reine Hex-Wert vermuten lässt (sichtbar wird dann fast nur, was
 * `toneMapped={false}` gesetzt hat, z.B. Bildschirm-Glow). Ein moderater
 * Eigenleuchtanteil garantiert Mindesthelligkeit, ohne wie eine Lichtquelle
 * zu wirken (siehe RoomShell in RoomStage3D.tsx für dieselbe Begründung).
 */
function matteProps(color: string, intensity = 0.35) {
  return { color, emissive: color, emissiveIntensity: intensity } as const;
}

function Desk({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const legH = 0.75;
  return (
    <group>
      <RoundedBox args={[def.w * 0.94, 0.16, def.h * 0.9]} radius={0.04} position={[0, legH, 0]}>
        <meshStandardMaterial {...matteProps(accent)} roughness={0.35} metalness={0.1} />
      </RoundedBox>
      {[-1, 1].map(sx => [-1, 1].map(sz => (
        <RoundedBox
          key={`${sx}-${sz}`}
          args={[0.12, legH, 0.12]} radius={0.02}
          position={[sx * (def.w * 0.94 / 2 - 0.12), legH / 2, sz * (def.h * 0.9 / 2 - 0.12)]}
        >
          <meshStandardMaterial {...matteProps(METAL)} roughness={0.5} metalness={0.4} />
        </RoundedBox>
      )))}
    </group>
  );
}

function Monitor({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <group position={[0, 0.85, 0]}>
      <RoundedBox args={[0.24, 0.03, 0.16]} radius={0.01} position={[0, 0.015, 0]}>
        <meshStandardMaterial {...matteProps(METAL)} roughness={0.5} metalness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.4, 0.1]} radius={0.02} position={[0, 0.2, 0]}>
        <meshStandardMaterial {...matteProps(METAL)} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[def.w * 0.8, def.h * 0.45, 0.06]} radius={0.03} position={[0, 0.55, 0]}>
        <meshStandardMaterial {...matteProps("#252a38")} roughness={0.4} />
      </RoundedBox>
      {/* Dünner heller Rahmen ums Screen-Glow — gibt dem Bildschirm eine
          erkennbare Kante statt eines nahtlos ins Gehäuse übergehenden Flecks. */}
      <mesh position={[0, 0.55, 0.033]}>
        <planeGeometry args={[def.w * 0.72, def.h * 0.39]} />
        <meshStandardMaterial {...matteProps("#0d0f16")} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.55, 0.035]}>
        <planeGeometry args={[def.w * 0.68, def.h * 0.35]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Tower({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <group>
      <RoundedBox args={[def.w * 0.7, def.h * 0.9, def.w * 0.6]} radius={0.04} position={[0, def.h * 0.45, 0]}>
        <meshStandardMaterial {...matteProps("#2b2e3a")} roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* Lüfter-Glow vorne */}
      <mesh position={[0, def.h * 0.6, def.w * 0.31]}>
        <circleGeometry args={[0.14, 24]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {/* Dünner Akzentstreifen an der Vorderkante — bricht die sonst flache
          dunkle Gehäusefläche auf. */}
      <mesh position={[0, def.h * 0.9 - 0.03, def.w * 0.31]}>
        <boxGeometry args={[def.w * 0.68, 0.03, 0.01]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Chair({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <group>
      <RoundedBox args={[def.w * 0.85, 0.16, def.w * 0.85]} radius={0.05} position={[0, 0.55, 0]}>
        <meshStandardMaterial {...matteProps(accent)} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[def.w * 0.8, def.h * 0.55, 0.14]} radius={0.05} position={[0, 1.0, -def.w * 0.35]}>
        <meshStandardMaterial {...matteProps(accent)} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.5, 0.1]} radius={0.03} position={[0, 0.28, 0]}>
        <meshStandardMaterial {...matteProps(METAL)} roughness={0.5} metalness={0.4} />
      </RoundedBox>
    </group>
  );
}

function Shelf({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const boards = 3;
  return (
    <group>
      {Array.from({ length: boards }).map((_, i) => {
        const y = (i + 1) * (def.h * 0.85 / boards);
        return (
          <group key={i}>
            <RoundedBox args={[def.w * 0.92, 0.06, def.h * 0.8]} radius={0.02} position={[0, y, 0]}>
              <meshStandardMaterial {...matteProps(accent)} roughness={0.5} />
            </RoundedBox>
            {/* Winkel-Halterungen an beiden Enden — sonst wirken die Bretter
                wie freischwebende Platten statt an der Wand montiert. */}
            {[-1, 1].map(side => (
              <RoundedBox
                key={side}
                args={[0.05, 0.08, 0.12]} radius={0.01}
                position={[side * (def.w * 0.92 / 2 - 0.06), y - 0.05, -def.h * 0.3]}
              >
                <meshStandardMaterial {...matteProps(METAL)} roughness={0.5} metalness={0.4} />
              </RoundedBox>
            ))}
          </group>
        );
      })}
    </group>
  );
}

function LightStrip({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <RoundedBox args={[def.w * 0.95, def.h * 0.5, 0.04]} radius={0.02} position={[0, def.h * 0.5, 0.02]}>
      <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} />
    </RoundedBox>
  );
}

function Plant({ def }: ShapeProps) {
  return (
    <group>
      <RoundedBox args={[def.w * 0.55, 0.4, def.w * 0.55]} radius={0.06} position={[0, 0.2, 0]}>
        <meshStandardMaterial {...matteProps("#5a4632")} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, def.h * 0.55, 0]}>
        <sphereGeometry args={[def.w * 0.4, 12, 10]} />
        <meshStandardMaterial {...matteProps("#3f8f5c")} roughness={0.6} />
      </mesh>
    </group>
  );
}

function GenericBox({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const bodyH = def.h * 0.85;
  return (
    <group>
      <RoundedBox args={[def.w * 0.85, bodyH, def.w * 0.85]} radius={0.05} position={[0, def.h * 0.42, 0]}>
        <meshStandardMaterial {...matteProps("#2b2e3a")} roughness={0.5} metalness={0.15} />
      </RoundedBox>
      {/* Akzentfarbener Deckel-Streifen — sonst sind sehr unterschiedliche
          Peripherie-Items (Mikro, Headset, Kaffeemaschine, …) alle nur ein
          neutraler Würfel und kaum voneinander zu unterscheiden. */}
      <RoundedBox
        args={[def.w * 0.85, bodyH * 0.22, def.w * 0.85]} radius={0.05}
        position={[0, def.h * 0.42 + bodyH * 0.39, 0]}
      >
        <meshStandardMaterial {...matteProps(accent)} roughness={0.4} metalness={0.15} />
      </RoundedBox>
    </group>
  );
}

/** Ordnet ein Katalog-Item einem der obigen Shape-Rezepte zu und rendert es direkt. */
export function FurniturePrimitive({ def }: ShapeProps) {
  const glbPath = GLB_MODELS[def.key];
  if (glbPath) return <GltfFurniture path={glbPath} />;
  if (def.tags.includes("desk")) return <Desk def={def} />;
  if (def.tags.includes("monitor") || def.tags.includes("crt")) return <Monitor def={def} />;
  if (def.tags.includes("pc")) return <Tower def={def} />;
  if (def.tags.includes("chair") || def.tags.includes("chair_gaming")) return <Chair def={def} />;
  if (def.tags.includes("shelf") || def.tags.includes("trophy_shelf")) return <Shelf def={def} />;
  if (def.tags.includes("light") || def.tags.includes("neon")) return <LightStrip def={def} />;
  if (def.tags.includes("plant")) return <Plant def={def} />;
  return <GenericBox def={def} />;
}
