"use client";

// ============================================
// OMA Gems PvP: Sieges-Kiste — Rubbellos-Animation direkt nach dem Sieg
// ============================================
// Überlagert den Kampf-Bildschirm, sobald ein Gems-PvP-Kampf gewonnen wurde
// und eine Kiste dabei ist (siehe chestPrize in LiveBattleSnapshot). Der
// Gewinn (prize) steht serverseitig bereits fest — die Gewichtung aus
// CHEST_TABLE (gems-pvp.ts) wird hier NICHT verändert. Die Rubbelkarte ist
// rein kosmetisch: von 9 Feldern zeigen genau 3 das tatsächliche Gewinn-
// Symbol, die übrigen 6 verteilen sich zu je 2 auf die drei anderen
// möglichen Preise, sodass niemals ein falsches Symbol 3× auftauchen kann.
// Jeder mögliche Gewinn hat eine fest zugeordnete Hintergrundfarbe, die erst
// nach dem Aufrubbeln sichtbar wird — so ist auf einen Blick erkennbar,
// welches Feld welchen Gewinn zeigt. Sobald 3 gleiche Felder freigelegt
// sind, geht es in den bekannten Reveal-Screen über, der per "Einsammeln"
// den normalen Kampf-Ende-Screen freigibt.

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import confetti from "canvas-confetti";
import { Sparkles } from "lucide-react";
import { Gift } from "@/components/icons";
import CoinIcon from "@/components/CoinIcon";

export type ChestPrize = { kind: "coins"; amount: number } | { kind: "pack"; packKind: string };

const PACK_LABEL: Record<string, string> = { STANDARD: "Standard-Pack", PREMIUM: "Premium-Pack", COMMUNITY: "Community-Pack" };
const PACK_LABEL_SHORT: Record<string, string> = { STANDARD: "Standard", PREMIUM: "Premium", COMMUNITY: "Community" };

function prizeSymbolId(p: ChestPrize): string {
  return p.kind === "coins" ? `coins-${p.amount}` : `pack-${p.packKind}`;
}

// Die vier möglichen Preise aus CHEST_TABLE (gems-pvp.ts) — rein für die
// Rubbelkarten-Darstellung, beeinflusst nicht, welcher Preis tatsächlich
// gewonnen wurde.
const CANDIDATE_PRIZES: ChestPrize[] = [
  { kind: "coins", amount: 250 },
  { kind: "coins", amount: 500 },
  { kind: "pack", packKind: "STANDARD" },
  { kind: "pack", packKind: "PREMIUM" },
];

// Jeder Gewinn bekommt eine eigene, fest zugeordnete Farbe — wird erst nach
// dem Aufrubbeln sichtbar, liegt hinter Icon/Beschriftung. Bronze/Gold für
// die zwei Münz-Beträge, Marken-Teal/-Maroon (aus dem OMA-Logo) für die
// zwei Pack-Sorten, damit alle vier auf einen Blick unterscheidbar sind.
const PRIZE_COLOR: Record<string, { bg: string; glow: string; text: string }> = {
  "coins-250": { bg: "linear-gradient(160deg, #c2762f 0%, #8a4a13 100%)", glow: "rgba(194,118,47,0.55)", text: "#fff" },
  "coins-500": { bg: "linear-gradient(160deg, #fde047 0%, #ca8a04 100%)", glow: "rgba(250,204,21,0.6)", text: "#3f2d00" },
  "pack-STANDARD": { bg: "linear-gradient(160deg, #2dd4bf 0%, #0f766e 100%)", glow: "rgba(45,212,191,0.55)", text: "#fff" },
  "pack-PREMIUM": { bg: "linear-gradient(160deg, #b91c1c 0%, #7f1d1d 100%)", glow: "rgba(185,28,28,0.55)", text: "#fff" },
};
const DEFAULT_PRIZE_COLOR = { bg: "linear-gradient(160deg, #fde68a 0%, #b45309 100%)", glow: "rgba(251,191,36,0.55)", text: "#fff" };

function colorFor(id: string) {
  return PRIZE_COLOR[id] ?? DEFAULT_PRIZE_COLOR;
}

function buildScratchGrid(prize: ChestPrize): ChestPrize[] {
  const winId = prizeSymbolId(prize);
  const decoys = CANDIDATE_PRIZES.filter((p) => prizeSymbolId(p) !== winId);
  while (decoys.length < 3) decoys.push(decoys[decoys.length % Math.max(decoys.length, 1)] ?? prize);

  const cells: ChestPrize[] = [prize, prize, prize, decoys[0], decoys[0], decoys[1], decoys[1], decoys[2], decoys[2]];
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells;
}

function ScratchCellContent({ prize }: { prize: ChestPrize }) {
  const color = colorFor(prizeSymbolId(prize));
  if (prize.kind === "coins") {
    return (
      <>
        <CoinIcon size={20} />
        <span className="text-[11px] font-black mt-0.5" style={{ color: color.text }}>
          {prize.amount}
        </span>
      </>
    );
  }
  return (
    <>
      <Gift className="w-5 h-5" style={{ color: color.text }} strokeWidth={1.8} />
      <span className="text-[9px] font-black mt-0.5 text-center leading-none" style={{ color: color.text }}>
        {PACK_LABEL_SHORT[prize.packKind] ?? prize.packKind}
      </span>
    </>
  );
}

function ScratchChest({ prize, onMatched }: { prize: ChestPrize; onMatched: () => void }) {
  const [grid] = useState(() => buildScratchGrid(prize));
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [winSymbolId, setWinSymbolId] = useState<string | null>(null);

  function scratchCell(index: number) {
    if (revealed.has(index) || winSymbolId) return;
    const next = new Set(revealed);
    next.add(index);
    setRevealed(next);

    const counts = new Map<string, number>();
    next.forEach((i) => {
      const id = prizeSymbolId(grid[i]);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    });
    const matchId = [...counts.entries()].find(([, c]) => c >= 3)?.[0];
    if (matchId) {
      setWinSymbolId(matchId);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.45 },
        colors: ["#fbbf24", "#fde68a", "#d97706", "#ffffff"],
      });
      setTimeout(onMatched, 900);
    }
  }

  return (
    <motion.div
      key="scratch"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative flex flex-col items-center gap-3 rounded-2xl px-5 pt-5 pb-6"
      style={{
        background: "linear-gradient(165deg, #f4f1ea 0%, #ded6c2 100%)",
        border: "2px dashed rgba(0,0,0,0.25)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Lochung wie bei einem echten Los — links/rechts ausgestanzte Kerben */}
      <div
        className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-5 h-5 rounded-full"
        style={{ background: "#050508" }}
      />
      <div
        className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-5 h-5 rounded-full"
        style={{ background: "#050508" }}
      />

      <div className="flex flex-col items-center gap-1">
        <img src="/brand/logo-64.png" alt="OMA" className="w-10 h-10" />
        <p className="text-sm font-black uppercase tracking-wide text-stone-900">Battle Cards</p>
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-amber-700">Sieges-Rubbellos</p>
      </div>

      <p className="text-[11px] text-stone-600 font-semibold text-center">Rubbel 3 gleiche Felder frei!</p>

      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl" style={{ background: "rgba(0,0,0,0.08)" }}>
        {grid.map((cellPrize, i) => {
          const isRevealed = revealed.has(i);
          const symbolId = prizeSymbolId(cellPrize);
          const isWinningCell = winSymbolId !== null && symbolId === winSymbolId;
          const color = colorFor(symbolId);
          return (
            <motion.button
              key={i}
              type="button"
              disabled={winSymbolId !== null}
              onClick={() => scratchCell(i)}
              whileTap={isRevealed ? undefined : { scale: 0.9 }}
              animate={isWinningCell ? { scale: [1, 1.08, 1] } : undefined}
              transition={isWinningCell ? { duration: 0.5, repeat: 2 } : undefined}
              className="relative w-16 h-16 rounded-lg flex flex-col items-center justify-center overflow-hidden"
              style={{
                background: isRevealed
                  ? color.bg
                  : "repeating-linear-gradient(135deg, #b6bec9 0 4px, #8b95a3 4px 8px)",
                boxShadow: isWinningCell
                  ? `0 0 0 2px rgba(251,191,36,0.9), 0 0 16px ${color.glow}`
                  : isRevealed
                    ? `inset 0 2px 0 rgba(255,255,255,0.3), 0 0 10px ${color.glow}`
                    : "inset 0 2px 0 rgba(255,255,255,0.4), inset 0 -2px 0 rgba(0,0,0,0.25)",
              }}
            >
              <AnimatePresence mode="wait">
                {isRevealed ? (
                  <motion.div
                    key="revealed"
                    initial={{ rotateY: 90, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    transition={{ duration: 0.25 }}
                    className="flex flex-col items-center justify-center"
                  >
                    <ScratchCellContent prize={cellPrize} />
                  </motion.div>
                ) : (
                  <motion.div key="hidden" exit={{ opacity: 0 }} className="flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-slate-100/80" strokeWidth={1.8} />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function VictoryChestReveal({ prize, onClose }: { prize: ChestPrize; onClose: () => void }) {
  const [opened, setOpened] = useState(false);

  function openChest() {
    setOpened(true);
    confetti({
      particleCount: 160,
      spread: 80,
      origin: { y: 0.45 },
      colors: ["#fbbf24", "#fde68a", "#d97706", "#ffffff"],
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm px-6"
    >
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <AnimatePresence mode="wait">
          {!opened ? (
            <ScratchChest key="scratch-wrap" prize={prize} onMatched={openChest} />
          ) : (
            <motion.div
              key="opened"
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="relative w-24 h-24 rounded-2xl flex items-center justify-center"
                initial={{ scale: 0.4, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
                style={{
                  background: colorFor(prizeSymbolId(prize)).bg,
                  boxShadow: `0 0 0 3px rgba(251,191,36,0.4), 0 8px 24px rgba(0,0,0,0.5), 0 0 60px ${colorFor(prizeSymbolId(prize)).glow}`,
                }}
              >
                {/* Lichtstrahlen-Burst hinterm Preis */}
                <motion.div
                  className="absolute -inset-8 -z-10 rounded-full pointer-events-none"
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: [0, 0.7, 0], scale: 1.4 }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  style={{ background: `radial-gradient(closest-side, ${colorFor(prizeSymbolId(prize)).glow}, transparent 70%)` }}
                />
                <motion.div
                  initial={{ scale: 0, rotate: -90 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.15, type: "spring", stiffness: 300 }}
                  className="absolute -top-1.5 -right-1.5"
                >
                  <Sparkles className="w-5 h-5 text-white" />
                </motion.div>
                {prize.kind === "coins" ? (
                  <CoinIcon size={44} />
                ) : (
                  <Gift className="w-12 h-12" style={{ color: colorFor(prizeSymbolId(prize)).text }} strokeWidth={1.8} />
                )}
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 8, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 280, damping: 18 }}
                className="font-battle text-lg text-white uppercase tracking-wide"
              >
                {prize.kind === "coins" ? `+${prize.amount} Münzen` : PACK_LABEL[prize.packKind] ?? prize.packKind}
              </motion.p>
              <motion.button
                type="button"
                onClick={onClose}
                whileTap={{ scale: 0.95, y: 1 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="px-5 py-2.5 rounded-xl text-black text-sm font-black uppercase tracking-wide"
                style={{
                  background: "linear-gradient(180deg, #fde68a 0%, #d97706 100%)",
                  boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.35), inset 0 -2px 0 rgba(0,0,0,0.15), 0 3px 0 #78350f",
                }}
              >
                Einsammeln
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
