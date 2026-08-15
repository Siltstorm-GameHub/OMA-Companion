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
  pc_violett:       "/models/pc_tower_purple.glb",
  headset:          "/models/headset_gaming.glb",
  pc_gaming:        "/models/pc_white_rgb.glb",
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
export function GltfFurniture({ path }: { path: string }) {
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

/** Flach an der Wand montiertes Panel (Poster, Whiteboard) — statt eines
 *  vollen Würfels ein gerahmtes, dünnes Rechteck mit sichtbarem Rahmen. */
function WallPanel({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <group position={[0, def.h / 2, 0]}>
      <RoundedBox args={[def.w * 0.92, def.h * 0.92, 0.05]} radius={0.02} position={[0, 0, 0.025]}>
        <meshStandardMaterial {...matteProps(accent)} roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 0, 0.052]}>
        <planeGeometry args={[def.w * 0.8, def.h * 0.78]} />
        <meshStandardMaterial {...matteProps("#1c1f29")} roughness={0.4} />
      </mesh>
    </group>
  );
}

/** Flacher Teppich — statt eines hochkant stehenden Würfels eine dünne,
 *  breite Matte knapp über dem Boden. */
function Rug({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <RoundedBox args={[def.w * 0.94, 0.03, def.h * 0.94]} radius={0.015} position={[0, 0.015, 0]}>
      <meshStandardMaterial {...matteProps(accent)} roughness={0.85} />
    </RoundedBox>
  );
}

/** Steckdosenleiste — länglicher Riegel mit kleinen Dosen-Noppen statt eines
 *  neutralen Würfels. */
function PowerStrip({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const sockets = Math.max(2, def.w);
  return (
    <group>
      <RoundedBox args={[def.w * 0.9, 0.12, def.h * 0.5]} radius={0.03} position={[0, 0.06, 0]}>
        <meshStandardMaterial {...matteProps("#20242e")} roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {Array.from({ length: sockets }).map((_, i) => {
        const x = (i + 0.5) / sockets * def.w * 0.8 - def.w * 0.4;
        return (
          <mesh key={i} position={[x, 0.121, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.045, 16]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Kleine Schreibtisch-Gadgets (Webcam, Mikro, Stream-Deck, Capture-Karte,
 *  Retro-Konsole) — teilen sich einen flachen Sockel, unterscheiden sich aber
 *  in einem charakteristischen Aufsatz statt austauschbarer Würfel zu sein. */
function Gadget({ def, kind }: ShapeProps & { kind: "cam" | "mic" | "streamdeck" | "capture" | "console" }) {
  const accent = ACCENT_COLORS[def.accent];
  if (kind === "mic") {
    return (
      <group>
        <RoundedBox args={[def.w * 0.4, 0.04, def.w * 0.4]} radius={0.02} position={[0, 0.02, 0]}>
          <meshStandardMaterial {...matteProps("#20242e")} roughness={0.5} metalness={0.3} />
        </RoundedBox>
        <mesh position={[0, def.h * 0.32, 0]}>
          <cylinderGeometry args={[0.025, 0.03, def.h * 0.55, 10]} />
          <meshStandardMaterial {...matteProps("#3a3f4c")} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, def.h * 0.62, 0]}>
          <capsuleGeometry args={[0.09, def.h * 0.28, 6, 12]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.5} roughness={0.35} metalness={0.4} />
        </mesh>
      </group>
    );
  }
  if (kind === "cam") {
    return (
      <group position={[0, def.h * 0.4, 0]}>
        <RoundedBox args={[def.w * 0.55, def.h * 0.35, 0.16]} radius={0.05} position={[0, 0, 0]}>
          <meshStandardMaterial {...matteProps("#20242e")} roughness={0.45} metalness={0.2} />
        </RoundedBox>
        <mesh position={[0, 0, 0.09]}>
          <circleGeometry args={[def.w * 0.22, 20]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} toneMapped={false} />
        </mesh>
      </group>
    );
  }
  if (kind === "streamdeck") {
    return (
      <group>
        <RoundedBox args={[def.w * 0.75, 0.05, def.w * 0.6]} radius={0.02} position={[0, 0.025, 0]}>
          <meshStandardMaterial {...matteProps("#20242e")} roughness={0.5} metalness={0.2} />
        </RoundedBox>
        {[-1, 0, 1].flatMap(cx => [-1, 1].map(cz => (
          <mesh key={`${cx}-${cz}`} position={[cx * def.w * 0.2, 0.052, cz * def.w * 0.13]}>
            <boxGeometry args={[def.w * 0.14, 0.006, def.w * 0.14]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        )))}
      </group>
    );
  }
  if (kind === "capture") {
    return (
      <group>
        <RoundedBox args={[def.w * 0.7, 0.09, def.w * 0.45]} radius={0.03} position={[0, 0.045, 0]}>
          <meshStandardMaterial {...matteProps("#20242e")} roughness={0.45} metalness={0.25} />
        </RoundedBox>
        <mesh position={[0, 0.045, def.w * 0.23]}>
          <boxGeometry args={[def.w * 0.6, 0.02, 0.01]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.3} toneMapped={false} />
        </mesh>
      </group>
    );
  }
  // "console" — flache, breite Konsolen-Schale statt eines hohen Würfels.
  return (
    <group>
      <RoundedBox args={[def.w * 0.8, def.h * 0.28, def.w * 0.6]} radius={0.04} position={[0, def.h * 0.14, 0]}>
        <meshStandardMaterial {...matteProps("#20242e")} roughness={0.4} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0, def.h * 0.14, def.w * 0.31]}>
        <boxGeometry args={[def.w * 0.6, def.h * 0.05, 0.01]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Kaffeemaschine — Sockel + schmalere Kanne/Tank-Kammer obendrauf. */
function CoffeeMaker({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <group>
      <RoundedBox args={[def.w * 0.75, def.h * 0.4, def.w * 0.6]} radius={0.04} position={[0, def.h * 0.2, 0]}>
        <meshStandardMaterial {...matteProps("#2b2e3a")} roughness={0.4} metalness={0.2} />
      </RoundedBox>
      <RoundedBox args={[def.w * 0.5, def.h * 0.35, def.w * 0.4]} radius={0.03} position={[0, def.h * 0.58, 0]}>
        <meshStandardMaterial {...matteProps("#1a1d26")} roughness={0.2} metalness={0.1} transparent opacity={0.8} />
      </RoundedBox>
      <mesh position={[0, def.h * 0.42, def.w * 0.21]}>
        <circleGeometry args={[0.035, 16]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Getunter Rollator — Rahmen auf vier Rollen statt eines simplen Würfels. */
function TunedRollator({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const wheelY = 0.09;
  return (
    <group>
      <RoundedBox args={[def.w * 0.7, 0.06, def.h * 0.7]} radius={0.02} position={[0, def.h * 0.5, 0]}>
        <meshStandardMaterial {...matteProps("#3a3f4c")} roughness={0.4} metalness={0.5} />
      </RoundedBox>
      {[-1, 1].map(sx => [-1, 1].map(sz => (
        <mesh key={`${sx}-${sz}`} position={[sx * def.w * 0.32, wheelY, sz * def.h * 0.32]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[wheelY, wheelY, 0.05, 16]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} roughness={0.3} metalness={0.2} />
        </mesh>
      )))}
      {[-1, 1].map(sx => (
        <RoundedBox
          key={sx}
          args={[0.04, def.h * 0.5, 0.04]} radius={0.015}
          position={[sx * def.w * 0.32, def.h * 0.5 + def.h * 0.22, 0]}
        >
          <meshStandardMaterial {...matteProps("#3a3f4c")} roughness={0.4} metalness={0.5} />
        </RoundedBox>
      ))}
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
  if (def.tags.includes("powerstrip")) return <PowerStrip def={def} />;
  if (def.tags.includes("cam")) return <Gadget def={def} kind="cam" />;
  if (def.tags.includes("mic")) return <Gadget def={def} kind="mic" />;
  if (def.tags.includes("streamdeck")) return <Gadget def={def} kind="streamdeck" />;
  if (def.tags.includes("capture")) return <Gadget def={def} kind="capture" />;
  if (def.tags.includes("console") || def.tags.includes("console_retro")) return <Gadget def={def} kind="console" />;
  if (def.tags.includes("whiteboard")) return <WallPanel def={def} />;
  if (def.key === "poster_retro") return <WallPanel def={def} />;
  if (def.key === "teppich") return <Rug def={def} />;
  if (def.key === "kaffeemaschine") return <CoffeeMaker def={def} />;
  if (def.key === "rollator") return <TunedRollator def={def} />;
  return <GenericBox def={def} />;
}
