"use client";

/**
 * Wegwerf-Preview-Route für den 3D-Rewrite der Zimmer-Bühne (siehe Plan-
 * Dokument "Gaming-Zimmer: Rewrite auf echtes 3D"). Zeigt RoomStage3D isoliert
 * mit der Standard-Platzierung, ohne Auth/State-Plumbing — wird entfernt,
 * sobald der Cut-over in RoomView.tsx erfolgt ist.
 */

import dynamic from "next/dynamic";
import { DEFAULT_ROOM } from "@/lib/room-layout";

const RoomStage3D = dynamic(() => import("../(dashboard)/zimmer/RoomStage3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[6/5] rounded-2xl bg-[#141018] animate-pulse" />
  ),
});

export default function Preview3DPage() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-lg font-semibold text-white">3D-Zimmer-Preview</h1>
      <RoomStage3D
        state={DEFAULT_ROOM}
        ownerName="Preview"
        vitrine={{ slots: Array(15).fill(null), hiddenCount: 3 }}
        onInteract={(target) => console.log("interact:", target)}
      />
    </div>
  );
}
