"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tv2, Loader2 } from "lucide-react";
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
  const [active, setActive] = useState(isStreaming);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/stream-register`, {
        method: active ? "DELETE" : "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Fehler");
        return;
      }
      setActive(v => !v);
      toast.success(active ? "Streamer-Anmeldung zurückgezogen" : "Als Streamer angemeldet!");
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
