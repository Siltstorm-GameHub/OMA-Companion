"use client";

// ============================================
// OMA Quest — Pixel-Monster als Ruhe-Animation (Ersatz für das Emoji), mit kurzem Zucken bei Treffern
// ============================================

import { spriteInfo, spriteKeyOf, spriteScale } from "@/lib/dnd/oq-monster";
import { getMonster } from "@/lib/dnd/combat";

const FPS = 12;

/** `hitKey` ändern (z. B. Id des letzten Effekts) löst ein kurzes Zucken aus. Ohne Pixel-Grafik erscheint das Emoji. */
export default function MonsterSprite({ monsterId, box = 88, hitKey }: { monsterId: string; box?: number; hitKey?: number }) {
  const key = spriteKeyOf(monsterId);
  if (!key) return <span className="text-5xl leading-none" role="img" aria-label={getMonster(monsterId)?.name}>{getMonster(monsterId)?.emoji ?? "👾"}</span>;
  const s = spriteInfo(key);
  const sc = spriteScale(key, box, 0.5, 2.5);
  const w = Math.round(s.w * sc);
  const h = Math.round(s.h * sc);
  return (
    <span key={hitKey ?? 0} className={`inline-block ${hitKey ? "oq-shake" : ""}`} style={{ width: w, height: h }} role="img" aria-label={getMonster(monsterId)?.name}>
      <span
        className="oq-mon block"
        style={{
          width: w, height: h, backgroundImage: `url(/oq/mon/${key}.png)`, backgroundSize: `${s.frames * w}px ${h}px`,
          animation: `oq-fx-play ${Math.round((s.frames / FPS) * 1000)}ms steps(${s.frames}) infinite`,
          ["--fx-w" as string]: `${s.frames * w}px`,
        }}
      />
    </span>
  );
}
