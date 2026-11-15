"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ExternalLink, X } from "@/components/icons";
import { toast } from "sonner";

export default function RegisterButton({
  eventId,
  isRegistered,
  isFull,
  discordEventUrl,
  joinLabel = "Anmelden",
  coins,
}: {
  eventId: string;
  isRegistered: boolean;
  isFull: boolean;
  discordEventUrl?: string | null;
  /** Beschriftung des Anmelde-Knopfs, z.B. "Einsteigen" bei laufenden Events */
  joinLabel?: string;
  /** Teilnahme-Münzen — fliegen nach der Anmeldung kurz als "+X" hoch */
  coins?: number;
}) {
  const [loading, setLoading]               = useState(false);
  const [registered, setRegistered]         = useState(isRegistered);
  const [justRegistered, setJustRegistered] = useState(false);
  const [burst, setBurst]                   = useState(0);
  const router = useRouter();

  async function handleClick() {
    if (isFull && !registered) return;
    const wasRegistered = registered;
    // Optimistisch: Zustand sofort umschalten, bei Fehler zurückdrehen.
    setRegistered(!wasRegistered);
    setJustRegistered(!wasRegistered);
    if (!wasRegistered) setBurst(b => b + 1);
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/register`, { method: wasRegistered ? "DELETE" : "POST" });

      if (res.ok) {
        if (!wasRegistered) {
          toast.success("Angemeldet", {
            description: discordEventUrl ? "Melde dich auch auf Discord an, dann bekommst du die Erinnerung." : undefined,
            action: discordEventUrl
              ? { label: "Discord öffnen", onClick: () => window.open(discordEventUrl, "_blank") }
              : undefined,
          });
        } else {
          toast("Abgemeldet", { icon: <X className="w-4 h-4 text-gray-400" /> });
        }
      } else {
        setRegistered(wasRegistered);
        setJustRegistered(false);
        const err = await res.json().catch(() => ({}));
        toast.error("Das hat nicht geklappt", {
          description: (err as { error?: string }).error ?? "Versuch es gleich noch mal.",
        });
      }
      router.refresh();
    } catch {
      setRegistered(wasRegistered);
      setJustRegistered(false);
      toast.error("Keine Verbindung", { description: "Versuch es gleich noch mal." });
    } finally {
      setLoading(false);
    }
  }

  if (isFull && !registered) {
    return (
      <span className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] text-gray-500 border border-white/[0.06]">
        Voll
      </span>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <span className="relative inline-flex">
        <button
          onClick={handleClick}
          disabled={loading}
          aria-pressed={registered}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-all active:scale-95 ${
            registered
              ? "bg-teal-500/10 text-teal-300 hover:bg-red-500/10 hover:text-red-400 border border-teal-500/25 hover:border-red-500/25"
              : "bg-teal-500 hover:bg-teal-400 text-teal-950"
          } disabled:opacity-70`}
        >
          {registered ? (
            <><Check className="w-3 h-3" /> Dabei</>
          ) : (
            <>{loading && <Loader2 className="w-3 h-3 animate-spin" />}{joinLabel}</>
          )}
        </button>
        {burst > 0 && !!coins && registered && (
          <span key={burst} aria-hidden="true"
            className="pointer-events-none absolute -top-1 left-1/2 text-[11px] font-bold text-amber-400 value-delta-pop">
            +{coins}
          </span>
        )}
      </span>

      {justRegistered && discordEventUrl && (
        <a
          href={discordEventUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-teal-300 hover:text-teal-200 transition-colors whitespace-nowrap"
        >
          <ExternalLink className="w-3 h-3" />
          Auf Discord anmelden
        </a>
      )}
    </div>
  );
}
