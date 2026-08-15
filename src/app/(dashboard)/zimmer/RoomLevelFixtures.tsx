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
import { gridToWorld, ROOM_SIZE } from "@/lib/room-3d";

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
 * Fenster auf der Rückwand — Position/Größe aus WINDOW_GEOM, Rahmenfarbe und
 * Ausblick werten sich mit `level` (0..3) automatisch auf.
 */
export function RoomWindow3D({ level }: { level: number }) {
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

function BareBulb() {
  return (
    <>
      <mesh position={[0, -0.1, 0]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#ffd98a" emissive="#ffcf6b" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.1, 12]} />
        <meshStandardMaterial color="#3a3f4c" roughness={0.4} metalness={0.5} />
      </mesh>
    </>
  );
}

function DrumShade() {
  return (
    <>
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.32, 20, 1, true]} />
        <meshStandardMaterial color="#8a6a5c" emissive="#8a6a5c" emissiveIntensity={0.4} roughness={0.7} side={DoubleSide} />
      </mesh>
      <mesh position={[0, -0.14, 0]}>
        <circleGeometry args={[0.24, 20]} />
        <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </>
  );
}

function DiscLamp() {
  return (
    <>
      <mesh>
        <cylinderGeometry args={[0.38, 0.38, 0.05, 28]} />
        <meshStandardMaterial color="#4a4f5e" emissive="#4a4f5e" emissiveIntensity={0.4} roughness={0.35} metalness={0.4} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <circleGeometry args={[0.32, 28]} />
        <meshStandardMaterial color="#a8d8ff" emissive="#a8d8ff" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </>
  );
}

function Chandelier() {
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
            <meshStandardMaterial color="#ffe29a" emissive="#ffcf6b" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        );
      })}
      <mesh position={[0, 0.08, 0]}>
        <sphereGeometry args={[0.1, 14, 10]} />
        <meshStandardMaterial color="#ffe29a" emissive="#ffcf6b" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

/**
 * Deckenlampe — hängt von der Decke, Position bewusst etwas seitlich der
 * Raummitte (nicht mittig über dem Schreibtisch), damit sie mit typischen
 * Möbel-Platzierungen nicht kollidiert. Kopf-Form wechselt mit `level`.
 */
export function CeilingLamp3D({ level }: { level: number }) {
  const cordLen = 0.7;
  const baseY = ROOM_SIZE.height - 0.06;
  return (
    <group position={[LAMP_ANCHOR.x, baseY, LAMP_ANCHOR.z]}>
      <mesh position={[0, -cordLen / 2, 0]}>
        <cylinderGeometry args={[0.015, 0.015, cordLen, 8]} />
        <meshStandardMaterial color="#2a2438" />
      </mesh>
      <group position={[0, -cordLen, 0]}>
        {level >= 3 ? <Chandelier />
          : level === 2 ? <DiscLamp />
          : level === 1 ? <DrumShade />
          : <BareBulb />}
      </group>
    </group>
  );
}
