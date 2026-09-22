"use client";

// ============================================
// Character-Builder: Körper (Skelett + Haut-Regionen + Hautton)
// ============================================
// Lädt body.glb, klont ihn (SkeletonUtils — normales scene.clone() zerstört die
// Skinning-Bindung), blendet Regionen anhand der aktiven Masken aus und
// verschiebt die Hautton-Textur per UV-Offset. Meldet Armature-Root + Skeleton
// nach oben, sobald geladen — Part-Komponenten binden sich erst dann an.

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { assetUrl } from "@/lib/character-kit/types";
import type { BodyDef, MaterialDef } from "@/lib/character-kit/types";

export default function BodyModel({
  bodyDef,
  bodyMaterial,
  activeMasks,
  skinBlock,
  onReady,
}: {
  bodyDef: BodyDef;
  bodyMaterial: MaterialDef;
  activeMasks: Set<string>;
  /** Block-Index des gewählten Farbfelds, oder null = Standard-Hautton behalten. */
  skinBlock: number | null;
  onReady: (armature: THREE.Object3D, skeleton: THREE.Skeleton) => void;
}) {
  const { scene } = useGLTF(assetUrl(bodyDef.base));
  const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
  const baseTexture = useTexture(assetUrl(bodyMaterial.texture));
  const texture = useMemo(() => {
    const t = baseTexture.clone();
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, [baseTexture]);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }),
    [texture]
  );

  const regionsRef = useRef<Record<string, THREE.Object3D>>({});
  const reportedRef = useRef(false);

  useLayoutEffect(() => {
    const regions: Record<string, THREE.Object3D> = {};
    let skeleton: THREE.Skeleton | null = null;
    let armature: THREE.Object3D | null = null;
    clone.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = obj as THREE.SkinnedMesh;
        mesh.material = material;
        mesh.frustumCulled = false;
        regions[mesh.name] = mesh;
        skeleton = mesh.skeleton;
      }
      if ((obj as THREE.Bone).isBone && !armature) {
        armature = obj.parent; // die Armature-Node ist der Elternknoten der ersten Bone
      }
    });
    regionsRef.current = regions;
    if (skeleton && armature && !reportedRef.current) {
      reportedRef.current = true;
      onReady(armature, skeleton);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clone, material]);

  useEffect(() => {
    for (const region of bodyDef.regions) {
      const obj = regionsRef.current[region.mesh];
      if (obj) obj.visible = !region.hiddenBy.some((m) => activeMasks.has(m));
    }
  }, [bodyDef, activeMasks]);

  useEffect(() => {
    if (skinBlock == null) {
      texture.offset.set(0, 0);
      return;
    }
    const a = bodyMaterial.blocks[bodyDef.skin.block]?.center;
    const b = bodyMaterial.blocks[skinBlock]?.center;
    if (a && b) texture.offset.set(b[0] - a[0], 0);
  }, [texture, bodyMaterial, bodyDef, skinBlock]);

  return <primitive object={clone} />;
}
