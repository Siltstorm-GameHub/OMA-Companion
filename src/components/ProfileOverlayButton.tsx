"use client";

import { useState } from "react";
import { Loader2, Tv2 } from "lucide-react";
import { toast } from "sonner";

/** Einstiegspunkt fürs persönliche OBS-Overlay — nur nutzbar, wenn im Profil ein Twitch-Konto
 *  hinterlegt ist (Grundvoraussetzung dafür, dass der Link je in einem Stream landet). */
export default function ProfileOverlayButton({ hasTwitch }: { hasTwitch: boolean }) {
  const [loading, setLoading] = useState(false);

  if (!hasTwitch) {
    return (
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3">
        <Tv2 className="w-4 h-4 text-gray-600 shrink-0" />
        <p className="text-xs text-gray-500">
          Hinterlege dein Twitch-Konto oben, um ein persönliches OBS-Overlay einzurichten.
        </p>
      </div>
    );
  }

  async function openSettings() {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/overlay");
      if (!res.ok) {
        toast.error("Overlay-Link konnte nicht geladen werden");
        return;
      }
      const data = await res.json();
      if (data.overlayUrl) window.open(data.overlayUrl, "_blank", "noopener,noreferrer");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={openSettings}
      disabled={loading}
      className="w-full flex items-center gap-2 text-sm px-4 py-3 rounded-2xl border border-white/[0.08] text-gray-300 hover:text-teal-300 hover:border-teal-500/30 transition-all disabled:opacity-50"
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tv2 className="w-4 h-4 text-teal-400" />}
      Persönliches Overlay einrichten
    </button>
  );
}
