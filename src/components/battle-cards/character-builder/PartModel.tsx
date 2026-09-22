"use client";

// ============================================
// Character-Builder: ein einzelnes Kleidungs-/Haar-/Accessoire-Teil
// ============================================
// Lädt sein eigenes GLB, bindet es an das geteilte Körper-Skelett (statt sein
// eigenes zu benutzen) und läuft dadurch mit jeder Animation automatisch mit.
// Wird über `key={partDef.id}` von außen bei jedem Teil-Wechsel neu gemountet.

import { useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useGLTF, useTexture } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { assetUrl } from "@/lib/character-kit/types";
import type { MaterialDef, PartDef } from "@/lib/character-kit/types";

export default function PartModel({
  partDef,
  material,
  skeleton,
  tintBlock,
}: {
  partDef: PartDef;
  material: MaterialDef;
  skeleton: THREE.Skeleton;
  /** Block-Index der gewählten Farbe (nur bei partDef.tintable relevant), sonst null. */
  tintBlock: number | null;
}) {
  const { scene } = useGLTF(assetUrl(partDef.file));
  const clone = useMemo(() => SkeletonUtils.clone(scene) as THREE.Group, [scene]);
  const baseTexture = useTexture(assetUrl(material.texture));
  const texture = useMemo(() => {
    const t = baseTexture.clone();
    t.flipY = false;
    t.colorSpace = THREE.SRGBColorSpace;
    t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
  }, [baseTexture]);
  const mat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, side: THREE.DoubleSide }),
    [texture]
  );

  useLayoutEffect(() => {
    clone.traverse((obj) => {
      if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
        const mesh = obj as THREE.SkinnedMesh;
        mesh.material = mat;
        mesh.frustumCulled = false;
        mesh.bind(skeleton, mesh.bindMatrix);
      }
    });
  }, [clone, mat, skeleton]);

  useLayoutEffect(() => {
    if (!partDef.tintable || tintBlock == null || partDef.swatches.length === 0) {
      texture.offset.set(0, 0);
      return;
    }
    const a = material.blocks[partDef.swatches[0]]?.center;
    const b = material.blocks[tintBlock]?.center;
    if (a && b) texture.offset.set(b[0] - a[0], -(b[1] - a[1]));
  }, [texture, material, partDef, tintBlock]);

  return <primitive object={clone} />;
}
