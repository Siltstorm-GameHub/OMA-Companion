"use client";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";

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
 */
export interface Trophy3DItem {
  id:           string;
  title:        string;
  modelUrl:     string;
  /** Zusätzlicher Skalierungs-Faktor über die automatische Normierung hinaus. */
  scale?:       number;
  /** Rotations-Korrektur in Radiant [x, y, z], falls das Modell schief importiert wurde. */
  fixRotation?: [number, number, number];
  /** Zusatztext unter dem Titel, z.B. Halter oder Datum. */
  meta?:        string;
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

export default function Trophy3DViewer({ items, emptyMessage = "Noch keine Pokale" }: Props) {
  const [index, setIndex] = useState(0);
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
      <div className="relative w-full aspect-square bg-black/20">
        {/* key remontiert den Canvas-Inhalt bei Modellwechsel — einfacher als
            den internen State jeder einzelnen CenteredModel-Instanz zu pflegen. */}
        <Canvas key={current.id} camera={{ position: [0, 0.6, 3.2], fov: 40 }} dpr={[1, 1.5]}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[2, 3, 2]} intensity={1} color="#fff3df" />
          <directionalLight position={[-2, 1, -2]} intensity={0.35} color="#5eead4" />
          <CenteredModel item={current} />
          <OrbitControls autoRotate autoRotateSpeed={2.4} enableZoom={false} enablePan={false} />
        </Canvas>
      </div>

      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => go(-1)} disabled={count <= 1}
          aria-label="Vorheriger Pokal"
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-300 disabled:opacity-30 hover:bg-white/[0.08] transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 min-w-0 text-center">
          <p className="text-sm font-semibold text-white truncate">{current.title}</p>
          {current.meta && <p className="text-[11px] text-gray-500 mt-0.5 truncate">{current.meta}</p>}
          {count > 1 && <p className="text-[10px] text-gray-600 mt-0.5 tabular-nums">Pokal {clampedIndex + 1} von {count}</p>}
        </div>

        <button onClick={() => go(1)} disabled={count <= 1}
          aria-label="Nächster Pokal"
          className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.08] text-gray-300 disabled:opacity-30 hover:bg-white/[0.08] transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
