"use client";

// ============================================
// Pack-Öffnen — Overlay mit Klick-Animation
// ============================================
// Zeigt einen Button, sobald ungeöffnete Packs im Inventar liegen. Klick
// öffnet ein Overlay mit Pack-Visual → Klick darauf löst /api/battle-cards/
// open-pack aus und spielt eine Reveal-Animation der gezogenen Karte.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Package, X, Lock, LockOpen } from "lucide-react";
import BattleCardView from "./BattleCardView";
import type { BattleCardData } from "./BattleCardView";

type Phase = "closed" | "ready" | "opening" | "revealed";

interface RevealedCard {
  card: BattleCardData;
  isNewCard: boolean;
  duplicates: number;
}

interface OpenPackResponse {
  cards: RevealedCard[];
  remainingUnopened: number;
}

export default function PackOpener({ initialUnopenedCount }: { initialUnopenedCount: number }) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("closed");
  const [remaining, setRemaining] = useState(initialUnopenedCount);
  const [results, setResults] = useState<RevealedCard[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  function startSession() {
    setPhase("ready");
  }

  async function openPack() {
    if (loading) return;
    setLoading(true);
    setPhase("opening");
    try {
      const res = await fetch("/api/battle-cards/open-pack", { method: "POST" });
      const data: OpenPackResponse & { error?: string } = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Pack konnte nicht geöffnet werden.");
        setPhase("ready");
        return;
      }
      // kurze Verzoegerung, damit die Oeffnen-Animation sichtbar bleibt
      await new Promise((r) => setTimeout(r, 900));
      setResults(data.cards);
      setRevealIndex(0);
      setRemaining(data.remainingUnopened);
      setPhase("revealed");
      const hasCommunity = data.cards.some((c) => c.card.rarity === "COMMUNITY");
      confetti({
        particleCount: hasCommunity ? 200 : 140,
        spread: 75,
        origin: { y: 0.5 },
        colors: hasCommunity
          ? ["#f59e0b", "#fbbf24", "#fde68a", "#ffffff"]
          : data.cards[0]?.isNewCard
            ? ["#8b5cf6", "#c4b5fd", "#ede9fe", "#ffffff"]
            : ["#f59e0b", "#fcd34d", "#ffffff"],
      });
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
      setPhase("ready");
    } finally {
      setLoading(false);
    }
  }

  function close() {
    setPhase("closed");
    setResults([]);
    setRevealIndex(0);
  }

  function openAnother() {
    setResults([]);
    setRevealIndex(0);
    setPhase("ready");
  }

  if (remaining <= 0 && phase === "closed") return null;

  return (
    <>
      <button
        type="button"
        onClick={startSession}
        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors"
      >
        <Package className="w-4 h-4" />
        {remaining} ungeöffnete Truhe{remaining === 1 ? "" : "n"}
      </button>

      <AnimatePresence>
        {phase !== "closed" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(5,5,8,0.88)" }}
          >
            <button
              type="button"
              onClick={close}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-300 transition-colors"
              aria-label="Schließen"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center gap-5 max-w-xs w-full" style={{ perspective: 1200 }}>
              {(phase === "ready" || phase === "opening") && (
                <motion.button
                  type="button"
                  onClick={openPack}
                  disabled={loading}
                  animate={
                    phase === "opening"
                      ? { rotate: [0, -4, 4, -4, 4, 0], scale: [1, 1.05, 1.05, 1.05, 1.05, 1.15] }
                      : { rotate: 0, scale: 1 }
                  }
                  transition={{ duration: 0.9, ease: "easeInOut" }}
                  className="relative w-40 h-56 rounded-xl flex flex-col items-center justify-center gap-3 cursor-pointer overflow-hidden"
                  style={{
                    background: "linear-gradient(160deg, #d97706 0%, #78350f 100%)",
                    boxShadow: "0 0 40px rgba(245,158,11,0.4), 0 8px 24px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  {/* Truhen-Deckel-Naht */}
                  <div className="absolute top-[38%] left-0 right-0 h-1.5 bg-black/25" />
                  <div className="absolute top-[38%] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-amber-900/60 border border-amber-950/50" />

                  {phase === "opening" ? (
                    <LockOpen className="w-10 h-10 text-amber-100 relative z-10" />
                  ) : (
                    <Lock className="w-10 h-10 text-amber-100 relative z-10" />
                  )}
                  <p className="text-sm font-bold text-white relative z-10">Kartentruhe</p>
                  <p className="text-[11px] text-amber-100/70 relative z-10">
                    {phase === "opening" ? "Wird geöffnet…" : "Antippen zum Öffnen"}
                  </p>
                </motion.button>
              )}

              {phase === "revealed" && results.length > 0 && (
                <motion.div
                  key={revealIndex}
                  initial={{ scale: 0.6, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="flex flex-col items-center gap-3"
                >
                  <BattleCardView card={results[revealIndex].card} />
                  {results.length > 1 && (
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                      Karte {revealIndex + 1}/{results.length}
                    </p>
                  )}
                  <p className="text-xs text-gray-400">
                    {results[revealIndex].card.rarity === "COMMUNITY"
                      ? "🎉 Community-Karte!"
                      : results[revealIndex].isNewCard
                        ? "Neue Karte für deine Sammlung!"
                        : `Duplikat — jetzt ${results[revealIndex].duplicates}x`}
                  </p>
                  <div className="flex gap-2">
                    {revealIndex < results.length - 1 ? (
                      <button
                        type="button"
                        onClick={() => setRevealIndex((i) => i + 1)}
                        className="text-xs font-semibold px-3 py-2 rounded-md bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 transition-colors"
                      >
                        Nächste Karte
                      </button>
                    ) : (
                      <>
                        {remaining > 0 && (
                          <button
                            type="button"
                            onClick={openAnother}
                            className="text-xs font-semibold px-3 py-2 rounded-md bg-violet-500/15 text-violet-300 hover:bg-violet-500/25 transition-colors"
                          >
                            Nächste Truhe öffnen ({remaining})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={close}
                          className="text-xs font-semibold px-3 py-2 rounded-md bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] transition-colors"
                        >
                          Fertig
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
