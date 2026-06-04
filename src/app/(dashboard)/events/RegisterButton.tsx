"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";

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
  const [loading, setLoading]           = useState(false);
  const [registered, setRegistered]     = useState(isRegistered);
  const [justRegistered, setJustRegistered] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (isFull && !registered) return;
    setLoading(true);
    try {
      const method = registered ? "DELETE" : "POST";
      const res    = await fetch(`/api/events/${eventId}/register`, { method });

      if (res.ok) {
        const wasRegistered = registered;
        setRegistered(!registered);

        if (!wasRegistered) {
          setJustRegistered(true);
          toast.success("Erfolgreich angemeldet! 🎉", {
            description: discordEventUrl
              ? "Vergiss nicht, dich auch auf Discord anzumelden."
              : undefined,
            action: discordEventUrl
              ? { label: "Discord öffnen", onClick: () => window.open(discordEventUrl, "_blank") }
              : undefined,
          });
        } else {
          setJustRegistered(false);
          toast("Abmeldung erfolgreich", {
            icon: <X className="w-4 h-4 text-gray-400" />,
          });
        }
        router.refresh();
      } else {
        toast.error("Aktion fehlgeschlagen", {
          description: "Bitte versuche es erneut.",
        });
      }
    } catch {
      toast.error("Netzwerkfehler", {
        description: "Verbindung fehlgeschlagen.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (isFull && !registered) {
    return (
      <button disabled className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-600 cursor-not-allowed border border-white/[0.06]">
        Voll
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleClick}
        disabled={loading}
        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
          registered
            ? "bg-emerald-500/10 text-emerald-400 hover:bg-red-500/10 hover:text-red-400 border border-emerald-500/20 hover:border-red-500/20"
            : "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.25)]"
        } disabled:opacity-50`}
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : registered ? (
          <><Check className="w-3 h-3" /> Angemeldet</>
        ) : (
          "Anmelden"
        )}
      </button>

      {justRegistered && discordEventUrl && (
        <a
          href={discordEventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3 h-3" />
          Auf Discord anmelden
        </a>
      )}
    </div>
  );
}
