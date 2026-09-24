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
import { Sparkles } from "lucide-react";
import { X, ScissorsLineDashed } from "@/components/icons";
import { MOBA_ICON } from "@/lib/battle-cards/moba-icons";
import BattleCardView from "./BattleCardView";
import type { BattleCardData } from "./BattleCardView";
import { playCardRevealSound, playRarePullSound } from "@/lib/battle-cards/sound";
import { PACK_CLIP_PATH, PACK_TEXTURE, PackCoverArt, type PackVisualKind } from "./pack-visuals";

type Phase = "closed" | "ready" | "opening" | "revealed";

interface RevealedTacticCard {
  id: string;
  name: string;
  kind: "INSTANT" | "TRAP";
  flavorText: string;
  description: string;
  imageUrl?: string | null;
}

type RevealedItem =
  | { itemKind: "card"; card: BattleCardData; isNewCard: boolean; duplicates: number }
  | { itemKind: "tactic"; tacticCard: RevealedTacticCard; isNewCard: boolean; duplicates: number };

function imageUrlOf(item: RevealedItem): string | null | undefined {
  return item.itemKind === "card" ? item.card.imageUrl : item.tacticCard.imageUrl;
}

interface OpenPackResponse {
  cards: RevealedItem[];
  remainingUnopened: number;
  kind: PackVisualKind;
  nextKind: PackVisualKind | null;
}

/** Einfache Reveal-Kachel für Taktik-Karten (Items/Fallen) — bewusst schlichter
 *  als BattleCardView, das auf Helden-Stats (Klasse/HP/Angriff/...) zugeschnitten
 *  ist und für Taktik-Karten nicht passt. */
function TacticCardReveal({ tacticCard }: { tacticCard: RevealedTacticCard }) {
  const iconSrc = tacticCard.kind === "TRAP" ? MOBA_ICON.shield : MOBA_ICON.attack;
  const accent = tacticCard.kind === "TRAP" ? "#f43f5e" : "#f59e0b";
  return (
    <div
      className="w-full max-w-[240px] rounded-2xl p-5 space-y-2 text-center"
      style={{
        background: `linear-gradient(160deg, ${accent}22, rgba(12,12,16,0.92))`,
        boxShadow: `0 0 0 1.5px ${accent}88, 0 8px 24px rgba(0,0,0,0.5)`,
      }}
    >
      <img src={iconSrc} alt="" aria-hidden className="w-8 h-8 mx-auto object-contain" />
      <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: accent }}>
        {tacticCard.kind === "TRAP" ? "Falle" : "Item"}
      </p>
      <p className="text-sm font-black text-white">{tacticCard.name}</p>
      <p className="text-[11px] text-gray-400 italic">{tacticCard.flavorText}</p>
      <p className="text-[11px] text-gray-300">{tacticCard.description}</p>
    </div>
  );
}

const PACK_BODY_HEIGHT = 240; // px — muss zur h-60-Klasse des Pack-Körpers passen

export default function PackOpener({
  initialUnopenedCount,
  initialNextPackKind,
}: {
  initialUnopenedCount: number;
  initialNextPackKind: PackVisualKind | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("closed");
  const [remaining, setRemaining] = useState(initialUnopenedCount);
  const [nextKind, setNextKind] = useState<PackVisualKind | null>(initialNextPackKind);
  const [results, setResults] = useState<RevealedItem[]>([]);
  const [revealIndex, setRevealIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const displayKind = nextKind ?? "STANDARD";

  function startSession() {
    setPhase("ready");
  }

  function playRevealSoundFor(item: RevealedItem) {
    if (item.itemKind === "card" && item.card.rarity === "COMMUNITY") playRarePullSound();
    else playCardRevealSound();
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
      // Alle Kartenbilder JETZT schon im Hintergrund vorladen (nicht erst, wenn
      // React die jeweilige Karte anzeigt) — sonst konkurriert der Bild-Download
      // der ersten Karte mit router.refresh()/Konfetti um Bandbreite, während
      // spätere Karten (Netz dann frei) prompt laden. Browser cachen das Ergebnis,
      // sodass die <img>-Tags in BattleCardView es beim Anzeigen sofort parat haben.
      data.cards.forEach((c) => {
        const url = imageUrlOf(c);
        if (url) {
          const preload = new window.Image();
          preload.src = url;
        }
      });
      // kurze Verzoegerung, damit die Oeffnen-Animation sichtbar bleibt — gibt den
      // Vorlade-Downloads oben gleichzeitig einen Kopfstart.
      await new Promise((r) => setTimeout(r, 900));
      setResults(data.cards);
      setRevealIndex(0);
      setRemaining(data.remainingUnopened);
      setNextKind(data.nextKind);
      setPhase("revealed");
      if (data.cards[0]) playRevealSoundFor(data.cards[0]);
      const hasCommunity = data.cards.some((c) => c.itemKind === "card" && c.card.rarity === "COMMUNITY");
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

  // Bis zu 3 sichtbare Lagen im Stapel — jede weiter hinten liegende Karte
  // ist leicht versetzt/rotiert, damit klar ist, dass noch mehr dahinterliegen.
  // Die genaue Anzahl steht zusätzlich im Zähler-Badge.
  const stackDepth = Math.min(remaining, 3);

  return (
    <>
      <div className="flex flex-col items-center gap-2 py-2">
        <motion.button
          type="button"
          onClick={startSession}
          whileTap={{ scale: 0.97 }}
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          className="relative cursor-pointer"
          style={{ width: 184, height: 258 }}
        >
          {Array.from({ length: stackDepth }, (_, i) => stackDepth - 1 - i).map((depth) => (
            <motion.div
              key={depth}
              className="absolute inset-0"
              animate={{
                x: depth * 8,
                y: depth * 8,
                rotate: depth * -3,
                boxShadow:
                  depth === 0
                    ? [
                        "0 10px 26px rgba(0,0,0,0.55), 0 0 0px rgba(245,158,11,0)",
                        "0 10px 34px rgba(0,0,0,0.55), 0 0 34px rgba(245,158,11,0.55)",
                        "0 10px 26px rgba(0,0,0,0.55), 0 0 0px rgba(245,158,11,0)",
                      ]
                    : "0 6px 16px rgba(0,0,0,0.45)",
              }}
              transition={depth === 0 ? { boxShadow: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } } : undefined}
            >
              <PackCoverArt kind={displayKind} cropped className="w-full h-full" />
            </motion.div>
          ))}

          {remaining > 1 && (
            <div
              className="absolute -top-2 -right-2 z-10 min-w-[26px] h-[26px] px-1.5 rounded-full flex items-center justify-center text-[12px] font-black text-black"
              style={{ background: "#fbbf24", boxShadow: "0 2px 6px rgba(0,0,0,0.5), 0 0 0 2px rgba(5,5,8,0.9)" }}
            >
              {remaining}
            </div>
          )}
        </motion.button>

        <p className="text-sm font-bold text-white">
          {remaining} ungeöffnete{remaining === 1 ? "s" : ""} Kartenpack{remaining === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-gray-500">Antippen zum Öffnen</p>
      </div>

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
                <button
                  type="button"
                  onClick={openPack}
                  disabled={loading}
                  className="relative w-40 h-60 cursor-pointer"
                  style={{ perspective: 800 }}
                >
                  {/* Glanzlicht-Blitz im Riss-Moment */}
                  <motion.div
                    className="absolute inset-0 rounded-md bg-white pointer-events-none z-30"
                    initial={{ opacity: 0 }}
                    animate={phase === "opening" ? { opacity: [0, 0, 0.85, 0] } : { opacity: 0 }}
                    transition={{ duration: 0.9, times: [0, 0.5, 0.58, 1] }}
                  />

                  {/* Abgerissener Kopfstreifen — zeigt den oberen Ausschnitt derselben
                      Pack-Textur wie der Körper darunter, damit es vor dem Riss wie
                      ein durchgehendes Pack aussieht. */}
                  <motion.div
                    className="absolute top-0 inset-x-0 h-10 z-20 overflow-hidden"
                    style={{ clipPath: PACK_CLIP_PATH, boxShadow: "0 2px 6px rgba(0,0,0,0.35)" }}
                    animate={
                      phase === "opening"
                        ? { y: -90, rotate: -28, opacity: 0 }
                        : { y: 0, rotate: 0, opacity: 1 }
                    }
                    transition={{ duration: 0.7, ease: "easeIn" }}
                  >
                    <img
                      src={PACK_TEXTURE[displayKind]}
                      alt=""
                      className="absolute inset-x-0 top-0 w-full object-cover"
                      style={{ height: PACK_BODY_HEIGHT }}
                    />
                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute inset-0 flex items-center justify-center gap-1">
                      <ScissorsLineDashed className="w-3 h-3 text-white/70" />
                      <span className="text-[8px] font-bold uppercase tracking-[0.15em] text-white/70">Hier aufreißen</span>
                    </div>
                  </motion.div>

                  {/* Pack-Körper — Sortentypische Foil-Textur + Logo/Schriftzug */}
                  <motion.div
                    className="absolute inset-0"
                    style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.6), inset 0 2px 0 rgba(255,255,255,0.2)" }}
                    animate={
                      phase === "opening"
                        ? { scaleY: [1, 0.96, 1.04, 1], scaleX: [1, 1.03, 0.98, 1] }
                        : { scale: 1 }
                    }
                    transition={phase === "opening" ? { duration: 0.9, ease: "easeInOut" } : undefined}
                  >
                    <PackCoverArt kind={displayKind} cropped className="w-full h-full" />
                  </motion.div>

                  <p className="absolute -bottom-7 inset-x-0 text-[11px] text-amber-100/70 text-center">
                    {phase === "opening" ? "Wird aufgerissen…" : "Antippen zum Aufreißen"}
                  </p>
                </button>
              )}

              {phase === "revealed" && results.length > 0 && (() => {
                const current = results[revealIndex];
                const isCommunity = current.itemKind === "card" && current.card.rarity === "COMMUNITY";
                return (
                <motion.div
                  key={revealIndex}
                  initial={{ scale: 0.6, opacity: 0, rotateY: 90 }}
                  animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 18 }}
                  className="flex flex-col items-center gap-3"
                >
                  <div className="relative w-full max-w-[240px]">
                    {isCommunity && (
                      <div
                        className="absolute -inset-5 -z-10 rounded-full pointer-events-none"
                        style={{ background: "radial-gradient(closest-side, rgba(245,158,11,0.4), transparent 72%)" }}
                      />
                    )}
                    {current.itemKind === "card" ? (
                      <BattleCardView card={current.card} />
                    ) : (
                      <TacticCardReveal tacticCard={current.tacticCard} />
                    )}
                  </div>
                  {results.length > 1 && (
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">
                      Karte {revealIndex + 1}/{results.length}
                    </p>
                  )}
                  {isCommunity ? (
                    <p className="flex items-center gap-1.5 text-sm font-black uppercase tracking-wide" style={{ color: "#fbbf24" }}>
                      <Sparkles className="w-4 h-4" /> Community-Karte! <Sparkles className="w-4 h-4" />
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      {current.isNewCard
                        ? current.itemKind === "tactic"
                          ? "Neue Taktik-Karte für dein Duell-Deck!"
                          : "Neue Karte für deine Sammlung!"
                        : `Duplikat — jetzt ${current.duplicates}x`}
                    </p>
                  )}
                  <div className="flex gap-2">
                    {revealIndex < results.length - 1 ? (
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const next = revealIndex + 1;
                          setRevealIndex(next);
                          playRevealSoundFor(results[next]);
                        }}
                        className="moba-pill normal-case font-semibold px-3 py-2 moba-tab-active"
                      >
                        Nächste Karte
                      </motion.button>
                    ) : (
                      <>
                        {remaining > 0 && (
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.95 }}
                            onClick={openAnother}
                            className="moba-pill normal-case font-semibold px-3 py-2 moba-tab-active"
                          >
                            Nächstes Pack öffnen ({remaining})
                          </motion.button>
                        )}
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.95 }}
                          onClick={close}
                          className="moba-pill normal-case font-semibold px-3 py-2 hover:bg-white/[0.06] transition-colors"
                        >
                          Fertig
                        </motion.button>
                      </>
                    )}
                  </div>
                </motion.div>
                );
              })()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
