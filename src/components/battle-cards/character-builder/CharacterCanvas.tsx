"use client";

// ============================================
// Character-Builder: 3D-Vorschau (Canvas + Licht + Kamera)
// ============================================

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import type { CharacterConfig, GenderData } from "@/lib/character-kit/types";
import CharacterRig from "./CharacterRig";

export default function CharacterCanvas({
  genderData,
  config,
  animationClipName,
}: {
  genderData: GenderData;
  config: CharacterConfig;
  animationClipName: string | null;
}) {
  return (
    <Canvas
      camera={{ position: [0, 0, 5], fov: 32 }}
      className="rounded-xl"
      style={{ background: "radial-gradient(circle at 50% 30%, #1f2430, #10121a)" }}
    >
      <hemisphereLight intensity={0.9} groundColor="#33384a" />
      <directionalLight position={[2, 4, 3]} intensity={1.4} />
      <Suspense fallback={null}>
        {/* Bounds rahmt automatisch auf die tatsächliche Modellgröße ein — die Rohkoordinaten
            der Export-Dateien sind keine Meter-Menschgröße, sondern die Blender-Werte 1:1
            (Körper reichen von ~3.5 bis ~5 Einheiten Höhe je Statur), fixe Kamerawerte würden
            bei manchen Körpern nur noch die Beine zeigen. `observe` fasst bei jedem
            Geschlechts-/Körper-/Teile-Wechsel neu. */}
        <Bounds fit clip observe margin={1.3}>
          {/* key erzwingt einen kompletten Neuaufbau bei Geschlechts-/Körper-Wechsel, statt
              Skelett/Regionen eines anderen Körpers weiterzuverwenden. */}
          <CharacterRig key={`${config.gender}-${config.body}`} genderData={genderData} config={config} animationClipName={animationClipName} />
        </Bounds>
      </Suspense>
      {/* Nur Drehen erlaubt — kein Zoom/Pan, sonst kann der Charakter aus dem Bild
          herausgezoomt/-geschoben werden. minPolarAngle/maxPolarAngle verhindert
          zusätzlich, dass man von oben/unten durch den Boden schaut. */}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2.6}
        maxPolarAngle={Math.PI / 1.7}
      />
    </Canvas>
  );
}
