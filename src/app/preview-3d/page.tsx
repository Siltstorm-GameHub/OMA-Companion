"use client";

import dynamic from "next/dynamic";
import { DEFAULT_ROOM } from "@/lib/room-layout";

const RoomStage3D = dynamic(() => import("../(dashboard)/zimmer/RoomStage3D"), { ssr: false });

const extra: { key: string; zone: "floor" | "wall_back"; x: number; y: number }[] = [
  { key: "webcam", zone: "floor", x: 6, y: 3 },
  { key: "mikrofon", zone: "floor", x: 7, y: 3 },
  { key: "streamdeck", zone: "floor", x: 8, y: 3 },
  { key: "capture", zone: "floor", x: 9, y: 3 },
  { key: "steckdosenleiste", zone: "floor", x: 10, y: 3 },
  { key: "konsole_retro", zone: "floor", x: 12, y: 3 },
  { key: "kaffeemaschine", zone: "floor", x: 13, y: 3 },
  { key: "rollator", zone: "floor", x: 14, y: 3 },
  { key: "teppich", zone: "floor", x: 6, y: 6 },
  { key: "poster_retro", zone: "wall_back", x: 2, y: 3 },
  { key: "whiteboard", zone: "wall_back", x: 6, y: 3 },
];

const state = {
  ...DEFAULT_ROOM,
  placed: [
    ...DEFAULT_ROOM.placed,
    ...extra.map((e, i) => ({ id: `test:${i}`, key: e.key, zone: e.zone, x: e.x, y: e.y, flipped: false, starter: false })),
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
