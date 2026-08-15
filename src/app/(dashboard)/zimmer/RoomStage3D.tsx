"use client";

/**
 * 3D-Bühne des Gaming-Zimmers (Three.js/React Three Fiber) — Ersatz für das
 * SVG-basierte RoomStage.tsx. Übernimmt denselben Props-Vertrag 1:1
 * ({state, ownerName, vitrine, vitrineReadOnly, onInteract, edit}), damit
 * RoomView.tsx und RoomEditor.tsx nur den Import umstellen mussten.
 *
 * Raum-Shell + Möbel sind prozedural (kein Foto-Sprite, kein glTF) — siehe
 * FurniturePrimitive.tsx. Tapete/Boden sind Flachfarben (room-3d.ts), keine
 * Fototextur mehr. Die Vitrine ist kein eigenes seitliches Panel mehr,
 * sondern ein anklickbares Objekt IM Raum (VitrineMarker) — passt besser zum
 * 3D-Look als ein zusätzliches 2D-Panel neben der Bühne. Das bestehende
 * VitrinePanel.tsx (reichhaltige SVG-Trophäenanzeige) bleibt als Komponente
 * für einen möglichen späteren Einsatz erhalten, wird hier aber nicht mehr
 * gerendert — Trophäen/Pokale/Details zeigt weiterhin VitrineModal.
 */

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrthographicCamera, ContactShadows, RoundedBox, Html } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { Mesh } from "three";
import {
  ROOM_SIZE, ROOM_CENTER, SHELL_COLORS, ACCENT_COLORS,
  WALL_COLOR_BY_KEY, FLOOR_COLOR_BY_KEY, shadeHex,
  gridToWorld, surfaceRotationY, worldToGrid, type RoomSurface,
} from "@/lib/room-3d";
import { getRoomItem } from "@/lib/room-items";
import { roomLevel, type PlacedItem, type RoomState, type RoomSurface as LayoutSurface } from "@/lib/room-layout";
import type { VitrineItem } from "@/lib/room-vitrine";
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
  const trim = "#d8d2ea";
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
      {/*
       * Dünner heller Kantenrahmen um den Boden (alle vier Seiten): macht die
       * Raumgrenze auch bei dunkler Tapete/Boden sofort lesbar, statt dass
       * Möbel scheinbar im Void schweben — die Referenz-Screenshots zeigen
       * durchgehend einen scharfen, hellen Bodenrand.
       */}
      <mesh position={[width / 2, 0.02, 0.02]}>
        <boxGeometry args={[width, 0.04, 0.04]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
      </mesh>
      <mesh position={[width / 2, 0.02, depth - 0.02]}>
        <boxGeometry args={[width, 0.04, 0.04]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
      </mesh>
      <mesh position={[0.02, 0.02, depth / 2]}>
        <boxGeometry args={[0.04, 0.04, depth]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
      </mesh>
      <mesh position={[width - 0.02, 0.02, depth / 2]}>
        <boxGeometry args={[0.04, 0.04, depth]} />
        <meshBasicMaterial color={trim} toneMapped={false} />
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
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#6a63a0", "#1c1830", 1.1]} />
      <directionalLight position={[6, 10, 4]} intensity={1.1} color="#fff2e0" />
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

/**
 * Feste Position der Vitrine im Raum — kein Katalog-Platzierung (siehe
 * room-items.ts, "vitrine"-Eintrag: `interactive: "vitrine"` bleibt der
 * Ziel-Typ, aber das Objekt sitzt hier an einem festen Bühnenplatz statt im
 * frei belegbaren Raster, damit es in jedem Zimmer am selben Fleck steht).
 */
const VITRINE_MARKER = { zone: "floor" as RoomSurface, x: ROOM_SIZE.width - 2, y: 0, w: 2, h: 2 };

/**
 * Anklickbares Vitrinen-Objekt im Raum — ersetzt das frühere seitliche
 * VitrinePanel. Pulsierender Goldrahmen signalisiert Interaktivität (wie der
 * "atmende Rahmen" der alten SVG-Bühne, hier per useFrame statt CSS-Keyframe,
 * da innerhalb des Canvas kein CSS greift). Öffnet immer die Gesamtübersicht
 * (kein `slotIndex`) — das einzelne Anklicken je Trophäenfach gab es nur in
 * der SVG-Ansicht mit sichtbaren Einzel-Pedestalen.
 */
function VitrineMarker({
  hiddenCount, onClick,
}: { hiddenCount: number; onClick: () => void }) {
  const world = gridToWorld(VITRINE_MARKER.zone, VITRINE_MARKER.x, VITRINE_MARKER.y, VITRINE_MARKER.w, VITRINE_MARKER.h);
  const ringRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ringRef.current) return;
    const pulse = 0.35 + Math.sin(clock.elapsedTime * 2.2) * 0.18;
    (ringRef.current.material as { opacity: number }).opacity = hovered ? 0.7 : pulse;
  });

  return (
    <group
      position={world}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onPointerOver={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = "pointer"; }}
      onPointerOut={() => { setHovered(false); document.body.style.cursor = "auto"; }}
    >
      <RoundedBox args={[1.3, 2.2, 1.1]} radius={0.06} position={[0, 1.1, 0]}>
        <meshStandardMaterial color="#caa86a" roughness={0.25} metalness={0.3} transparent opacity={0.35} />
      </RoundedBox>
      <mesh position={[0, 1.5, 0]}>
        <circleGeometry args={[0.32, 20]} />
        <meshStandardMaterial color="#ffcf6b" emissive="#ffcf6b" emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh ref={ringRef} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 0.85, 28]} />
        <meshBasicMaterial color="#ffcf6b" transparent opacity={0.35} toneMapped={false} />
      </mesh>
      {hiddenCount > 0 && (
        <Html position={[0.65, 2.15, 0]} center distanceFactor={8} occlude={false}>
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-black/80 border border-amber-400/50 text-amber-300 text-[10px] font-bold">
            +{hiddenCount}
          </div>
        </Html>
      )}
    </group>
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

function RoomCanvas({
  state, edit, onInteract, hiddenVitrineCount,
}: Pick<Props, "state" | "edit" | "onInteract"> & { hiddenVitrineCount: number }) {
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
      {/* Im Bearbeiten-Modus nicht anklickbar — sie lässt sich ohnehin nicht
          verschieben, ein Klick soll dort nicht mitten in der Möbel-Auswahl
          ein Modal aufreißen (siehe altes VitrinePanel-Verhalten). */}
      {!edit && <VitrineMarker hiddenCount={hiddenVitrineCount} onClick={() => onInteract("vitrine")} />}
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

export default function RoomStage3D({ state, vitrine, onInteract, edit }: Props) {
  const level = roomLevel(state.placed);

  return (
    <div
      title={`Zimmer-Stufe ${level + 1}`}
      className="w-full aspect-[6/5] overflow-hidden rounded-2xl bg-[#141018]"
    >
      <RoomCanvas state={state} edit={edit} onInteract={onInteract} hiddenVitrineCount={vitrine.hiddenCount} />
    </div>
  );
}
