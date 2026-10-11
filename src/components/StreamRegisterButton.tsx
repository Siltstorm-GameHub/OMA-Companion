"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tv2, Loader2 } from "@/components/icons";
import { toast } from "sonner";
import { STREAMER_OVERLAY_SETTINGS_PATH } from "@/components/overlay/types";

/**
 * Anmeldung als Streamer eines Events — zeigt anderen, wer das Event streamt. Overlay-Link und
 * -Einstellungen liegen bewusst NICHT hier, sondern an genau einem Ort im Profil: Der feste
 * Streamer-Link zeigt dieses Event automatisch, solange es läuft.
 */
export default function StreamRegisterButton({
  eventId,
  isStreaming,
}: {
  eventId: string;
  isStreaming: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(isStreaming);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/stream-register`, {
        method: active ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d.code === "NO_TWITCH") {
          toast.error("Bitte zuerst dein Twitch-Konto in deinem Profil hinterlegen.");
          router.push("/profile");
          return;
        }
        toast.error(d.error ?? "Fehler");
        return;
      }
      if (active) {
        toast.success("Streamer-Anmeldung zurückgezogen");
      } else {
        toast.success("Als Streamer angemeldet!", {
          description:
            "Dein OBS-Overlay zeigt dieses Event automatisch, sobald es läuft. Deinen Overlay-Link und alle " +
            "Einstellungen findest du im Profil unter „OBS-Overlay einrichten“ – die Live-Steuerung für den Stream ebenfalls.",
          duration: 10_000,
          action: { label: "Zum Overlay", onClick: () => router.push(STREAMER_OVERLAY_SETTINGS_PATH) },
        });
      }
      setActive(v => !v);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border font-medium transition-all disabled:opacity-50 ${
        active
          ? "bg-[#9146ff]/20 border-[#9146ff]/40 text-[#c4a3ff] hover:bg-[#9146ff]/10"
          : "border-white/[0.08] text-gray-400 hover:text-[#c4a3ff] hover:border-[#9146ff]/30"
      }`}
    >
      {loading
        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
        : <Tv2 className="w-3.5 h-3.5" />
      }
      {active ? "Streamer abmelden" : "Als Streamer anmelden"}
    </button>
  );
}
