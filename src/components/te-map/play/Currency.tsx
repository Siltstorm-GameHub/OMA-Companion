"use client";

// ============================================
// OMA Quest — Währungen: Gold (im Spiel) und Münzen (App)
// ============================================
// Münzen sind dieselben Münzen wie im Rest der App und tragen dasselbe Symbol (CoinIcon); Gold hat ein eigenes Zeichen (Goldbarren),
// damit man beide nicht verwechselt.

import CoinIcon from "@/components/CoinIcon";

export function GoldIcon({ size = 14, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={`inline-block shrink-0 ${className}`} role="img" aria-label="Gold">
      <polygon points="3,17 8,10 16,10 21,17" fill="#f2bd49" stroke="#7a5410" strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="3,17 21,17 21,20 3,20" fill="#c48a1a" stroke="#7a5410" strokeWidth="1.4" strokeLinejoin="round" />
      <polygon points="8,10 16,10 14.5,7 9.5,7" fill="#ffe08a" stroke="#7a5410" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

/** Gold im Spiel: „🟨 25". */
export function Gold({ n, size = 14, className = "" }: { n: number | string; size?: number; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}><GoldIcon size={size} />{n}</span>;
}

/** OMA-Münzen der App mit dem App-Symbol. */
export function Coins({ n, size = 14, className = "" }: { n: number | string; size?: number; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap ${className}`}><CoinIcon size={size} />{n}</span>;
}
