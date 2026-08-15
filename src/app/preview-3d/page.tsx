"use client";

import dynamic from "next/dynamic";
import { DEFAULT_ROOM } from "@/lib/room-layout";

const RoomStage3D = dynamic(() => import("../(dashboard)/zimmer/RoomStage3D"), { ssr: false });

const state = {
  ...DEFAULT_ROOM,
  placed: [
    ...DEFAULT_ROOM.placed,
    { id: "test:poster_front", key: "poster_retro", zone: "wall_front" as const, x: 2, y: 1, flipped: false, starter: false },
    { id: "test:poster_right", key: "poster_retro", zone: "wall_right" as const, x: 1, y: 1, flipped: false, starter: false },
  ],
};

export default function Preview3D() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <RoomStage3D
        state={state}
        ownerName="Test"
        vitrine={{ slots: [null, null, null], hiddenCount: 0 }}
        onInteract={() => {}}
      />
    </div>
  );
}
