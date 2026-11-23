"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, Check, Loader2 } from "@/components/icons";

interface Props {
  eventId: string;
  isSpectator: boolean;
  /** Belohnung fürs Zuschauen (wenn man beim Abschluss als anwesend markiert ist) */
  reward?: { coins: number; rankPoints: number } | null;
}

/** Als Zuschauer an-/abmelden — geht bis zum Abschluss der Spielphase (auch während das Event läuft). */
export default function SpectatorRegisterButton({ eventId, isSpectator, reward }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(isSpectator);
  const rewardText = reward && (reward.coins > 0 || reward.rankPoints > 0)
    ? [reward.coins > 0 ? `+${reward.coins} Münzen` : null, reward.rankPoints > 0 ? `+${reward.rankPoints} Rangpunkte` : null].filter(Boolean).join(" · ")
    : null;

  async function toggle() {
    setLoading(true);
    try {
      const method = registered ? "DELETE" : "POST";
      const body   = registered ? undefined : JSON.stringify({ role: "spectator" });
      const res    = await fetch(`/api/events/${eventId}/register`, {
        method,
        headers: body ? { "Content-Type": "application/json" } : {},
        body,
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        toast.error((e as { error?: string }).error ?? "Das hat nicht geklappt");
        return;
      }
      setRegistered(r => !r);
      toast.success(registered ? "Als Zuschauer abgemeldet" : "Du schaust zu", {
        description: registered ? undefined : rewardText ? `${rewardText} fürs Zuschauen, wenn du dabei bist.` : undefined,
      });
      router.refresh();
    } catch {
      toast.error("Keine Verbindung", { description: "Versuch es gleich noch mal." });
    } finally {
      setLoading(false);
    }
  }

  if (registered) {
    return (
      <button
        onClick={toggle}
        disabled={loading}
        title="Abmelden als Zuschauer"
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-400 transition-colors border border-line hover:border-red-500/30 px-3 py-1.5 rounded-xl max-lg:min-h-10"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
        Als Zuschauer angemeldet
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className="flex items-center gap-1.5 text-sm text-gray-300 hover:text-white transition-colors border border-line hover:border-line-strong px-3 py-1.5 rounded-xl max-lg:min-h-10"
    >
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
      Als Zuschauer anmelden
      {rewardText && <span className="text-xs text-amber-300">{rewardText}</span>}
    </button>
  );
}
