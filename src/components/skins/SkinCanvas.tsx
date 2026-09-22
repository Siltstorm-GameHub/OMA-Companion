"use client";

// ============================================
// Skins: 3D-Vorschau (Canvas + Licht + Kamera)
// ============================================

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds, OrbitControls } from "@react-three/drei";
import type { SkinDef } from "@/lib/skins/types";
import SkinModel from "./SkinModel";

export default function SkinCanvas({
  skin,
  clipName,
}: {
  skin: SkinDef;
  clipName: string | null;
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
        <Bounds fit clip observe margin={1.3}>
          <SkinModel key={skin.id} skin={skin} clipName={clipName} />
        </Bounds>
      </Suspense>
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
