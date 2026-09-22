"use client";

// ============================================
// Test-Seite für den Skin-Viewer (temporär, kein Auth, nicht verlinkt)
// ============================================

import { useState } from "react";
import dynamic from "next/dynamic";
import { SKINS } from "@/lib/skins/skins";

const SkinCanvas = dynamic(() => import("@/components/skins/SkinCanvas"), { ssr: false });

export default function DevSkinTestPage() {
  const [skinId, setSkinId] = useState(SKINS[0].id);
  const [clip, setClip] = useState<"idle" | "attack" | "hit" | "death">("idle");
  const skin = SKINS.find((s) => s.id === skinId)!;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#0a0b10", color: "white" }}>
      <div style={{ width: 320, padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontSize: 18, fontWeight: 600 }}>Skin-Viewer (Dev)</h1>

        <div>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>Skin</div>
          {SKINS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkinId(s.id)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                marginBottom: 6,
                borderRadius: 8,
                background: s.id === skinId ? "#3b3f52" : "#1a1c26",
                border: "1px solid #2c2f3d",
                color: "white",
                cursor: "pointer",
              }}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div>
          <div style={{ opacity: 0.7, marginBottom: 8 }}>Animation</div>
          {(["idle", "attack", "hit", "death"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setClip(c)}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                marginBottom: 6,
                borderRadius: 8,
                background: c === clip ? "#3b3f52" : "#1a1c26",
                border: "1px solid #2c2f3d",
                color: "white",
                cursor: "pointer",
              }}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: 24 }}>
        <SkinCanvas skin={skin} clipName={skin.clips[clip]} />
      </div>
    </div>
  );
}
