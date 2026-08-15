"use client";

import dynamic from "next/dynamic";
import { DEFAULT_ROOM } from "@/lib/room-layout";

const RoomStage3D = dynamic(() => import("../(dashboard)/zimmer/RoomStage3D"), { ssr: false });

export default function Preview3D() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <RoomStage3D
        state={DEFAULT_ROOM}
        ownerName="Test"
        vitrine={{ slots: [null, null, null], hiddenCount: 2 }}
        onInteract={() => {}}
      />
    </div>
  );
}
