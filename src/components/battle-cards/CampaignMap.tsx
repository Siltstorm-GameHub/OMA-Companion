"use client";

// ============================================
// Kampagnen-Karte — "Edelstein-Kampf"-Kampagne
// ============================================
// Winding-Path-Level-Übersicht (Candy-Crush-artig): jedes Level ist ein
// Knoten mit Nummer, Namen, humorvollem Untertitel und (nach Abschluss) 1-3
// Sternen. Gesperrte Level sind ausgegraut, Boss-Level optisch abgesetzt.
// Ein Klick auf ein freigeschaltetes Level startet den Kampf (LiveBattleView,
// wie bei den anderen Launchern) — nach dem Verlassen wird die Karte über
// GET /api/battle-cards/campaign neu geladen, damit neue Sterne/Freischaltungen
// sofort sichtbar sind.

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Lock, Star, Swords, Crown, Loader2 } from "lucide-react";
import LiveBattleView from "./LiveBattleView";
import CoinIcon from "@/components/CoinIcon";

export interface CampaignBoardLevel {
  id: string;
  order: number;
  name: string;
  tagline: string;
  isBoss: boolean;
  stars: number;
  completed: boolean;
  unlocked: boolean;
}

// Leichter Zickzack-Versatz je Knoten, für das "gewundene Pfad"-Gefühl einer
// Kampagnen-Karte — rein optisch, keine funktionale Bedeutung.
const ZIGZAG_OFFSETS = [0, 34, 54, 34, 0, -34, -54, -34];

function offsetFor(index: number): number {
  return ZIGZAG_OFFSETS[index % ZIGZAG_OFFSETS.length];
}

function StarRow({ stars, size = 12 }: { stars: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3].map((n) => (
        <Star
          key={n}
          width={size}
          height={size}
          className={n <= stars ? "text-amber-400" : "text-gray-700"}
          fill={n <= stars ? "currentColor" : "none"}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}

function LevelNode({ level, index, onSelect }: { level: CampaignBoardLevel; index: number; onSelect: () => void }) {
  const locked = !level.unlocked;
  const accent = level.isBoss ? "#f43f5e" : level.completed ? "#34d399" : "#60a5fa";

  return (
    <div className="flex flex-col items-center" style={{ transform: `translateX(${offsetFor(index)}px)` }}>
      <button
        type="button"
        onClick={onSelect}
        disabled={locked}
        className="relative flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
          style={{
            background: locked
              ? "linear-gradient(180deg, #2a2f3a 0%, #1a1d24 100%)"
              : `radial-gradient(circle at 35% 28%, ${accent}, ${accent}99)`,
            boxShadow: locked
              ? "inset 0 2px 0 rgba(255,255,255,0.04), 0 4px 0 rgba(0,0,0,0.35)"
              : `inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -3px 0 rgba(0,0,0,0.2), 0 4px 0 ${accent}66, 0 8px 18px ${accent}55`,
          }}
        >
          {locked ? (
            <Lock className="w-6 h-6 text-gray-600" />
          ) : level.isBoss ? (
            <Crown className="w-7 h-7 text-white" strokeWidth={2.2} />
          ) : (
            <span className="text-lg font-black text-white">{level.order}</span>
          )}
        </div>
        {!locked && <StarRow stars={level.stars} />}
      </button>
      <div className="mt-1 text-center max-w-[140px]">
        <p className={`text-xs font-bold ${locked ? "text-gray-600" : "text-white"}`}>{level.name}</p>
        {!locked && <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{level.tagline}</p>}
      </div>
    </div>
  );
}

export default function CampaignMap() {
  const { data: session } = useSession();
  const [chapterName, setChapterName] = useState<string>("Kampagne");
  const [chapterIntro, setChapterIntro] = useState<string>("");
  const [levels, setLevels] = useState<CampaignBoardLevel[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const [liveBattleId, setLiveBattleId] = useState<string | null>(null);

  async function loadBoard() {
    try {
      const res = await fetch("/api/battle-cards/campaign");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Kampagne konnte nicht geladen werden.");
        return;
      }
      setChapterName(data.chapterName);
      setChapterIntro(data.chapterIntro ?? "");
      setLevels(data.levels);
    } catch {
      setError("Netzwerkfehler.");
    }
  }

  useEffect(() => {
    loadBoard();
  }, []);

  async function start(levelId: string) {
    setStarting(levelId);
    setError(null);
    try {
      const res = await fetch("/api/battle-cards/campaign-battle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ levelId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Level konnte nicht gestartet werden.");
      }
      setLiveBattleId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setStarting(null);
    }
  }

  function handleExitBattle() {
    setLiveBattleId(null);
    loadBoard();
  }

  if (liveBattleId && session?.user?.id) {
    return <LiveBattleView liveBattleId={liveBattleId} viewerId={session.user.id} onExit={handleExitBattle} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4 text-rose-400" />
          <h2 className="text-sm font-black text-white uppercase tracking-wide">{chapterName}</h2>
        </div>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-300">
          <CoinIcon size={10} /> 100 pro neuem Stern
        </span>
      </div>
      {chapterIntro && <p className="text-xs text-gray-400 leading-relaxed">{chapterIntro}</p>}

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {!levels ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="glass rounded-2xl px-4 py-8 flex flex-col items-center gap-8">
          {levels.map((level, index) => (
            <div key={level.id} className="w-full flex flex-col items-center">
              <LevelNode level={level} index={index} onSelect={() => start(level.id)} />
              {starting === level.id && (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
