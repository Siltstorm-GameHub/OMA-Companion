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
import { RoundedBox } from "@react-three/drei";
import { DoubleSide } from "three";
import { gridToWorld, surfaceRotationY, ROOM_SIZE } from "@/lib/room-3d";

export const ROOM_LEVEL_LABEL = ["Abgewohnt", "Frisch renoviert", "Modern eingerichtet", "Luxuriös ausgestattet"];

/**
 * Fenster-Geometrie in Wand-Rasterzellen (wall_back). Die ursprünglichen
 * Maße (übernommen aus der alten SVG-Bühne) waren für den flachen 2D-Look
 * gedacht — in echten 3D-Metern (1 Rasterzelle ≈ 1m) ergab das ein
 * 2.6m×2.9m-Fenster, das die Rückwand dominierte. Auf realistische
 * Fenster-/Brüstungshöhe reduziert.
 */
const WINDOW_GEOM = { x0: 2, y0: 1.0, w: 1.6, h: 1.7 } as const;

const WINDOW_FRAME = [
  { base: "#6b4a30", trim: "#8a6440" },              // 0: Abgewohnt — Holz
  { base: "#d8d4c8", trim: "#efeee6" },              // 1: Renoviert — weiß gestrichen
  { base: "#6b7280", trim: "#9aa3b0" },              // 2: Modern — Alu
  { base: "#6b7280", trim: "#e9c874" },              // 3: Luxus — Alu + Gold
] as const;

/** Himmelfarbe hinterm Glas je Stufe — Dämmerung → Mittag → Sonnenuntergang. */
const SKY_COLOR = ["#241f38", "#2c3a52", "#4a7fb0", "#e8794f"];

function WindowGlass({ level }: { level: number }) {
  const sky = SKY_COLOR[level] ?? SKY_COLOR[0];
  return (
    <group>
      <mesh position={[0, 0, 0.065]}>
        <planeGeometry args={[WINDOW_GEOM.w * 0.86, WINDOW_GEOM.h * 0.86]} />
        <meshBasicMaterial color={sky} toneMapped={false} />
      </mesh>

      {/* Stufe 0/1: ferne, erleuchtete Nachbarfenster. */}
      {level <= 1 && (
        <group position={[0, 0, 0.07]}>
          {[[-0.55, 0.3], [-0.15, 0.6], [0.4, -0.1]].map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0]}>
              <planeGeometry args={[0.14, 0.18]} />
              <meshBasicMaterial color="#ffd98a" toneMapped={false} />
            </mesh>
          ))}
        </group>
      )}

      {/* Stufe 2: Skyline-Silhouette. */}
      {level === 2 && (
        <group position={[0, -WINDOW_GEOM.h * 0.16, 0.07]}>
          {[[-0.85, 0.55, 0.16], [-0.55, 0.85, 0.14], [-0.15, 0.4, 0.18], [0.25, 1.0, 0.15], [0.6, 0.6, 0.17]].map(
            ([x, h, w], i) => (
              <mesh key={i} position={[x * WINDOW_GEOM.w * 0.4, h * 0.3 - WINDOW_GEOM.h * 0.15, 0]}>
                <planeGeometry args={[w, h * 0.6]} />
                <meshBasicMaterial color="#1a2230" toneMapped={false} />
              </mesh>
            ),
          )}
        </group>
      )}

      {/* Stufe 3: Sonnenuntergang — Sonne + Horizont. */}
      {level >= 3 && (
        <group position={[0, 0, 0.07]}>
          <mesh position={[0.3, 0.35, 0]}>
            <circleGeometry args={[0.32, 24]} />
            <meshBasicMaterial color="#ffdf9e" toneMapped={false} />
          </mesh>
          <mesh position={[0, -0.05, 0]}>
            <planeGeometry args={[WINDOW_GEOM.w * 0.86, 0.03]} />
            <meshBasicMaterial color="#ffb98a" toneMapped={false} />
          </mesh>
        </group>
      )}

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
  { color: "#4a3f6b", intensity: 0.18 }, // 0: Dämmerung
  { color: "#5a6a8a", intensity: 0.3 },  // 1: Abend
  { color: "#bcd8f5", intensity: 1.1 },  // 2: Mittag
  { color: "#ffb98a", intensity: 0.85 }, // 3: Sonnenuntergang
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
 * Fenster auf der Rückwand — Position/Größe aus WINDOW_GEOM, Rahmenfarbe und
 * Ausblick werten sich mit `level` (0..3) automatisch auf. Wirft echtes
 * Licht in den Raum (siehe WINDOW_LIGHT), außer der Rolladen ist zu — `closed`
 * ist wie `on` bei der Deckenlampe ein reiner UI-Schalter, kein Katalogwert.
 */
export function RoomWindow3D({ level, closed }: { level: number; closed: boolean }) {
  const frame = WINDOW_FRAME[level] ?? WINDOW_FRAME[0];
  const light = WINDOW_LIGHT[level] ?? WINDOW_LIGHT[0];
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
      <RollerShutter closed={closed ? 1 : 0} />
      {/* Echtes Licht, das ins Zimmer hineinfällt — deutlich vor die
          Scheibe versetzt (z=1.4), sonst beleuchtet es nur sich selbst.
          Bei geschlossenem Rolladen komplett aus. */}
      {!closed && <pointLight position={[0, 0.2, 1.4]} color={light.color} intensity={light.intensity} distance={7} decay={1.8} />}
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

const LAMP_ANCHOR = { x: 8, y: 6.6, z: 2.2 } as const;

/** Alle vier Leuchtenköpfe nehmen `on` entgegen: die tatsächlich leuchtenden
 *  Teile (toneMapped=false, sonst hohe emissiveIntensity) dimmen auf einen
 *  "aus"-Wert herunter — Fassung/Schirm selbst bleiben unverändert sichtbar,
 *  nur die Glühbirne/das Leuchtmittel geht aus. */
function BareBulb({ on }: { on: boolean }) {
  return (
    <>
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#ffd98a" emissive="#ffcf6b" emissiveIntensity={on ? 2.2 : 0.1} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
        <meshStandardMaterial color="#3a3f4c" roughness={0.4} metalness={0.5} />
      </mesh>
    </>
  );
}

function DrumShade({ on }: { on: boolean }) {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.32, 20, 1, true]} />
        <meshStandardMaterial color="#8a6a5c" emissive="#8a6a5c" emissiveIntensity={0.4} roughness={0.7} side={DoubleSide} />
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
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 28]} />
        <meshStandardMaterial color="#4a4f5e" emissive="#4a4f5e" emissiveIntensity={0.4} roughness={0.35} metalness={0.4} />
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
      <mesh>
        <torusGeometry args={[0.28, 0.03, 8, 24]} />
        <meshStandardMaterial color="#e9c874" emissive="#e9c874" emissiveIntensity={0.6} roughness={0.3} metalness={0.6} />
      </mesh>
      {Array.from({ length: arms }).map((_, i) => {
        const angle = (i / arms) * Math.PI * 2;
        const x = Math.cos(angle) * 0.28, z = Math.sin(angle) * 0.28;
        return (
          <mesh key={i} position={[x, -0.08, z]}>
            <sphereGeometry args={[0.07, 12, 10]} />
            <meshStandardMaterial color="#ffe29a" emissive="#ffcf6b" emissiveIntensity={on ? 2 : 0.1} toneMapped={false} />
          </mesh>
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
 * Lichtstärke/-farbe der Deckenlampe je Stufe — vorher fix (immer dieselbe
 * Helligkeit unabhängig von der Leuchten-Form), jetzt an dieselbe Stufe
 * gekoppelt wie die Kopf-Form: nackte Glühbirne leuchtet spürbar schwächer
 * als der Kronleuchter.
 */
const CEILING_LAMP_LIGHT = [
  { color: "#ffe9b8", intensity: 0.75 }, // 0: nackte Glühbirne
  { color: "#ffdba0", intensity: 0.95 }, // 1: Stoffschirm
  { color: "#eaf2ff", intensity: 1.3 },  // 2: modernes Deckenlicht (kühler)
  { color: "#ffe9b8", intensity: 1.6 },  // 3: Kronleuchter
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
            position={[0, -0.05, 0]} color={light.color} intensity={light.intensity} distance={9} decay={2}
            castShadow shadow-mapSize-width={512} shadow-mapSize-height={512}
            shadow-bias={-0.003}
          />
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
const DOOR_GEOM = { x0: 5, y0: 0, w: 1.0, h: 2.1 } as const;

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
      {/* Fenstereinsatz ab Stufe 2 ("Modern eingerichtet") — dieselbe
          Himmelsfarbe wie beim Fenster für einen zusammenhängenden Look. */}
      {level >= 2 && (
        <mesh position={[0, DOOR_GEOM.h * 0.22, 0.101]}>
          <planeGeometry args={[DOOR_GEOM.w * 0.42, DOOR_GEOM.h * 0.24]} />
          <meshBasicMaterial color={SKY_COLOR[level] ?? SKY_COLOR[0]} toneMapped={false} />
        </mesh>
      )}
      {/* Türgriff */}
      <mesh position={[DOOR_GEOM.w * 0.32, -DOOR_GEOM.h * 0.04, 0.105]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.12, 10]} />
        <meshStandardMaterial color={handleColor} emissive={handleColor} emissiveIntensity={0.4} roughness={0.3} metalness={0.7} />
      </mesh>
    </group>
  );
}
