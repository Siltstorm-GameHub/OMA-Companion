"use client";

/**
 * 3D-Bühne des Gaming-Zimmers (Three.js/React Three Fiber) — Ersatz für das
 * SVG-basierte RoomStage.tsx. Übernimmt denselben Props-Vertrag 1:1
 * ({state, ownerName, vitrine, vitrineReadOnly, onInteract, edit}), damit
 * RoomView.tsx und RoomEditor.tsx nur den Import umstellen mussten.
 *
 * Raum-Shell + Möbel sind prozedural (kein Foto-Sprite, kein glTF) — siehe
 * FurniturePrimitive.tsx. Tapete/Boden sind Flachfarben (room-3d.ts), keine
 * Fototextur mehr. Die Vitrine bleibt das bestehende SVG-Panel (VitrinePanel,
 * geteilt mit der alten Bühne) — sie zeigt Trophäen/Pokale/Abzeichen als
 * flache Icons, das ist kein isometrisches/3D-Element und lohnt keinen Rewrite.
 */

import { useMemo, useState } from "react";
import { Canvas, type ThreeEvent } from "@react-three/fiber";
import { OrthographicCamera, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import {
  ROOM_SIZE, ROOM_CENTER, SHELL_COLORS, ACCENT_COLORS,
  WALL_COLOR_BY_KEY, FLOOR_COLOR_BY_KEY, shadeHex,
  gridToWorld, surfaceRotationY, worldToGrid, type RoomSurface,
} from "@/lib/room-3d";
import { getRoomItem } from "@/lib/room-items";
import { roomLevel, type PlacedItem, type RoomState, type RoomSurface as LayoutSurface } from "@/lib/room-layout";
import type { VitrineItem } from "@/lib/room-vitrine";
import { VitrinePanel } from "./VitrinePanel";
import { FurniturePrimitive } from "./furniture/FurniturePrimitive";

export type InteractTarget = "crt" | "vitrine" | "jobboard";

export interface EditHooks {
  selectedId: string | null;
  legal: { zone: LayoutSurface; x: number; y: number }[];
  ghost: { w: number; h: number; key: string } | null;
  onSelect: (id: string) => void;
  onGrab:   (id: string) => void;
  onDrop:   (zone: LayoutSurface, x: number, y: number) => void;
}

interface Props {
  state:     RoomState;
  ownerName: string;
  vitrine: { slots: (VitrineItem | null)[]; hiddenCount: number };
  vitrineReadOnly?: boolean;
  onInteract: (target: InteractTarget, itemKey?: string, slotIndex?: number) => void;
  edit?: EditHooks;
}

function RoomShell({ wallpaperKey, floorKey }: { wallpaperKey: string; floorKey: string }) {
  const { width, depth, height } = ROOM_SIZE;
  const wallColor = WALL_COLOR_BY_KEY[wallpaperKey] ?? SHELL_COLORS.wallBack;
  const floorColor = FLOOR_COLOR_BY_KEY[floorKey] ?? SHELL_COLORS.floor;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[width / 2, 0, depth / 2]}>
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial color={floorColor} roughness={0.85} />
      </mesh>
      <mesh position={[width / 2, height / 2, 0]}>
        <planeGeometry args={[width, height]} />
        <meshStandardMaterial color={wallColor} roughness={0.9} />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]} position={[0, height / 2, depth / 2]}>
        <planeGeometry args={[depth, height]} />
        <meshStandardMaterial color={shadeHex(wallColor, 0.72)} roughness={0.9} />
      </mesh>
    </group>
  );
}

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

/** Halbtransparente Zellen-Fläche für Legal-Cell-Highlights & Ghost-Preview. */
function CellHighlight({
  surface, x, y, w, h, color, opacity,
}: { surface: RoomSurface; x: number; y: number; w: number; h: number; color: string; opacity: number }) {
  const world = gridToWorld(surface, x, y, w, h);
  const rotX = surface === "floor" ? -Math.PI / 2 : 0;
  const rotY = surfaceRotationY(surface);
  const offset = 0.01;
  const pos = surface === "floor"
    ? [world.x, offset, world.z] as const
    : surface === "wall_back"
      ? [world.x, world.y, offset] as const
      : [offset, world.y, world.z] as const;
  return (
    <mesh position={pos} rotation={[rotX, rotY, 0]}>
      <planeGeometry args={[w * 0.96, h * 0.96]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
    </mesh>
  );
}

function PlacedFurniture({
  placed, edit, onInteract,
}: { placed: PlacedItem[]; edit?: EditHooks; onInteract: Props["onInteract"] }) {
  const entries = useMemo(() => placed.map(item => {
    const def = getRoomItem(item.key);
    if (!def) return null;
    const world = gridToWorld(item.zone, item.x, item.y, def.w, def.h);
    const rotY = surfaceRotationY(item.zone);
    return { item, def, world, rotY };
  }).filter((e): e is NonNullable<typeof e> => e !== null), [placed]);

  return (
    <>
      {entries.map(({ item, def, world, rotY }) => {
        const selected = edit?.selectedId === item.id;
        function handleClick(e: ThreeEvent<MouseEvent>) {
          e.stopPropagation();
          if (edit) { edit.onSelect(item.id); return; }
          if (def.interactive) onInteract(def.interactive, def.interactive === "crt" ? item.key : undefined);
        }
        function handlePointerDown(e: ThreeEvent<PointerEvent>) {
          if (!edit) return;
          e.stopPropagation();
          edit.onGrab(item.id);
        }
        return (
          <group
            key={item.id} position={world} rotation={[0, rotY, 0]}
            onClick={handleClick} onPointerDown={handlePointerDown}
          >
            <group scale={selected ? 1.06 : 1}>
              <FurniturePrimitive def={def} />
            </group>
            {selected && (
              <mesh position={[0, def.h * 0.5, 0]}>
                <ringGeometry args={[Math.max(def.w, def.h) * 0.6, Math.max(def.w, def.h) * 0.68, 24]} />
                <meshBasicMaterial color="#5ee6ff" transparent opacity={0.5} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

function EditLayer({ edit }: { edit: EditHooks }) {
  const accent = edit.ghost ? ACCENT_COLORS[getRoomItem(edit.ghost.key)?.accent ?? "teal"] : "#5ee6ff";
  const [hover, setHover] = useState<{ zone: RoomSurface; x: number; y: number } | null>(null);

  function raycastToCell(surface: RoomSurface, e: ThreeEvent<PointerEvent>) {
    if (!edit.ghost) return;
    const { a, b } = worldToGrid(surface, e.point);
    // An der oberen/hinteren Zellkante ausrichten (nicht am Mittelpunkt), wie in room-layout.ts erwartet.
    const anchorA = Math.round(a - edit.ghost.w / 2);
    const anchorB = Math.round(b - edit.ghost.h / 2);
    const match = edit.legal.find(c => c.zone === surface && c.x === anchorA && c.y === anchorB);
    setHover(match ? { zone: surface, x: match.x, y: match.y } : null);
  }

  return (
    <>
      {/* Klickflächen für Boden/Wände — nehmen Pointer-Events für Platzierung entgegen. */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]} position={[ROOM_SIZE.width / 2, 0, ROOM_SIZE.depth / 2]}
        onPointerMove={e => raycastToCell("floor", e)}
        onClick={e => { e.stopPropagation(); if (hover?.zone === "floor") edit.onDrop(hover.zone, hover.x, hover.y); }}
        visible={false}
      >
        <planeGeometry args={[ROOM_SIZE.width, ROOM_SIZE.depth]} />
      </mesh>
      <mesh
        position={[ROOM_SIZE.width / 2, ROOM_SIZE.height / 2, 0]}
        onPointerMove={e => raycastToCell("wall_back", e)}
        onClick={e => { e.stopPropagation(); if (hover?.zone === "wall_back") edit.onDrop(hover.zone, hover.x, hover.y); }}
        visible={false}
      >
        <planeGeometry args={[ROOM_SIZE.width, ROOM_SIZE.height]} />
      </mesh>
      <mesh
        rotation={[0, Math.PI / 2, 0]} position={[0, ROOM_SIZE.height / 2, ROOM_SIZE.depth / 2]}
        onPointerMove={e => raycastToCell("wall_side", e)}
        onClick={e => { e.stopPropagation(); if (hover?.zone === "wall_side") edit.onDrop(hover.zone, hover.x, hover.y); }}
        visible={false}
      >
        <planeGeometry args={[ROOM_SIZE.depth, ROOM_SIZE.height]} />
      </mesh>

      {/* Freie Zellen leuchten aus. */}
      {edit.ghost && edit.legal.map((c, i) => (
        <CellHighlight
          key={i} surface={c.zone} x={c.x} y={c.y} w={edit.ghost!.w} h={edit.ghost!.h}
          color={accent} opacity={hover?.zone === c.zone && hover.x === c.x && hover.y === c.y ? 0.55 : 0.22}
        />
      ))}

      {/* Ghost-Vorschau des angehobenen Stücks am Hover-Ziel. */}
      {edit.ghost && hover && (() => {
        const def = getRoomItem(edit.ghost.key);
        if (!def) return null;
        const world = gridToWorld(hover.zone, hover.x, hover.y, def.w, def.h);
        const rotY = surfaceRotationY(hover.zone);
        return (
          <group position={world} rotation={[0, rotY, 0]}>
            <FurniturePrimitive def={def} />
          </group>
        );
      })()}
    </>
  );
}

function RoomCanvas({ state, edit, onInteract }: Pick<Props, "state" | "edit" | "onInteract">) {
  const camPos = useMemo(() => {
    const d = Math.max(ROOM_SIZE.width, ROOM_SIZE.depth) * 1.4;
    return [ROOM_CENTER.x + d, d * 0.82, ROOM_CENTER.z + d] as const;
  }, []);

  return (
    <Canvas shadows dpr={[1, 1.5]} frameloop="always">
      <OrthographicCamera
        makeDefault
        zoom={42}
        position={camPos}
        near={0.1}
        far={100}
        onUpdate={cam => cam.lookAt(ROOM_CENTER)}
      />
      <RoomLighting />
      <RoomShell wallpaperKey={state.wallpaperKey} floorKey={state.floorKey} />
      <NeonEdge />
      <PlacedFurniture placed={state.placed} edit={edit} onInteract={onInteract} />
      {edit && <EditLayer edit={edit} />}
      <ContactShadows
        position={[ROOM_SIZE.width / 2, 0.01, ROOM_SIZE.depth / 2]}
        opacity={0.55} scale={Math.max(ROOM_SIZE.width, ROOM_SIZE.depth) * 1.2}
        blur={2.4} far={4}
      />
      <EffectComposer>
        <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}

export default function RoomStage3D({ state, ownerName, vitrine, vitrineReadOnly, onInteract, edit }: Props) {
  const level = roomLevel(state.placed);

  return (
    <div className="flex flex-col sm:flex-row items-stretch gap-3">
      {/*
       * `measuredHeight` bleibt bewusst `null`: die alte SVG-Bühne brauchte
       * einen per ResizeObserver GEMESSENEN Höhenwert, weil ihre eigene Höhe
       * vom Bildinhalt abhing (kein fester Seitenverhältnis-Container). Die
       * 3D-Bühne hat mit `aspect-[6/5]` dagegen eine deterministische CSS-Höhe
       * ab dem ersten Paint — die Vitrine kann per `sm:self-stretch` (siehe
       * VitrinePanel) rein über Flexbox mitwachsen, ohne den asynchronen
       * Messungs-Umweg samt kurzem Zwischenzustand vor dem ersten
       * ResizeObserver-Callback (mögliche Ursache für einen sichtbaren
       * Größensprung direkt beim Öffnen der Seite).
       */}
      <VitrinePanel
        ownerName={ownerName} vitrine={vitrine} readOnly={!!vitrineReadOnly}
        onInteract={onInteract} editing={!!edit}
        measuredHeight={null}
      />

      <div
        title={`Zimmer-Stufe ${level + 1}`}
        className="w-full aspect-[6/5] overflow-hidden rounded-2xl bg-[#141018] min-w-0 flex-1"
      >
        <RoomCanvas state={state} edit={edit} onInteract={onInteract} />
      </div>
    </div>
  );
}
