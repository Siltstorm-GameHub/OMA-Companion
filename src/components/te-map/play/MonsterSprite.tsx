"use client";

// ============================================
// OMA Quest — Pixel-Monster: Ruhe-Animation, Angriffs-Animation, Zucken bei Treffern
// ============================================
// Ändert sich `attackKey` (Id des letzten Monster-Angriffs), spielt das Monster seine Angriffsanimation einmal ab (sofern das Paket eine hat) und
// macht einen Ausfallschritt in Richtung der Helden; danach läuft wieder die Ruhe-Animation. Ändert sich `hitKey`, zuckt es (getroffen).
// Ohne Pixel-Grafik erscheint das Emoji. `flip` dreht das Monster nach links, damit es die Helden auf der Bühne ansieht.

import { spriteInfo, spriteKeyOf, spriteScale } from "@/lib/dnd/oq-monster";
import { getMonster } from "@/lib/dnd/combat";

const FPS = 12;
const ATTACK_MAX_MS = 950;

export default function MonsterSprite({ monsterId, box = 88, hitKey, attackKey, flip = false }: { monsterId: string; box?: number; hitKey?: number; attackKey?: number; flip?: boolean }) {
  const key = spriteKeyOf(monsterId);
  if (!key) return <span className={`inline-block text-5xl leading-none ${attackKey ? (flip ? "oq-lunge-l" : "oq-lunge") : ""}`} key={attackKey ?? 0} role="img" aria-label={getMonster(monsterId)?.name}>{getMonster(monsterId)?.emoji ?? "👾"}</span>;
  const s = spriteInfo(key);
  const sc = spriteScale(key, box, 0.5, 2.5);
  const w = Math.round(s.w * sc);
  const h = Math.round(s.h * sc);
  const atk = "atk" in s ? s.atk : undefined;
  const aw = atk ? Math.round(atk.w * sc) : 0;
  const ah = atk ? Math.round(atk.h * sc) : 0;
  const boxW = Math.max(w, aw);
  const boxH = Math.max(h, ah);
  const atkMs = atk ? Math.min(ATTACK_MAX_MS, Math.round((atk.frames / 15) * 1000)) : 0;
  const attacking = !!attackKey;
  return (
    <span key={hitKey ?? 0} className={`inline-block ${hitKey ? "oq-shake" : ""}`} style={{ width: boxW, height: boxH }} role="img" aria-label={getMonster(monsterId)?.name}>
      <span className="block relative" style={{ width: boxW, height: boxH, transform: flip ? "scaleX(-1)" : undefined }}>
        <span key={`a${attackKey ?? 0}`} className={`block relative ${attacking ? "oq-lunge" : ""}`} style={{ width: boxW, height: boxH }}>
          {/* Ruhe-Animation (während des Angriffs ausgeblendet) */}
          <span
            className="oq-mon absolute bottom-0 left-1/2"
            style={{
              width: w, height: h, marginLeft: -w / 2, backgroundImage: `url(/oq/mon/${key}.png)`, backgroundSize: `${s.frames * w}px ${h}px`,
              animation: `oq-fx-play ${Math.round((s.frames / FPS) * 1000)}ms steps(${s.frames}) infinite${attacking && atk ? `, oq-hide-during ${atkMs}ms linear 1` : ""}`,
              ["--fx-w" as string]: `${s.frames * w}px`,
            }}
          />
          {attacking && atk && (
            <span
              className="oq-mon absolute bottom-0 left-1/2"
              style={{
                width: aw, height: ah, marginLeft: -aw / 2, backgroundImage: `url(/oq/mon/${key}-atk.png)`, backgroundSize: `${atk.frames * aw}px ${ah}px`,
                animation: `oq-fx-play ${atkMs}ms steps(${atk.frames}) 1 forwards, oq-fx-out 120ms linear ${Math.max(0, atkMs - 60)}ms forwards`,
                ["--fx-w" as string]: `${atk.frames * aw}px`,
              }}
            />
          )}
        </span>
      </span>
    </span>
  );
}
