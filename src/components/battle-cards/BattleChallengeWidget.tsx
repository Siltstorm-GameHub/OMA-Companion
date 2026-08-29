"use client";

// ============================================
// Battle-Cards-Herausforderung — Einstiegspunkt auf dem Profil
// ============================================
// Ersetzt das alte Münzenduell (DuelChallengeWidget). Kein Einsatz, kein
// Cooldown-Timer im Client — der Kampf wird bei Annahme sofort serverseitig
// mit der aktuellen Startaufstellung beider Spieler aufgelöst.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Swords } from "lucide-react";

export default function BattleChallengeWidget({
  opponentId,
  opponentName,
}: {
  opponentId: string;
  opponentName: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function challenge() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/battle-cards/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opponentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler");
        return;
      }
      toast.success(`Herausforderung an ${opponentName} gesendet!`);
      setSent(true);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <p className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-white/10 text-gray-400">
        <Swords className="w-3.5 h-3.5" /> Herausforderung gesendet
      </p>
    );
  }

  return (
    <button
      onClick={challenge}
      disabled={submitting}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-300 hover:bg-rose-500/10 disabled:opacity-40 transition-colors"
    >
      <Swords className="w-3.5 h-3.5" /> {submitting ? "Sendet…" : "Mit Battle Cards herausfordern"}
    </button>
  );
}
