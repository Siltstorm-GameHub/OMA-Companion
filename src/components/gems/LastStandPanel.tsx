"use client";

// ============================================
// OMA Gems — Last Stand (Wellenmodus), Panel im Spielen-Reiter
// ============================================
// Fünf Gegner nach dem anderen, bis die eigenen Helden gefallen sind (siehe lib/gems/wave-levels.ts).
// Zeigt die Regeln, die Bestleistung der Saison und startet den Lauf; die Rangliste kommt vom Hub.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import CoinIcon from "@/components/CoinIcon";
import { Lock, Play, Swords, Trophy } from "@/components/icons";
import type { GemsPlayStatus } from "@/lib/gems/play-status";
import { startGemsBattle } from "@/lib/gems/start-battle-client";
import ErrorNotice from "./ErrorNotice";

/** Kampagnen-Level, nach dem Last Stand öffnet (siehe LAST_STAND_UNLOCK_LEVEL_ID in campaign.ts). */
const UNLOCK_LEVEL = 12;

export default function LastStandPanel({
  status,
  seasonLabel,
  seasonDaysLeft,
  coinsPerWave,
}: {
  status: GemsPlayStatus["lastStand"];
  seasonLabel: string;
  seasonDaysLeft: number;
  coinsPerWave: number;
}) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const id = await startGemsBattle({ kind: "lastStand" });
      router.push(`/gems/live/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
      setStarting(false);
    }
  }

  if (!status.unlocked) {
    return (
      <p className="glass rounded-2xl px-4 py-4 text-xs text-gray-400 flex items-start gap-2">
        <Lock className="w-4 h-4 shrink-0 mt-px" />
        <span>
          Schaffe Level {UNLOCK_LEVEL} der Kampagne, um Last Stand zu öffnen: ein Wellenmodus, in dem immer neue Gegner
          nachrücken — wie weit hältst du durch?
        </span>
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="glass-heavy rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-xl bg-teal-500/15 ring-1 ring-teal-500/25 flex items-center justify-center shrink-0">
            <Swords className="w-5 h-5 text-teal-300" />
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-xl font-bold text-white">Last Stand</h2>
            <p className="text-xs text-gray-400 mt-0.5">Besiege Welle um Welle — bis dein Team gefallen ist.</p>
          </div>
        </div>

        <ul className="space-y-1.5 text-xs text-gray-300">
          <li>• Sind die fünf Gegner besiegt, rücken fünf neue nach — jede 5. Welle führt ein Boss an.</li>
          <li>• Dein Team behält sein Leben. Nach jeder Welle erholen sich lebende Helden um 20 %, gefallene bleiben liegen.</li>
          <li>• Es zählt, wie viele Wellen du besiegst. Jeden Monat beginnt eine neue Saison, die Besten bekommen Packs.</li>
          <li className="flex items-center gap-1">
            • Für jede in der Saison neu erreichte Welle gibt es {coinsPerWave} <CoinIcon size={11} />.
          </li>
        </ul>

        <Button
          onClick={start}
          loading={starting}
          disabled={starting}
          icon={<Play className="w-4 h-4" />}
          className="w-full rounded-xl py-3 text-base"
        >
          Last Stand starten
        </Button>

        <p className="flex items-center gap-1.5 text-xs text-gray-300 border-t border-white/[0.06] pt-3">
          <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>
            Saison {seasonLabel} · noch {seasonDaysLeft} {seasonDaysLeft === 1 ? "Tag" : "Tage"}
            {status.rank
              ? ` · Platz ${status.rank} von ${status.players} (${status.best} ${status.best === 1 ? "Welle" : "Wellen"})`
              : " · noch keine Welle besiegt"}
          </span>
        </p>
      </div>
      {error && <ErrorNotice message={error} />}
    </div>
  );
}
