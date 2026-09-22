"use client";

// ============================================
// Skins: eine einzelne, in sich geschlossene GLB (Mesh + Skelett + Animation)
// ============================================

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useAnimations, useGLTF } from "@react-three/drei";
import { skinAssetUrl } from "@/lib/skins/types";
import type { SkinDef } from "@/lib/skins/types";

export default function SkinModel({
  skin,
  clipName,
}: {
  skin: SkinDef;
  /** Name des Clips aus skin.clips, oder null = erste verfügbare Animation. */
  clipName: string | null;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(skinAssetUrl(skin.file));
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    Object.values(actions).forEach((a) => a?.stop());
    const name = clipName ?? Object.keys(actions)[0];
    if (name) actions[name]?.reset().play();
  }, [actions, clipName]);

  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}
