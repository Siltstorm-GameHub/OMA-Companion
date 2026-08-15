"use client";

/**
 * 3D-Bühne des Gaming-Zimmers (Three.js/React Three Fiber) — Ersatz für das
 * SVG-basierte RoomStage.tsx. Phase 1+2 des 3D-Rewrites: statische Raum-Shell
 * (Boden + 2 Wände in Flachfarben) + feste Iso-Kamera + Neon-Lichtrig +
 * prozedural gebaute Möbel-Primitive an ihrer Grid-Position — noch ohne
 * Editor-Interaktion (kommt in Phase 3, siehe Plan-Dokument).
 */

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import {
  ROOM_SIZE, ROOM_CENTER, SHELL_COLORS, WORLD_UNIT,
  gridToWorld, surfaceRotationY,
} from "@/lib/room-3d";
import { getRoomItem } from "@/lib/room-items";
import type { PlacedItem } from "@/lib/room-layout";
import { FurniturePrimitive } from "./furniture/FurniturePrimitive";

interface RoomStage3DProps {
  placed: PlacedItem[];
}

function RoomShell() {
  const { width, depth, height } = ROOM_SIZE;
  return (
    <group>
      {/* Boden */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={SHELL_COLORS.floor} roughness={0.85} />
      </mesh>
      {/* Rückwand (Z=0) */}
      <mesh position={[width / 2, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={SHELL_COLORS.wallBack} roughness={0.9} />
      </mesh>
      {/* Seitenwand (X=0), zur Raummitte gedreht */}
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0, height / 2, depth / 2]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={SHELL_COLORS.wallSide} roughness={0.9} />
      </mesh>
    </group>
  );
}

/** Deckenkante als Neon-Strip — Bloom-Postprocessing macht daraus den weichen Glow. */
function NeonEdge() {
  const { width, depth, height } = ROOM_SIZE;
  return (
    <group>
      <mesh position={[width / 2, height - 0.05, 0.05]}>
        <boxGeometry args={[width * 0.96, 0.08, 0.08]} />
        <meshStandardMaterial color="#5ee6ff" emissive="#5ee6ff" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0.05, height - 0.05, depth / 2]}>
        <boxGeometry args={[depth * 0.94, 0.08, 0.08]} />
        <meshStandardMaterial color="#c07bff" emissive="#c07bff" emissiveIntensity={2.5} toneMapped={false} />
      </mesh>
    </group>
  );
}

function RoomLighting() {
  return (
    <>
      <hemisphereLight args={["#4a4570", "#100e18", 0.9]} />
      <directionalLight position={[6, 10, 4]} intensity={0.6} color="#fff2e0" />
    </>
  );
}

function PlacedFurniture({ placed }: { placed: PlacedItem[] }) {
  const entries = useMemo(() => placed.map(item => {
    const def = getRoomItem(item.key);
    if (!def) return null;
    const world = gridToWorld(item.zone, item.x, item.y, def.w, def.h);
    const rotY = surfaceRotationY(item.zone);
    return { item, def, world, rotY };
  }).filter((e): e is NonNullable<typeof e> => e !== null), [placed]);

  return (
    <>
      {entries.map(({ item, def, world, rotY }) => (
        <group key={item.id} position={world} rotation={[0, rotY, 0]}>
          <FurniturePrimitive def={def} />
        </group>
      ))}
    </>
  );
}

export default function RoomStage3D({ placed }: RoomStage3DProps) {
  const camPos = useMemo(() => {
    const d = Math.max(ROOM_SIZE.width, ROOM_SIZE.depth) * 1.4;
    return [ROOM_CENTER.x + d, d * 0.82, ROOM_CENTER.z + d] as const;
  }, []);

  return (
    <div className="w-full aspect-[6/5] overflow-hidden rounded-2xl bg-[#141018]">
      <Canvas shadows dpr={[1, 1.5]} frameloop="demand">
        <OrthographicCamera
          makeDefault
          zoom={42}
          position={camPos}
          near={0.1}
          far={100}
          onUpdate={cam => cam.lookAt(ROOM_CENTER)}
        />
        <RoomLighting />
        <RoomShell />
        <NeonEdge />
        <PlacedFurniture placed={placed} />
        <ContactShadows
          position={[ROOM_SIZE.width / 2, 0.01, ROOM_SIZE.depth / 2]}
          opacity={0.55} scale={Math.max(ROOM_SIZE.width, ROOM_SIZE.depth) * 1.2}
          blur={2.4} far={4}
        />
        <EffectComposer>
          <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

export const ROOM_WORLD_UNIT = WORLD_UNIT;
