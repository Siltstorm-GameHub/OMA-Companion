"use client";

// ============================================
// Character-Builder: Körper + gewählte Teile + Animation zusammensetzen
// ============================================

import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useAnimations, useGLTF } from "@react-three/drei";
import { assetUrl } from "@/lib/character-kit/types";
import type { CharacterConfig, GenderData } from "@/lib/character-kit/types";
import BodyModel from "./BodyModel";
import PartModel from "./PartModel";

export default function CharacterRig({
  genderData,
  config,
  animationClipName,
}: {
  genderData: GenderData;
  config: CharacterConfig;
  /** Name des Clips aus genderData.animations.clips, oder null = keine Bewegung (Bind-Pose). */
  animationClipName: string | null;
}) {
  const body = genderData.bodies[config.body];
  const bodyMaterial = genderData.materials[body.bodyMaterial];
  const [rig, setRig] = useState<{ armature: THREE.Object3D; skeleton: THREE.Skeleton } | null>(null);
  const armatureRef = useRef<THREE.Object3D | null>(null);

  const activeMasks = useMemo(() => {
    const on = new Set<string>();
    for (const part of body.parts) {
      const selected = config.parts[part.category];
      if (selected === part.id) for (const m of part.masks) on.add(m);
    }
    return on;
  }, [body, config.parts]);

  const selectedParts = useMemo(
    () => body.parts.filter((p) => config.parts[p.category] === p.id),
    [body, config.parts]
  );

  const { animations } = useGLTF(assetUrl(genderData.animations.file));
  const { actions } = useAnimations(animations, rig ? armatureRef : undefined);

  useLayoutEffect(() => {
    if (rig) armatureRef.current = rig.armature;
  }, [rig]);

  // Animation abspielen, sobald Rig + Clip bereitstehen (Wechsel stoppt die vorherige).
  useLayoutEffect(() => {
    if (!rig) return;
    Object.values(actions).forEach((a) => a?.stop());
    if (animationClipName) actions[animationClipName]?.reset().play();
  }, [rig, actions, animationClipName]);

  return (
    <group>
      <Suspense fallback={null}>
        <BodyModel
          bodyDef={body}
          bodyMaterial={bodyMaterial}
          activeMasks={activeMasks}
          skinBlock={config.skinBlock}
          onReady={(armature, skeleton) => setRig({ armature, skeleton })}
        />
      </Suspense>
      {rig &&
        selectedParts.map((part) => {
          const mat = genderData.materials[part.materials[0]];
          if (!mat) return null;
          return (
            <Suspense key={part.id} fallback={null}>
              <PartModel partDef={part} material={mat} skeleton={rig.skeleton} tintBlock={config.tints[part.category] ?? null} />
            </Suspense>
          );
        })}
    </group>
  );
}
