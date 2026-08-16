"use client";

/**
 * Fenster + Deckenlampe: werten sich mit `roomLevel()` (room-layout.ts) auf,
 * genau wie im alten SVG-`RoomStage.tsx` (RoomWindow/CeilingLamp) — Rahmen
 * und Ausblick werden mit steigender Investition edler, die Lampe wandelt
 * sich von nackter Glühbirne zu kleinem Kronleuchter. In 3D bewusst als
 * einfache Primitive statt der alten Pixel-Art-Himmelsszenen (Skyline/Strand)
 * nachgebaut — der Fortschritts-Anreiz bleibt sichtbar, ohne eine eigene
 * Textur-Pipeline für jede Stufe zu brauchen.
 */

import { useMemo } from "react";
import { RoundedBox, useTexture } from "@react-three/drei";
import { DoubleSide } from "three";
import { gridToWorld, surfaceRotationY, ROOM_SIZE, shadeHex } from "@/lib/room-3d";

export const ROOM_LEVEL_LABEL = ["Abgewohnt", "Frisch renoviert", "Modern eingerichtet", "Luxuriös ausgestattet"];

/**
 * Fenster-Geometrie in Wand-Rasterzellen (wall_back). Die ursprünglichen
 * Maße (übernommen aus der alten SVG-Bühne) waren für den flachen 2D-Look
 * gedacht — in echten 3D-Metern (1 Rasterzelle ≈ 1m) ergab das ein
 * 2.6m×2.9m-Fenster, das die Rückwand dominierte. Auf realistische
 * Fenster-/Brüstungshöhe reduziert.
 */
// Horizontal zentriert im jetzt 8 Zellen breiten Raum ((8-1.6)/2 = 3.2).
const WINDOW_GEOM = { x0: 3.2, y0: 1.0, w: 1.6, h: 1.7 } as const;

const WINDOW_FRAME = [
  { base: "#6b4a30", trim: "#8a6440" },              // 0: Abgewohnt — Holz
  { base: "#d8d4c8", trim: "#efeee6" },              // 1: Renoviert — weiß gestrichen
  { base: "#6b7280", trim: "#9aa3b0" },              // 2: Modern — Alu
  { base: "#6b7280", trim: "#e9c874" },              // 3: Luxus — Alu + Gold
] as const;

/** Himmelfarbe fürs winzige Türfenster (Stufe 2+, siehe EntranceDoor3D) —
 *  dort lohnt sich keine eigene Textur, ein Farbton reicht. Für die
 *  eigentliche Fensteraussicht siehe VIEW_IMAGE (echtes Bild statt Form). */
const SKY_COLOR = ["#241f38", "#2c3a52", "#4a7fb0", "#e8794f"];

/**
 * Echtes Ausblick-Bild statt prozedural gezeichneter Sterne/Skyline/Sonne —
 * eine gemalte Stadtsilhouette je Stufe (Dämmerung → Abend → Mittag →
 * Sonnenuntergang). Dieselbe Stufe bestimmt auch WINDOW_LIGHT weiter unten:
 * welcher Himmel gerade zu sehen ist, bestimmt direkt Farbe/Stärke des
 * Lichts, das durchs Fenster in den Raum fällt.
 */
const VIEW_IMAGE = [
  "/room-window/level0_daemmerung.png",
  "/room-window/level1_abend.png",
  "/room-window/level2_mittag.png",
  "/room-window/level3_sonnenuntergang.png",
] as const;

function WindowGlass({ level }: { level: number }) {
  const view = useTexture(VIEW_IMAGE[level] ?? VIEW_IMAGE[0]);
  return (
    <group>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[WINDOW_GEOM.w * 0.86, WINDOW_GEOM.h * 0.86]} />
        <meshBasicMaterial map={view} toneMapped={false} />
      </mesh>

      {/* Sprossen */}
      <mesh position={[0, 0, 0.075]}>
        <boxGeometry args={[0.035, WINDOW_GEOM.h * 0.86, 0.01]} />
        <meshStandardMaterial color="#2a2438" />
      </mesh>
      <mesh position={[0, 0, 0.075]}>
        <boxGeometry args={[WINDOW_GEOM.w * 0.86, 0.035, 0.01]} />
        <meshStandardMaterial color="#2a2438" />
      </mesh>
    </group>
  );
}

/**
 * Lichtfarbe/-stärke, die durchs Fenster in den Raum fällt — an dieselben
 * Stufen gekoppelt wie SKY_COLOR (Dämmerung → Mittag → Sonnenuntergang),
 * damit der Ausblick nicht nur eine gemalte Kulisse ist, sondern tatsächlich
 * den Raum mitbeleuchtet. Kühles, kräftiges Tageslicht bei Stufe 2, warmes
 * Abendlicht bei Stufe 3, gedämpftes Dämmerlicht bei 0/1.
 */
const WINDOW_LIGHT = [
  { color: "#4a3f6b", intensity: 0.35 }, // 0: Dämmerung
  { color: "#5a6a8a", intensity: 0.55 }, // 1: Abend
  { color: "#bcd8f5", intensity: 1.8 },  // 2: Mittag
  { color: "#ffb98a", intensity: 1.3 },  // 3: Sonnenuntergang
] as const;

/**
 * Rolladen — mehrere horizontale Lamellen, die sich per `closed` (0=offen,
 * 1=ganz zu) von oben herunterfahren. Verdeckt Glas UND Himmelskulisse, wenn
 * unten, damit er sich wie ein echter Rolladen anfühlt statt nur eine
 * halbtransparente Fläche zu sein.
 */
function RollerShutter({ closed }: { closed: number }) {
  if (closed <= 0.001) return null;
  const slatCount = 12;
  const slatH = WINDOW_GEOM.h / slatCount;
  const travel = WINDOW_GEOM.h * closed;
  const topY = WINDOW_GEOM.h / 2 - travel;
  return (
    <group>
      {Array.from({ length: slatCount }).map((_, i) => {
        const y = topY - i * slatH - slatH / 2;
        if (y < -WINDOW_GEOM.h / 2 - slatH / 2) return null;
        return (
          <RoundedBox
            key={i}
            args={[WINDOW_GEOM.w * 0.98, slatH * 0.92, 0.03]} radius={0.005}
            position={[0, y, 0.07]}
          >
            <meshStandardMaterial
              color={i % 2 === 0 ? "#9aa3b0" : "#7f8794"} roughness={0.5} metalness={0.4}
            />
          </RoundedBox>
        );
      })}
      {/* Rolladenkasten oben, aus dem die Lamellen "herausfahren". */}
      <RoundedBox args={[WINDOW_GEOM.w * 1.02, 0.1, 0.1]} radius={0.01} position={[0, WINDOW_GEOM.h / 2 + 0.05, 0.06]}>
        <meshStandardMaterial color="#6b7280" roughness={0.5} metalness={0.3} />
      </RoundedBox>
    </group>
  );
}

/**
 * Das eigentliche Licht des Fensters — bewusst von der sichtbaren Geometrie
 * (RoomWindow3D) getrennt: die Kamera blendet je nach Drehwinkel immer zwei
 * der vier Wände aus (siehe hiddenWalls in RoomStage3D.tsx), damit man beim
 * Rundherumdrehen nie gegen eine nahe Wand schaut. Hinge das Licht am
 * gerenderten Fenster-Mesh, würde der Raum bei jeder Drehung, die die
 * Rückwand ausblendet, ein Stück dunkler — falsch, das Licht kommt ja
 * weiterhin von draußen, man sieht nur gerade die Wand nicht. Wird deshalb
 * IMMER gerendert (siehe RoomCanvas), unabhängig von hiddenWalls — nur der
 * Rolladen (`closed`) schaltet es tatsächlich aus.
 */
export function WindowLight({ level, closed }: { level: number; closed: boolean }) {
  const light = WINDOW_LIGHT[level] ?? WINDOW_LIGHT[0];
  const world = useMemo(
    () => gridToWorld("wall_back", WINDOW_GEOM.x0, WINDOW_GEOM.y0, WINDOW_GEOM.w, WINDOW_GEOM.h),
    [],
  );
  if (closed) return null;
  return (
    <pointLight
      position={[world.x, world.y + 0.2, world.z + 1.4]}
      color={light.color} intensity={light.intensity} distance={10} decay={1.8}
    />
  );
}

/**
 * Fenster auf der Rückwand — Position/Größe aus WINDOW_GEOM, Rahmenfarbe und
 * Ausblick werten sich mit `level` (0..3) automatisch auf. Das tatsächliche
 * Licht kommt von `WindowLight` (immer gerendert, siehe dort) — hier nur die
 * sichtbare Geometrie plus ein fester, von der Zimmerstufe UNABHÄNGIGER
 * Glührand ums Glas: macht auch bei Stufe 0/1 (dunkle Dämmerfarben, kaum
 * Bloom-Schwelle erreicht) sofort erkennbar, dass HIER die Lichtquelle sitzt
 * — nicht nur ein gemaltes Bild.
 */
export function RoomWindow3D({ level, closed }: { level: number; closed: boolean }) {
  const frame = WINDOW_FRAME[level] ?? WINDOW_FRAME[0];
  const world = useMemo(
    () => gridToWorld("wall_back", WINDOW_GEOM.x0, WINDOW_GEOM.y0, WINDOW_GEOM.w, WINDOW_GEOM.h),
    [],
  );

  return (
    <group position={world}>
      <RoundedBox args={[WINDOW_GEOM.w, WINDOW_GEOM.h, 0.08]} radius={0.03} position={[0, 0, 0.02]}>
        <meshStandardMaterial color={frame.base} emissive={frame.base} emissiveIntensity={0.4} roughness={0.5} metalness={0.2} />
      </RoundedBox>
      <WindowGlass level={level} />
      {/* Fester Glührand — unabhängig von SKY_COLOR/level, damit "hier kommt
          Licht her" auch bei den dunklen Dämmerungs-/Abendtönen sofort
          ablesbar bleibt. Vier schmale Streifen entlang der Scheibenkante
          statt eines Rings, damit die Form zum rechteckigen Fenster passt. */}
      {!closed && (
        <group position={[0, 0, 0.066]}>
          {[
            [0, WINDOW_GEOM.h * 0.86 / 2, WINDOW_GEOM.w * 0.9, 0.025],
            [0, -WINDOW_GEOM.h * 0.86 / 2, WINDOW_GEOM.w * 0.9, 0.025],
          ].map(([x, y, w, h], i) => (
            <mesh key={`h${i}`} position={[x, y, 0]}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial color="#fff3d0" transparent opacity={0.5} toneMapped={false} />
            </mesh>
          ))}
          {[
            [WINDOW_GEOM.w * 0.86 / 2, 0, 0.025, WINDOW_GEOM.h * 0.86],
            [-WINDOW_GEOM.w * 0.86 / 2, 0, 0.025, WINDOW_GEOM.h * 0.86],
          ].map(([x, y, w, h], i) => (
            <mesh key={`v${i}`} position={[x, y, 0]}>
              <planeGeometry args={[w, h]} />
              <meshBasicMaterial color="#fff3d0" transparent opacity={0.5} toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}
      <RollerShutter closed={closed ? 1 : 0} />
      {/* Fensterbank */}
      <RoundedBox
        args={[WINDOW_GEOM.w * 1.15, 0.08, 0.22]} radius={0.02}
        position={[0, -WINDOW_GEOM.h / 2 - 0.06, 0.14]}
      >
        <meshStandardMaterial color={frame.trim} emissive={frame.trim} emissiveIntensity={0.35} roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* Vorhänge — zwei Pfosten links/rechts, gedeckter Stoffton. */}
      {[-1, 1].map(side => (
        <RoundedBox
          key={side}
          args={[0.18, WINDOW_GEOM.h * 1.08, 0.12]} radius={0.06}
          position={[side * (WINDOW_GEOM.w / 2 + 0.16), 0, 0.04]}
        >
          <meshStandardMaterial color="#5a3f52" emissive="#5a3f52" emissiveIntensity={0.35} roughness={0.7} />
        </RoundedBox>
      ))}
    </group>
  );
}

// Nah der Raummitte (Raum ist 8×8, Mittelpunkt bei x=4,z=4) — in die offene
// Lücke zwischen Teppich (y0-2) und Schreibtisch (y4-6) gerückt, damit sie
// mit keinem der beiden kollidiert, aber trotzdem zentral wirkt.
const LAMP_ANCHOR = { x: 4, y: 6.6, z: 3.3 } as const;

/** Alle vier Leuchtenköpfe nehmen `on` entgegen: die tatsächlich leuchtenden
 *  Teile (toneMapped=false, sonst hohe emissiveIntensity) dimmen auf einen
 *  "aus"-Wert herunter — Fassung/Schirm selbst bleiben unverändert sichtbar,
 *  nur die Glühbirne/das Leuchtmittel geht aus. */
/** Deckenbaldachin — die runde Abdeckplatte, aus der die Zuleitung kommt.
 *  Gemeinsam für alle vier Stufen (echte Lampen haben immer eine), macht die
 *  Aufhängung an der Decke plausibel statt eines nackt endenden Kabels. */
function Canopy() {
  return (
    <mesh position={[0, 0.02, 0]}>
      <cylinderGeometry args={[0.09, 0.1, 0.03, 16]} />
      <meshStandardMaterial color="#2a2438" roughness={0.6} metalness={0.2} />
    </mesh>
  );
}

function BareBulb({ on }: { on: boolean }) {
  return (
    <>
      {/* Fassung mit Gewindestruktur (mehrere schmale Ringe statt eines
          einzelnen glatten Zylinders) statt eines reinen Blocks. */}
      {[0, 0.02, 0.04, 0.06].map(y => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[0.062 - y * 0.05, 0.062 - y * 0.05, 0.018, 12]} />
          <meshStandardMaterial color="#3a3f4c" roughness={0.4} metalness={0.5} />
        </mesh>
      ))}
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#ffd98a" emissive="#ffcf6b" emissiveIntensity={on ? 2.2 : 0.1} toneMapped={false} />
      </mesh>
      {/* Kleiner Glassockel zwischen Fassung und Birne. */}
      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 0.04, 10]} />
        <meshStandardMaterial color="#ffd98a" emissive="#ffcf6b" emissiveIntensity={on ? 1.2 : 0.06} toneMapped={false} transparent opacity={0.85} />
      </mesh>
    </>
  );
}

function DrumShade({ on }: { on: boolean }) {
  return (
    <>
      {/* Aufhängestreben vom Baldachin zum Schirmrand — bisher schwebte der
          Schirm scheinbar frei am Kabel. */}
      {[0, 1, 2].map(i => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.14, 0.09, Math.sin(a) * 0.14]} rotation={[0, -a, Math.PI / 10]}>
            <cylinderGeometry args={[0.006, 0.006, 0.14, 6]} />
            <meshStandardMaterial color="#3a3f4c" roughness={0.5} metalness={0.4} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.16, 0]}>
        <torusGeometry args={[0.22, 0.012, 8, 20]} />
        <meshStandardMaterial color="#6b5348" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.32, 20, 1, true]} />
        <meshStandardMaterial color="#8a6a5c" emissive="#8a6a5c" emissiveIntensity={0.4} roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.16, 0]}>
        <torusGeometry args={[0.28, 0.012, 8, 20]} />
        <meshStandardMaterial color="#6b5348" roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <circleGeometry args={[0.24, 20]} />
        <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={on ? 1.4 : 0.08} toneMapped={false} />
      </mesh>
    </>
  );
}

function DiscLamp({ on }: { on: boolean }) {
  return (
    <>
      {/* Kurzer Montagestab statt direkt am Kabel klebender Scheibe. */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.1, 8]} />
        <meshStandardMaterial color="#3a3f4c" roughness={0.4} metalness={0.6} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 28]} />
        <meshStandardMaterial color="#4a4f5e" emissive="#4a4f5e" emissiveIntensity={0.4} roughness={0.35} metalness={0.4} />
      </mesh>
      {/* Umlaufende Metallkante — betont die Scheibenform, wirkt weniger wie
          ein flacher Zylinderklotz. */}
      <mesh position={[0, -0.001, 0]}>
        <torusGeometry args={[0.38, 0.012, 8, 32, Math.PI * 2]} rotation-x={Math.PI / 2} />
        <meshStandardMaterial color="#6b7280" roughness={0.3} metalness={0.6} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <circleGeometry args={[0.32, 28]} />
        <meshStandardMaterial color="#a8d8ff" emissive="#a8d8ff" emissiveIntensity={on ? 1.6 : 0.08} toneMapped={false} />
      </mesh>
    </>
  );
}

function Chandelier({ on }: { on: boolean }) {
  const arms = 4;
  return (
    <group>
      {/* Zentraler Schaft vom Baldachin zum Ring statt eines direkt
          hängenden Rings. */}
      <mesh position={[0, 0.14, 0]}>
        <cylinderGeometry args={[0.02, 0.03, 0.24, 10]} />
        <meshStandardMaterial color="#e9c874" emissive="#e9c874" emissiveIntensity={0.3} roughness={0.3} metalness={0.7} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.28, 0.03, 8, 24]} />
        <meshStandardMaterial color="#e9c874" emissive="#e9c874" emissiveIntensity={0.6} roughness={0.3} metalness={0.6} />
      </mesh>
      {Array.from({ length: arms }).map((_, i) => {
        const angle = (i / arms) * Math.PI * 2;
        const x = Math.cos(angle) * 0.28, z = Math.sin(angle) * 0.28;
        return (
          <group key={i}>
            {/* Verbindungsarm vom Ring zur Glühbirne — vorher schwebten die
                Kugeln scheinbar lose um den Ring. */}
            <mesh position={[x * 0.5, -0.04, z * 0.5]} rotation={[Math.atan2(x, 0.08) * -0.5, -angle, Math.PI / 2.3]}>
              <cylinderGeometry args={[0.008, 0.008, Math.hypot(x, z) * 0.9, 6]} />
              <meshStandardMaterial color="#e9c874" roughness={0.3} metalness={0.7} />
            </mesh>
            <mesh position={[x, -0.08, z]}>
              <sphereGeometry args={[0.07, 12, 10]} />
              <meshStandardMaterial color="#ffe29a" emissive="#ffcf6b" emissiveIntensity={on ? 2 : 0.1} toneMapped={false} />
            </mesh>
            {/* Kleiner Kristall-Tropfen unter jedem Arm. */}
            <mesh position={[x, -0.17, z]} rotation={[Math.PI, 0, 0]}>
              <coneGeometry args={[0.025, 0.06, 6]} />
              <meshStandardMaterial color="#dff0ff" roughness={0.1} metalness={0.1} transparent opacity={0.75} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.1, 14, 10]} />
        <meshStandardMaterial color="#ffe29a" emissive="#ffcf6b" emissiveIntensity={on ? 1.6 : 0.08} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Lichtstärke/-farbe/-reichweite der Deckenlampe je Stufe — vorher fix
 * (immer dieselbe Helligkeit unabhängig von der Leuchten-Form), jetzt an
 * dieselbe Stufe gekoppelt wie die Kopf-Form: nackte Glühbirne leuchtet
 * spürbar schwächer als der Kronleuchter.
 *
 * `distance` ist bewusst Teil der Progression, nicht nur `intensity`: der
 * Raum misst als Bodendiagonale ~13,9m (12×7, siehe ROOM_SIZE). Bei Stufe
 * 0/1 bleibt `distance` klar darunter — die Lampe erhellt nur einen Pool um
 * sich herum, die Ecken bleiben dunkel. Erst ab Stufe 2 überschreitet
 * `distance` die Diagonale und flutet den ganzen Raum.
 */
const CEILING_LAMP_LIGHT = [
  { color: "#ffe9b8", intensity: 1.0, distance: 6 },  // 0: nackte Glühbirne — kleiner Lichtkreis
  { color: "#ffdba0", intensity: 1.6, distance: 8 },  // 1: Stoffschirm — heller, aber Ecken bleiben dunkel
  { color: "#eaf2ff", intensity: 3.0, distance: 15 }, // 2: modernes Deckenlicht — flutet den ganzen Raum
  { color: "#ffe9b8", intensity: 3.8, distance: 16 }, // 3: Kronleuchter — voll ausgeleuchtet
] as const;

/**
 * Deckenlampe — hängt von der Decke, Position bewusst etwas seitlich der
 * Raummitte (nicht mittig über dem Schreibtisch), damit sie mit typischen
 * Möbel-Platzierungen nicht kollidiert. Kopf-Form UND Lichtstärke wechseln
 * mit `level`. `on` ist ein reiner UI-Schalter (siehe RoomStage3D.tsx) — kein
 * Katalog-/Datenbankzustand, damit User die Beleuchtung frei durchprobieren
 * können, ohne den Raum tatsächlich zu verändern.
 */
export function CeilingLamp3D({ level, on }: { level: number; on: boolean }) {
  const cordLen = 0.7;
  const baseY = ROOM_SIZE.height - 0.06;
  const light = CEILING_LAMP_LIGHT[level] ?? CEILING_LAMP_LIGHT[0];
  return (
    <group position={[LAMP_ANCHOR.x, baseY, LAMP_ANCHOR.z]}>
      <Canopy />
      <mesh position={[0, -cordLen / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, cordLen, 8]} />
        <meshStandardMaterial color="#2a2438" />
      </mesh>
      <group position={[0, -cordLen, 0]}>
        {level >= 3 ? <Chandelier on={on} />
          : level === 2 ? <DiscLamp on={on} />
          : level === 1 ? <DrumShade on={on} />
          : <BareBulb on={on} />}
        {/* Einzige schattenwerfende Punktlichtquelle im Raum — die
            "Hauptbeleuchtung" von der Decke aus. Echte Punktlichter für
            Stehlampen/Neon/Monitore (siehe FurniturePrimitive.tsx) werfen
            aus Performance-Gründen keine Schatten. */}
        {on && (
          <pointLight
            position={[0, -0.05, 0]} color={light.color} intensity={light.intensity} distance={light.distance} decay={2}
            castShadow shadow-mapSize-width={512} shadow-mapSize-height={512}
            shadow-bias={-0.003}
          />
        )}
        {/* Fester Glühpool unter der Lampe — unabhängig von der stufen-
            abhängigen `light.intensity` (die steuert nur, wie weit das Licht
            den RAUM erhellt). Ohne das ist bei Stufe 0/1 (kleiner `distance`,
            siehe CEILING_LAMP_LIGHT) kaum zu erkennen, dass die Lampe
            überhaupt brennt — der sichtbare Pool macht die Quelle selbst
            immer klar erkennbar, auch wenn sie den Raum kaum ausleuchtet. */}
        {on && (
          <mesh position={[0, -0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.5, 24]} />
            <meshBasicMaterial color="#ffe9b8" transparent opacity={0.3} toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  );
}

/**
 * Eingangstür-Geometrie auf der Seitenwand (wall_side), nahe der Raumfront —
 * dasselbe Prinzip wie WINDOW_GEOM: feste Position in Wand-Rasterzellen,
 * kein Katalog-Platzierung. Standard-Türmaße (~1m breit, ~2.1m hoch).
 */
// wall_side ist jetzt genauso breit wie die Bodentiefe (8 Zellen, siehe
// ISO_GRID) — grob zentriert statt am alten, schmaleren 7er-Raster.
const DOOR_GEOM = { x0: 3.5, y0: 0, w: 1.0, h: 2.1 } as const;

/**
 * Eingangstür — wertet sich mit `level` wie Fenster/Lampe auf: Holztür →
 * weiß lackiert → Alu mit Fensterausschnitt → Alu/Gold mit Fensterausschnitt.
 * Nutzt dieselbe WINDOW_FRAME-Farbpalette für einen konsistenten Material-Look
 * über alle Stufen-Fixtures hinweg.
 */
export function EntranceDoor3D({ level }: { level: number }) {
  const frame = WINDOW_FRAME[level] ?? WINDOW_FRAME[0];
  const world = useMemo(
    () => gridToWorld("wall_side", DOOR_GEOM.x0, DOOR_GEOM.y0, DOOR_GEOM.w, DOOR_GEOM.h),
    [],
  );
  const rotY = surfaceRotationY("wall_side");
  const handleColor = level >= 3 ? "#e9c874" : "#9aa3b0";

  return (
    <group position={world} rotation={[0, rotY, 0]}>
      {/* Rahmen */}
      <RoundedBox args={[DOOR_GEOM.w + 0.12, DOOR_GEOM.h + 0.06, 0.1]} radius={0.02} position={[0, 0, 0.03]}>
        <meshStandardMaterial color={frame.base} emissive={frame.base} emissiveIntensity={0.4} roughness={0.5} metalness={0.2} />
      </RoundedBox>
      {/* Türblatt */}
      <RoundedBox args={[DOOR_GEOM.w * 0.92, DOOR_GEOM.h * 0.94, 0.06]} radius={0.015} position={[0, 0, 0.07]}>
        <meshStandardMaterial color={frame.trim} emissive={frame.trim} emissiveIntensity={0.35} roughness={0.4} metalness={0.25} />
      </RoundedBox>
      {/* Zwei eingelassene Füllungen (oben/unten) statt einer reinen
          Flachfläche — klassische Zimmertür-Optik statt Klappe. Nur bis
          Stufe 1: ab Stufe 2 übernimmt der Fenstereinsatz die obere Hälfte. */}
      {level < 2 && [DOOR_GEOM.h * 0.22, -DOOR_GEOM.h * 0.24].map((py, i) => (
        <RoundedBox key={i} args={[DOOR_GEOM.w * 0.68, DOOR_GEOM.h * 0.34, 0.015]} radius={0.008} position={[0, py, 0.099]}>
          <meshStandardMaterial color={shadeHex(frame.trim, 0.85)} roughness={0.5} metalness={0.15} />
        </RoundedBox>
      ))}
      {/* Fenstereinsatz ab Stufe 2 ("Modern eingerichtet") — dieselbe
          Himmelsfarbe wie beim Fenster für einen zusammenhängenden Look. */}
      {level >= 2 && (
        <>
          <mesh position={[0, DOOR_GEOM.h * 0.22, 0.101]}>
            <planeGeometry args={[DOOR_GEOM.w * 0.42, DOOR_GEOM.h * 0.24]} />
            <meshBasicMaterial color={SKY_COLOR[level] ?? SKY_COLOR[0]} toneMapped={false} />
          </mesh>
          <RoundedBox args={[DOOR_GEOM.w * 0.68, DOOR_GEOM.h * 0.34, 0.015]} radius={0.008} position={[0, -DOOR_GEOM.h * 0.24, 0.099]}>
            <meshStandardMaterial color={shadeHex(frame.trim, 0.85)} roughness={0.5} metalness={0.15} />
          </RoundedBox>
        </>
      )}
      {/* Scharniere — drei kleine Zylinder an der Angelseite, sonst wirkt
          das Türblatt wie eine bloß aufgeklebte Platte ohne Funktion. */}
      {[-1, 0, 1].map(i => (
        <mesh key={i} position={[-DOOR_GEOM.w * 0.44, i * DOOR_GEOM.h * 0.32, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.04, 8]} />
          <meshStandardMaterial color="#4a4f5e" roughness={0.4} metalness={0.6} />
        </mesh>
      ))}
      {/* Türgriff samt Schild dahinter. */}
      <RoundedBox args={[0.035, 0.14, 0.008]} radius={0.01} position={[DOOR_GEOM.w * 0.32, -DOOR_GEOM.h * 0.04, 0.1]}>
        <meshStandardMaterial color={handleColor} roughness={0.4} metalness={0.6} />
      </RoundedBox>
      <mesh position={[DOOR_GEOM.w * 0.32, -DOOR_GEOM.h * 0.04, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.12, 10]} />
        <meshStandardMaterial color={handleColor} emissive={handleColor} emissiveIntensity={0.4} roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}
