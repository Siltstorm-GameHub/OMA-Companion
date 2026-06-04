"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ExternalLink } from "lucide-react";

export default function RegisterButton({
  eventId,
  isRegistered,
  isFull,
  discordEventUrl,
}: {
  eventId: string;
  isRegistered: boolean;
  isFull: boolean;
  discordEventUrl?: string | null;
}) {
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(isRegistered);
  const router = useRouter();

  const [justRegistered, setJustRegistered] = useState(false);

  async function handleClick() {
    if (isFull && !registered) return;
    setLoading(true);
    const method = registered ? "DELETE" : "POST";
    const res = await fetch(`/api/events/${eventId}/register`, { method });
    if (res.ok) {
      const wasRegistered = registered;
      setRegistered(!registered);
      if (!wasRegistered) setJustRegistered(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (isFull && !registered) {
    return (
      <button disabled className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 text-gray-600 cursor-not-allowed">
        Voll
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
          registered
            ? "bg-green-900/40 text-green-400 hover:bg-red-900/40 hover:text-red-400 border border-green-800 hover:border-red-800"
            : "bg-rose-600 hover:bg-rose-500 text-white"
        }`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : registered ? (
          <><Check className="w-3 h-3" /> Angemeldet</>
        ) : (
          "Anmelden"
        )}
      </button>
      {/* Discord-Link direkt nach Anmeldung anzeigen */}
      {justRegistered && discordEventUrl && (
        <a href={discordEventUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors whitespace-nowrap">
          <ExternalLink className="w-3 h-3" />
          Auf Discord anmelden
        </a>
      )}
    </div>
  );
}
