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

import { useEffect, useMemo, useRef } from "react";
import { RoundedBox, useGLTF, useTexture } from "@react-three/drei";
import { Mesh, MeshStandardMaterial, SpotLight, Vector3, type Material } from "three";
import { ACCENT_COLORS } from "@/lib/room-3d";
import type { RoomItemDef, RoomTag } from "@/lib/room-items";

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
  kommode:           "/models/kommode_offen.glb",
  konsolentisch:     "/models/tisch_lang.glb",
  schreibtisch_modern: "/models/desk_modern_white.glb",
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
      obj.castShadow = true;
      obj.receiveShadow = true;
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
  m.emissiveIntensity = 0.1;
  return m;
}

/**
 * Minimaler Eigenleuchtanteil auf jedem matten Material — verhindert reines
 * Schwarz in unbeleuchteten Winkeln, ist aber klein genug, dass die
 * tatsächliche Beleuchtung (RoomLighting: Richtungslicht + Ambient, siehe
 * RoomStage3D.tsx) die Haupthelligkeit trägt statt jedes Material sein
 * eigenes Pseudo-Glühen mitzubringen. Vorher 0.35 (deutlich sichtbares
 * Eigenglühen auf JEDER Fläche) — jetzt nur noch eine kleine Mindesthelligkeits-
 * Reserve; echtes Leuchten (Lampen, Screens, Neon) bleibt über
 * `toneMapped={false}` + hohe `emissiveIntensity` (>0.5) gesondert markiert.
 */
function matteProps(color: string, intensity = 0.1) {
  return { color, emissive: color, emissiveIntensity: intensity } as const;
}

function Desk({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const legH = 0.75;
  return (
    <group>
      <RoundedBox args={[def.w * 0.94, 0.16, def.h * 0.9]} radius={0.04} position={[0, legH, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...matteProps(accent)} roughness={0.35} metalness={0.1} />
      </RoundedBox>
      {[-1, 1].map(sx => [-1, 1].map(sz => (
        <RoundedBox
          key={`${sx}-${sz}`}
          args={[0.12, legH, 0.12]} radius={0.02}
          position={[sx * (def.w * 0.94 / 2 - 0.12), legH / 2, sz * (def.h * 0.9 / 2 - 0.12)]}
          castShadow
        >
          <meshStandardMaterial {...matteProps(METAL)} roughness={0.5} metalness={0.4} />
        </RoundedBox>
      )))}
    </group>
  );
}

function Monitor({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  // Bewusst FEST bemessen statt an def.w/def.h skaliert: die Grid-Zellen
  // (typ. 2×2) beschreiben die Stellfläche, die der Monitor auf dem
  // Schreibtisch reserviert — nicht die Größe des physischen Bildschirms.
  // Skalierung an der Zellgröße machte den Bildschirm bislang riesig
  // (bis zu 1.6 Einheiten breit statt eines realistischen ~46cm-Monitors).
  const bezelW = 0.46, bezelH = 0.30, neckH = 0.22;
  const screenY = 0.03 + neckH + bezelH / 2;
  return (
    <group position={[0, 0.85, 0]}>
      <RoundedBox args={[0.24, 0.03, 0.16]} radius={0.01} position={[0, 0.015, 0]}>
        <meshStandardMaterial {...matteProps(METAL)} roughness={0.5} metalness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.08, neckH, 0.08]} radius={0.02} position={[0, 0.03 + neckH / 2, 0]}>
        <meshStandardMaterial {...matteProps(METAL)} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[bezelW, bezelH, 0.06]} radius={0.02} position={[0, screenY, 0]} castShadow>
        <meshStandardMaterial {...matteProps("#252a38")} roughness={0.4} />
      </RoundedBox>
      {/* Dünner heller Rahmen ums Screen-Glow — gibt dem Bildschirm eine
          erkennbare Kante statt eines nahtlos ins Gehäuse übergehenden Flecks. */}
      <mesh position={[0, screenY, 0.033]}>
        <planeGeometry args={[bezelW * 0.9, bezelH * 0.87]} />
        <meshStandardMaterial {...matteProps("#0d0f16")} roughness={0.3} />
      </mesh>
      <mesh position={[0, screenY, 0.035]}>
        <planeGeometry args={[bezelW * 0.85, bezelH * 0.78]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Tower({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  // Bewusst FEST bemessen statt an def.h skaliert: def.h ist bei Boden-Items
  // wie diesem die Raster-TIEFE der Stellfläche (z.B. 2 Zellen bei
  // "pc_billig", damit davor noch Platz zum Stehen bleibt), keine physische
  // Höhe — skaliert machte den Tower bis zu 1.8m hoch (Schreibtischbeinhöhe
  // ist 0.75m). Selbes Muster wie bei Monitor()/Shelf() weiter oben.
  const towerH = 0.42;
  return (
    <group>
      <RoundedBox args={[def.w * 0.7, towerH, def.w * 0.6]} radius={0.04} position={[0, towerH / 2, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...matteProps("#2b2e3a")} roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* Lüfter-Glow vorne */}
      <mesh position={[0, towerH * 0.6, def.w * 0.31]}>
        <circleGeometry args={[0.1, 24]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
      {/* Dünner Akzentstreifen an der Vorderkante — bricht die sonst flache
          dunkle Gehäusefläche auf. */}
      <mesh position={[0, towerH - 0.03, def.w * 0.31]}>
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
      <RoundedBox args={[def.w * 0.85, 0.16, def.w * 0.85]} radius={0.05} position={[0, 0.55, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...matteProps(accent)} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[def.w * 0.8, def.h * 0.55, 0.14]} radius={0.05} position={[0, 1.0, -def.w * 0.35]} castShadow>
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
  // Bretter/Halterungen MÜSSEN vollständig auf der Rauminneren-Seite (Z>0
  // lokal) liegen — vorher um Z=0 zentriert bzw. sogar bei negativem Z, wodurch
  // die Hälfte im/hinter der (inzwischen dicken) Wand steckte und auf der
  // Außenseite sichtbar herausragte. Feste, moderate Tiefe statt an def.h
  // (das ist die Wandraster-HÖHE, keine physische Tiefe) skaliert.
  const boardDepth = 0.22;
  return (
    <group>
      {Array.from({ length: boards }).map((_, i) => {
        const y = (i + 1) * (def.h * 0.85 / boards);
        return (
          <group key={i}>
            <RoundedBox args={[def.w * 0.92, 0.06, boardDepth]} radius={0.02} position={[0, y, boardDepth / 2]} castShadow receiveShadow>
              <meshStandardMaterial {...matteProps(accent)} roughness={0.5} />
            </RoundedBox>
            {/* Winkel-Halterungen an beiden Enden — sonst wirken die Bretter
                wie freischwebende Platten statt an der Wand montiert. */}
            {[-1, 1].map(side => (
              <RoundedBox
                key={side}
                args={[0.05, 0.08, 0.12]} radius={0.01}
                position={[side * (def.w * 0.92 / 2 - 0.06), y - 0.05, 0.06]}
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
      <RoundedBox args={[def.w * 0.55, 0.4, def.w * 0.55]} radius={0.06} position={[0, 0.2, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...matteProps("#5a4632")} roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, def.h * 0.55, 0]} castShadow>
        <sphereGeometry args={[def.w * 0.4, 12, 10]} />
        <meshStandardMaterial {...matteProps("#3f8f5c")} roughness={0.6} />
      </mesh>
    </group>
  );
}

/** Flach an der Wand montiertes Panel (Poster, Whiteboard) — statt eines
 *  vollen Würfels ein gerahmtes, dünnes Rechteck mit sichtbarem Rahmen. */
/**
 * Flach an der Wand montiertes Panel (Poster, Whiteboard) — ein farbiger
 * Rahmen um das tatsächliche Motiv aus `def.imageUrl`. Zeigte bisher NUR den
 * Rahmen + eine dunkle Fläche dahinter, nie das Bild selbst (der eigentliche
 * Bug hinter "Poster ist nur ein rot umrandetes schwarzes Quadrat") — jetzt
 * als echte Textur, seitenverhältnistreu ins Passepartout eingepasst statt
 * verzerrt gestreckt.
 */
function WallPanel({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const texture = useTexture(def.imageUrl ?? "/room-items/poster_retro.png");
  const frameInnerW = def.w * 0.82;
  const frameInnerH = def.h * 0.82;
  const img = texture.image as { width?: number; height?: number } | undefined;
  const aspect = img?.width && img.height ? img.width / img.height : 1;
  const frameAspect = frameInnerW / frameInnerH;
  const [picW, picH] = aspect > frameAspect
    ? [frameInnerW, frameInnerW / aspect]
    : [frameInnerH * aspect, frameInnerH];
  return (
    <group position={[0, def.h / 2, 0]}>
      <RoundedBox args={[def.w * 0.92, def.h * 0.92, 0.05]} radius={0.02} position={[0, 0, 0.025]} castShadow receiveShadow>
        <meshStandardMaterial {...matteProps(accent)} roughness={0.5} />
      </RoundedBox>
      {/* Dunkler Passepartout-Rand hinter dem Motiv. */}
      <mesh position={[0, 0, 0.051]}>
        <planeGeometry args={[frameInnerW, frameInnerH]} />
        <meshStandardMaterial {...matteProps("#1c1f29")} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, 0.053]}>
        <planeGeometry args={[picW, picH]} />
        <meshStandardMaterial map={texture} roughness={0.55} />
      </mesh>
    </group>
  );
}

/** Flacher Teppich — statt eines hochkant stehenden Würfels eine dünne,
 *  breite Matte knapp über dem Boden. */
function Rug({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <RoundedBox args={[def.w * 0.94, 0.03, def.h * 0.94]} radius={0.015} position={[0, 0.015, 0]} receiveShadow>
      <meshStandardMaterial {...matteProps(accent)} roughness={0.85} />
    </RoundedBox>
  );
}

/** Runder Standard-Teppich mit OMA-Logo — Serienausstattung, liegt zentral im
 *  Zimmer. Zwei flache Kreis-Scheiben statt einer: die untere trägt die
 *  Akzentfarbe als Rand, die obere (kleiner, leicht angehoben) das Logo als
 *  transparentes PNG, damit der Rand als Teppichkante sichtbar bleibt. */
function LogoRug({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const logo = useTexture("/brand/logo-512.png");
  const radius = Math.min(def.w, def.h) * 0.47;
  // Echte (wenn auch flache) Zylinder statt papierdünner circleGeometry-
  // Scheiben: die lagen praktisch koplanar auf der Bodenfläche (y≈0.015 bei
  // einer Bodenoberkante bei y=0) — seit der Boden zusätzlich eine Textur
  // trägt (siehe RoomShell in RoomStage3D.tsx) ein plausibler Z-Fighting-
  // Kandidat. Zylinder mit echter Höhe geben dem Teppich echten Abstand zum
  // Boden, exakt das robuste Muster, das die rechteckige Rug()-Variante
  // (RoundedBox statt Plane) schon die ganze Zeit nutzt.
  return (
    <group>
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[radius, radius, 0.03, 48]} />
        <meshStandardMaterial {...matteProps(accent)} roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.033, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[radius * 0.6, 48]} />
        <meshStandardMaterial map={logo} transparent roughness={0.75} />
      </mesh>
    </group>
  );
}

/** Steckdosenleiste — länglicher Riegel mit kleinen Dosen-Noppen statt eines
 *  neutralen Würfels. */
function PowerStrip({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const sockets = Math.max(2, def.w);
  return (
    <group>
      <RoundedBox args={[def.w * 0.9, 0.12, def.h * 0.5]} radius={0.03} position={[0, 0.06, 0]} castShadow receiveShadow>
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
        <RoundedBox args={[def.w * 0.4, 0.04, def.w * 0.4]} radius={0.02} position={[0, 0.02, 0]} receiveShadow>
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
        <RoundedBox args={[def.w * 0.55, def.h * 0.35, 0.16]} radius={0.05} position={[0, 0, 0]} castShadow>
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
        <RoundedBox args={[def.w * 0.75, 0.05, def.w * 0.6]} radius={0.02} position={[0, 0.025, 0]} receiveShadow>
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
        <RoundedBox args={[def.w * 0.7, 0.09, def.w * 0.45]} radius={0.03} position={[0, 0.045, 0]} castShadow receiveShadow>
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
      <RoundedBox args={[def.w * 0.8, def.h * 0.28, def.w * 0.6]} radius={0.04} position={[0, def.h * 0.14, 0]} castShadow receiveShadow>
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
      <RoundedBox args={[def.w * 0.75, def.h * 0.4, def.w * 0.6]} radius={0.04} position={[0, def.h * 0.2, 0]} castShadow receiveShadow>
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
      <RoundedBox args={[def.w * 0.7, 0.06, def.h * 0.7]} radius={0.02} position={[0, def.h * 0.5, 0]} castShadow receiveShadow>
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
      <RoundedBox args={[def.w * 0.85, bodyH, def.w * 0.85]} radius={0.05} position={[0, def.h * 0.42, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...matteProps("#2b2e3a")} roughness={0.5} metalness={0.15} />
      </RoundedBox>
      {/* Akzentfarbener Deckel-Streifen — sonst sind sehr unterschiedliche
          Peripherie-Items (Mikro, Headset, Kaffeemaschine, …) alle nur ein
          neutraler Würfel und kaum voneinander zu unterscheiden. */}
      <RoundedBox
        args={[def.w * 0.85, bodyH * 0.22, def.w * 0.85]} radius={0.05}
        position={[0, def.h * 0.42 + bodyH * 0.39, 0]}
        castShadow
      >
        <meshStandardMaterial {...matteProps(accent)} roughness={0.4} metalness={0.15} />
      </RoundedBox>
    </group>
  );
}

/**
 * Kleiner Deko-Pokal fürs Regal (mustStandOn:"shelf") — Höhe folgt derselben
 * Formel wie das oberste Brett in Shelf() (def.h * 0.85), damit er optisch
 * auf dem Regal steht statt mittig zu schweben oder im untersten Brett zu
 * versinken.
 */
function ShelfTrophy({ def }: ShapeProps) {
  const y = def.h * 0.85;
  const gold = "#e9c874";
  return (
    <group position={[0, y, 0.1]}>
      <mesh position={[0, 0.075, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.018, 0.06, 10]} />
        <meshStandardMaterial {...matteProps(gold, 0.3)} roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.03, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 0.04, 8]} />
        <meshStandardMaterial {...matteProps(gold, 0.3)} roughness={0.25} metalness={0.7} />
      </mesh>
      <mesh position={[0, 0.005, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.035, 0.035, 0.015, 12]} />
        <meshStandardMaterial {...matteProps(gold, 0.3)} roughness={0.25} metalness={0.7} />
      </mesh>
    </group>
  );
}

function pickShape(def: RoomItemDef) {
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
  if (def.key === "sommer_poster") return <WallPanel def={def} />;
  if (def.key === "deko_pokal") return <ShelfTrophy def={def} />;
  if (def.key === "teppich") return <Rug def={def} />;
  if (def.key === "teppich_rund_logo") return <LogoRug def={def} />;
  if (def.key === "kaffeemaschine") return <CoffeeMaker def={def} />;
  if (def.key === "rollator") return <TunedRollator def={def} />;
  return <GenericBox def={def} />;
}

/**
 * Tags, deren Möbelstücke im echten Leben selbst Licht abgeben — bekommen
 * zusätzlich zu ihrem (bereits emissiven) Material eine ECHTE `pointLight`,
 * die auch benachbarte Objekte/den Boden anstrahlt, statt nur selbst hell zu
 * wirken. Bewusst OHNE `castShadow` (Performance: bei vielen gleichzeitig
 * platzierten Lampen/Monitoren/Neon-Elementen wäre ein Schatten-Cubemap pro
 * Licht zu teuer) — nur die eine Deckenlampe (siehe CeilingLamp3D) wirft
 * echte Schatten, als "Hauptlichtquelle" des Raums.
 */
const GLOWING_TAGS: RoomTag[] = ["light", "neon", "ringlight", "monitor", "crt", "monitor_144"];

/**
 * Echte Lampen (Steh-/Schreibtischlampe) werfen ihr Licht real gerichtet nach
 * unten ab, nicht gleichmäßig in alle Richtungen — ein `spotLight` statt
 * `pointLight` an dieser Stelle ist kein kosmetischer Unterschied, sondern
 * bildet ab, wie ein Lampenschirm tatsächlich funktioniert (Kegel nach unten,
 * kein Licht nach oben durch den Schirm).
 */
const SPOTLIGHT_KEYS = new Set(["stehlampe", "schreibtischlampe"]);

/**
 * `SpotLight.target` ist ein eigenständiges Object3D, das NICHT automatisch
 * im selben Gruppen-Zweig hängt wie das Licht — ein simples
 * `target-position={[0,0,0]}` würde also einen festen WELT-Punkt anpeilen
 * (die Raumecke), nicht "senkrecht unter der Lampe", egal wo sie im Zimmer
 * steht. Hier stattdessen die tatsächliche Weltposition des Lichts auslesen
 * (`getWorldPosition`, berücksichtigt die umschließende Platzierungs-Gruppe
 * korrekt) und das Ziel direkt darunter auf Bodenhöhe setzen.
 */
function LampSpotLight({ color, lightY }: { color: string; lightY: number }) {
  const ref = useRef<SpotLight>(null);
  useEffect(() => {
    const light = ref.current;
    if (!light) return;
    const worldPos = light.getWorldPosition(new Vector3());
    light.target.position.set(worldPos.x, 0, worldPos.z);
    light.target.updateMatrixWorld();
  }, []);
  return (
    <spotLight
      ref={ref} position={[0, lightY, 0]}
      color={color} intensity={1.4} distance={3.5} decay={2}
      angle={Math.PI / 3.2} penumbra={0.6}
    />
  );
}

/**
 * Monitore, LED-Streifen und Neon-Panels sind physisch FLACHE leuchtende
 * Flächen, keine Punktquellen — eine `rectAreaLight` (rechteckige Fläche,
 * strahlt gerichtet in eine Richtung statt kugelförmig wie `pointLight`)
 * bildet das treffender ab. Ringlicht bleibt bewusst bei `pointLight`: es ist
 * als Ring geformt, keine flache Scheibe, und wirkt in der Praxis eher
 * rundum-streuend.
 *
 * `rotation={[0, Math.PI, 0]}` ist kein Zufallswert: eine RectAreaLight
 * strahlt entlang ihrer lokalen −Z-Achse, aber unsere Screen-/Panel-Flächen
 * sind alle mit der Normalen nach +Z gebaut (dieselbe Konvention wie
 * `surfaceRotationY`/wall_back) — ohne die 180°-Drehung würde das Licht
 * rückwärts in die Wand/das Gehäuse scheinen statt sichtbar in den Raum.
 */
function isFlatPanelTag(def: RoomItemDef): boolean {
  if (def.tags.includes("ringlight")) return false;
  return def.tags.includes("light") || def.tags.includes("neon")
    || def.tags.includes("monitor") || def.tags.includes("crt") || def.tags.includes("monitor_144");
}

/** Ordnet ein Katalog-Item einem der obigen Shape-Rezepte zu und rendert es direkt. */
export function FurniturePrimitive({ def }: ShapeProps) {
  const shape = pickShape(def);
  const glows = def.tags.some(t => GLOWING_TAGS.includes(t));
  if (!glows) return shape;

  const accent = ACCENT_COLORS[def.accent];
  const isMonitor = def.tags.includes("monitor") || def.tags.includes("crt");
  const lightY = isMonitor ? 0.85 + 0.3 * def.h : def.h * 0.55;

  if (SPOTLIGHT_KEYS.has(def.key)) {
    return (
      <>
        {shape}
        <LampSpotLight color={accent} lightY={lightY} />
      </>
    );
  }

  if (isFlatPanelTag(def)) {
    const panelW = isMonitor ? 0.42 : def.w * 0.9;
    const panelH = isMonitor ? 0.26 : def.h * 0.45;
    return (
      <>
        {shape}
        <rectAreaLight
          position={[0, lightY, isMonitor ? 0.05 : 0.03]} rotation={[0, Math.PI, 0]}
          color={accent} intensity={isMonitor ? 2.2 : 3.5} width={panelW} height={panelH}
        />
      </>
    );
  }

  return (
    <>
      {shape}
      <pointLight
        position={[0, lightY, isMonitor ? 0.15 : 0]}
        color={accent} intensity={isMonitor ? 0.35 : 0.55} distance={isMonitor ? 1.8 : 3} decay={2}
      />
    </>
  );
}
