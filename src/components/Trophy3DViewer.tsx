"use client";
import { useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { ChevronLeft, ChevronRight, Trophy, Maximize2 } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import { Modal } from "@/components/ui/Modal";

/**
 * Standalone 3D-Pokal-Viewer für den mobilen Profil-Reiter (siehe Teil B des
 * Mancave-Umbau-Plans) — eigener kleiner `<Canvas>` mit eigener Kamera +
 * Licht, unabhängig von der großen Mancave-Raumszene. Zentriert jedes Modell
 * automatisch per `THREE.Box3` und normiert es auf eine einheitliche Größe,
 * damit unterschiedlich große GLBs (die in der Raumszene individuelle
 * fix/scale-Werte für die Regal-Platzierung brauchen, siehe
 * `mancave-trophy-models.ts`) hier alle gleich groß und mittig erscheinen.
 * `scale`/`fixRotation` bleiben als optionale Fein-Korrektur erhalten, falls
 * ein Modell trotz Normierung schief oder falsch proportioniert wirkt.
 *
 * Rendert den Pokal in der Kachel nur als kleine, nicht interaktive
 * Mini-Vorschau — Klick darauf öffnet dieselbe Szene groß in einem Modal
 * (mit Zoom/Orbit). Der aktuelle Halter (bei Wanderpokalen) steht daneben
 * deutlich sichtbar mit echtem Profilbild inkl. Rangrahmen.
 */
export interface Trophy3DItem {
  id:           string;
  title:        string;
  modelUrl:     string;
  /** Zusätzlicher Skalierungs-Faktor über die automatische Normierung hinaus. */
  scale?:       number;
  /** Rotations-Korrektur in Radiant [x, y, z], falls das Modell schief importiert wurde. */
  fixRotation?: [number, number, number];
  /** Zusatztext unter dem Titel, z.B. Datum. */
  meta?:        string;
  /** Aktueller Halter (bei Wanderpokalen) — verlinkt auf dessen Profil. */
  holderUserId?:     string | null;
  holderName?:       string | null;
  holderAvatarUrl?:  string | null;
  holderRankPoints?: number | null;
}

interface Props {
  items:        Trophy3DItem[];
  emptyMessage?: string;
}

const TARGET_SIZE = 2.2;

function CenteredModel({ item }: { item: Trophy3DItem }) {
  const { scene } = useGLTF(item.modelUrl);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  // Box3-Zentrierung + Größennormierung synchron beim Rendern berechnen
  // (nicht in einem Effect + setState — cloned/item.scale liegen zum
  // Render-Zeitpunkt schon vor, ein Effect würde nur einen unnötigen
  // Zusatz-Render erzwingen).
  const { scale, offset } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    return {
      scale:  (TARGET_SIZE / maxDim) * (item.scale ?? 1),
      offset: [-center.x, -center.y, -center.z] as [number, number, number],
    };
  }, [cloned, item.scale]);

  return (
    <group scale={scale} rotation={item.fixRotation ?? [0, 0, 0]}>
      <group position={offset}>
        <primitive object={cloned} />
      </group>
    </group>
  );
}

/** Lässt sein Kind-Objekt gleichmäßig rotieren — für die nicht interaktive Mini-Vorschau,
 *  wo OrbitControls den Klick zum Öffnen der großen Ansicht abfangen würde. */
function AutoSpin({ children, speed = 0.6 }: { children: ReactNode; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, delta) => { if (ref.current) ref.current.rotation.y += delta * speed; });
  return <group ref={ref}>{children}</group>;
}

function TrophyCanvas({ item, interactive }: { item: Trophy3DItem; interactive: boolean }) {
  return (
    <Canvas key={item.id} camera={{ position: [0, 0.6, 3.2], fov: 40 }} dpr={[1, 1.5]}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1} color="#fff3df" />
      <directionalLight position={[-2, 1, -2]} intensity={0.35} color="#5eead4" />
      {interactive ? (
        <>
          <CenteredModel item={item} />
          <OrbitControls autoRotate autoRotateSpeed={2.4} enableZoom minDistance={1.6} maxDistance={5} enablePan={false} />
        </>
      ) : (
        <AutoSpin>
          <CenteredModel item={item} />
        </AutoSpin>
      )}
    </Canvas>
  );
}

export default function Trophy3DViewer({ items, emptyMessage = "Noch keine Pokale" }: Props) {
  const [index, setIndex] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const count = items.length;
  const clampedIndex = count > 0 ? Math.min(index, count - 1) : 0;
  const current = count > 0 ? items[clampedIndex] : null;

  function go(delta: number) {
    if (count === 0) return;
    setIndex(i => (Math.min(i, count - 1) + delta + count) % count);
  }

  if (count === 0 || !current) {
    return (
      <div className="glass card-shine rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center">
        <Trophy className="w-6 h-6 text-gray-600" />
        <p className="text-xs text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass card-shine rounded-2xl overflow-hidden">
      <div className="flex items-center gap-4 p-4">
        {/* Mini 3D-Vorschau — Klick öffnet die große, interaktive Ansicht */}
        <button
          type="button"
          onClick={() => setZoomOpen(true)}
          aria-label={`${current.title} vergrößert ansehen`}
          className="relative shrink-0 w-24 h-24 rounded-xl overflow-hidden bg-black/20 border border-white/[0.08] hover:border-amber-400/40 transition-colors group/mini"
        >
          <TrophyCanvas item={current} interactive={false} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/mini:bg-black/30 transition-colors pointer-events-none">
            <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover/mini:opacity-100 transition-opacity" />
          </div>
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{current.title}</p>
          {current.meta && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{current.meta}</p>}

          {/* Aktueller Halter (Wanderpokal) — deutlich sichtbar mit echtem Profilbild + Rangrahmen */}
          {current.holderUserId && (
            <Link href={`/profile/${current.holderUserId}`} className="inline-flex items-center gap-2 mt-2 group/holder">
              <RankedAvatar rankPoints={current.holderRankPoints ?? 0} src={current.holderAvatarUrl ?? null}
                alt={current.holderName ?? "Halter"} size={40} rounded="full" />
              <span className="text-left min-w-0">
                <span className="block text-[9px] text-amber-400/80 uppercase tracking-wider font-semibold">Aktueller Halter</span>
                <span className="block text-xs text-gray-200 font-medium group-hover/holder:text-teal-300 transition-colors truncate max-w-[140px]">
                  {current.holderName ?? "Unbekannt"}
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>

      {count > 1 && (
        <div className="flex items-center gap-3 px-4 pb-4">
          <button onClick={() => go(-1)}
            aria-label="Vorheriger Pokal"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <p className="flex-1 text-center text-[10px] text-gray-600 tabular-nums">Pokal {clampedIndex + 1} von {count}</p>
          <button onClick={() => go(1)}
            aria-label="Nächster Pokal"
            className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.08] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Große, interaktive Ansicht (Zoom/Orbit) */}
      <Modal open={zoomOpen} onClose={() => setZoomOpen(false)} title={current.title} size="lg">
        <div className="w-full aspect-square bg-black/20 rounded-xl overflow-hidden">
          <TrophyCanvas item={current} interactive />
        </div>
        {current.meta && <p className="text-xs text-gray-500 text-center mt-3">{current.meta}</p>}
        {current.holderUserId && (
          <Link href={`/profile/${current.holderUserId}`} className="flex items-center justify-center gap-2 mt-3 group/holder">
            <RankedAvatar rankPoints={current.holderRankPoints ?? 0} src={current.holderAvatarUrl ?? null}
              alt={current.holderName ?? "Halter"} size={40} rounded="full" />
            <span className="text-left">
              <span className="block text-[9px] text-amber-400/80 uppercase tracking-wider font-semibold">Aktueller Halter</span>
              <span className="block text-sm text-gray-200 font-medium group-hover/holder:text-teal-300 transition-colors">
                {current.holderName ?? "Unbekannt"}
              </span>
            </span>
          </Link>
        )}
      </Modal>
    </div>
  );
}
