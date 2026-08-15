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

import { RoundedBox } from "@react-three/drei";
import { ACCENT_COLORS } from "@/lib/room-3d";
import type { RoomItemDef } from "@/lib/room-items";

interface ShapeProps {
  def: RoomItemDef;
}

const METAL = "#3a3f4c";

function Desk({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const legH = 0.75;
  return (
    <group>
      <RoundedBox args={[def.w * 0.94, 0.08, def.h * 0.9]} radius={0.04} position={[0, legH, 0]}>
        <meshStandardMaterial color={accent} roughness={0.35} metalness={0.1} />
      </RoundedBox>
      {[-1, 1].map(sx => [-1, 1].map(sz => (
        <RoundedBox
          key={`${sx}-${sz}`}
          args={[0.08, legH, 0.08]} radius={0.02}
          position={[sx * (def.w * 0.94 / 2 - 0.1), legH / 2, sz * (def.h * 0.9 / 2 - 0.1)]}
        >
          <meshStandardMaterial color={METAL} roughness={0.5} metalness={0.4} />
        </RoundedBox>
      )))}
    </group>
  );
}

function Monitor({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <group position={[0, 0.85, 0]}>
      <RoundedBox args={[0.1, 0.4, 0.1]} radius={0.02} position={[0, 0.2, 0]}>
        <meshStandardMaterial color={METAL} roughness={0.6} />
      </RoundedBox>
      <RoundedBox args={[def.w * 0.8, def.h * 0.45, 0.06]} radius={0.03} position={[0, 0.55, 0]}>
        <meshStandardMaterial color="#161822" roughness={0.4} />
      </RoundedBox>
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
        <meshStandardMaterial color="#1a1c24" roughness={0.4} metalness={0.3} />
      </RoundedBox>
      <mesh position={[0, def.h * 0.6, def.w * 0.31]}>
        <circleGeometry args={[0.14, 24]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.2} toneMapped={false} />
      </mesh>
    </group>
  );
}

function Chair({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <group>
      <RoundedBox args={[def.w * 0.8, 0.08, def.w * 0.8]} radius={0.04} position={[0, 0.55, 0]}>
        <meshStandardMaterial color={accent} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[def.w * 0.75, def.h * 0.55, 0.08]} radius={0.04} position={[0, 1.0, -def.w * 0.35]}>
        <meshStandardMaterial color={accent} roughness={0.4} />
      </RoundedBox>
      <RoundedBox args={[0.06, 0.5, 0.06]} radius={0.02} position={[0, 0.28, 0]}>
        <meshStandardMaterial color={METAL} roughness={0.5} metalness={0.4} />
      </RoundedBox>
    </group>
  );
}

function Shelf({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  const boards = 3;
  return (
    <group>
      {Array.from({ length: boards }).map((_, i) => (
        <RoundedBox
          key={i} args={[def.w * 0.92, 0.06, def.h * 0.8]} radius={0.02}
          position={[0, (i + 1) * (def.h * 0.85 / boards), 0]}
        >
          <meshStandardMaterial color={accent} roughness={0.5} />
        </RoundedBox>
      ))}
    </group>
  );
}

function LightStrip({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <mesh position={[0, def.h * 0.5, 0.02]}>
      <boxGeometry args={[def.w * 0.95, def.h * 0.5, 0.04]} />
      <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} toneMapped={false} />
    </mesh>
  );
}

function Plant({ def }: ShapeProps) {
  return (
    <group>
      <RoundedBox args={[def.w * 0.55, 0.4, def.w * 0.55]} radius={0.06} position={[0, 0.2, 0]}>
        <meshStandardMaterial color="#5a4632" roughness={0.7} />
      </RoundedBox>
      <mesh position={[0, def.h * 0.55, 0]}>
        <sphereGeometry args={[def.w * 0.4, 12, 10]} />
        <meshStandardMaterial color="#3f8f5c" roughness={0.6} />
      </mesh>
    </group>
  );
}

function GenericBox({ def }: ShapeProps) {
  const accent = ACCENT_COLORS[def.accent];
  return (
    <RoundedBox args={[def.w * 0.85, def.h * 0.85, def.w * 0.85]} radius={0.05} position={[0, def.h * 0.42, 0]}>
      <meshStandardMaterial color={accent} roughness={0.5} metalness={0.15} />
    </RoundedBox>
  );
}

/** Ordnet ein Katalog-Item einem der obigen Shape-Rezepte zu und rendert es direkt. */
export function FurniturePrimitive({ def }: ShapeProps) {
  if (def.tags.includes("desk")) return <Desk def={def} />;
  if (def.tags.includes("monitor") || def.tags.includes("crt")) return <Monitor def={def} />;
  if (def.tags.includes("pc")) return <Tower def={def} />;
  if (def.tags.includes("chair") || def.tags.includes("chair_gaming")) return <Chair def={def} />;
  if (def.tags.includes("shelf") || def.tags.includes("trophy_shelf")) return <Shelf def={def} />;
  if (def.tags.includes("light") || def.tags.includes("neon")) return <LightStrip def={def} />;
  if (def.tags.includes("plant")) return <Plant def={def} />;
  return <GenericBox def={def} />;
}
