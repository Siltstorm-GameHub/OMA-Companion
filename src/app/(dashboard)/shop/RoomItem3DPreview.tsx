"use client";

/**
 * Drehbare 3D-Vorschau eines Katalog-Items im Shop-Detail-Modal — rendert
 * dasselbe Shape-Rezept wie die echte Zimmer-Bühne (FurniturePrimitive),
 * nur freistehend mit OrbitControls statt fest in der Raumszene verankert.
 * Eigener, sehr kleiner Canvas statt RoomStage3D: kein Raum, keine Wände,
 * keine Bloom-Pipeline — nur das Objekt selbst, gut ausgeleuchtet.
 */

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, ContactShadows } from "@react-three/drei";
import { FurniturePrimitive } from "@/app/(dashboard)/zimmer/furniture/FurniturePrimitive";
import type { RoomItemDef } from "@/lib/room-items";

function Loading() {
  return (
    <mesh>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshStandardMaterial color="#3a3f4c" wireframe />
    </mesh>
  );
}

export function RoomItem3DPreview({ def }: { def: RoomItemDef }) {
  // Kamera-Abstand grob an die Item-Größe angepasst, damit winzige Deko
  // (1x1) genauso formatfüllend erscheint wie ein großer Schreibtisch (7x3).
  const span = Math.max(def.w, def.h, 1.2);
  const dist = span * 1.35 + 1.1;
  const targetY = Math.min(def.h, 2) * 0.4;

  return (
    <div className="w-full aspect-square rounded-xl bg-[#0d0b12] overflow-hidden">
      <Canvas dpr={[1, 1.5]} camera={{ position: [dist * 0.75, dist * 0.6, dist * 0.75], fov: 40 }}>
        <ambientLight intensity={0.75} />
        <hemisphereLight args={["#8890b0", "#1c1830", 0.5]} />
        <directionalLight position={[3, 5, 3]} intensity={1.4} />
        <directionalLight position={[-3, 2, -2]} intensity={0.5} />
        <Suspense fallback={<Loading />}>
          <group position={[0, 0, 0]}>
            <FurniturePrimitive def={def} />
          </group>
        </Suspense>
        <ContactShadows position={[0, 0.005, 0]} opacity={0.45} scale={span * 2.5} blur={2.2} far={2} />
        <OrbitControls
          target={[0, targetY, 0]}
          enablePan={false}
          minDistance={dist * 0.4}
          maxDistance={dist * 2.2}
          maxPolarAngle={Math.PI * 0.52}
        />
      </Canvas>
    </div>
  );
}
