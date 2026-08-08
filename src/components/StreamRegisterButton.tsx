"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tv2, Loader2, Link2 } from "lucide-react";
import { toast } from "sonner";

export default function StreamRegisterButton({
  eventId,
  isStreaming,
}: {
  eventId: string;
  isStreaming: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [active, setActive] = useState(isStreaming);

  function openOverlaySettings(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

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
      const wasActive = active;
      setActive(v => !v);
      if (!wasActive) {
        const data = await res.json().catch(() => ({}));
        toast.success("Als Streamer angemeldet! Overlay-Einstellungen öffnen sich in einem neuen Tab.");
        if (data.overlayUrl) openOverlaySettings(data.overlayUrl);
      } else {
        toast.success("Streamer-Anmeldung zurückgezogen");
      }
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function getLink() {
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/stream-register`);
      if (!res.ok) {
        toast.error("Link konnte nicht geladen werden");
        return;
      }
      const data = await res.json();
      if (data.overlayUrl) openOverlaySettings(data.overlayUrl);
    } finally {
      setLinkLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
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
      {active && (
        <button
          onClick={getLink}
          disabled={linkLoading}
          title="Overlay-Einstellungen öffnen"
          className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-xl border border-white/[0.08] text-gray-400 hover:text-teal-300 hover:border-teal-500/30 transition-all disabled:opacity-50"
        >
          {linkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
          Overlay-Einstellungen
        </button>
      )}
    </div>
  );
}
