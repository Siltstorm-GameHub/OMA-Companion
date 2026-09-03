"use client";

// ============================================
// Kampagnen-Karte — Kampagne im "OMA Gems"-Modus
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
import { motion } from "motion/react";
import LiveBattleView from "./LiveBattleView";
import CoinIcon from "@/components/CoinIcon";
import ErrorNotice from "./ErrorNotice";

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

function LevelNode({
  level,
  index,
  isNextUp,
  onSelect,
}: {
  level: CampaignBoardLevel;
  index: number;
  /** Erster unlocked-aber-nicht-abgeschlossener Level — bekommt einen pulsierenden
   *  Ring als "Spiel mich als Nächstes"-Hinweis, wie man's aus Candy-Crush-artigen
   *  Kampagnenkarten kennt. */
  isNextUp: boolean;
  onSelect: () => void;
}) {
  const locked = !level.unlocked;
  const accent = level.isBoss ? "#f43f5e" : level.completed ? "#34d399" : "#60a5fa";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.5), duration: 0.3, ease: "easeOut" }}
      className="flex flex-col items-center"
      style={{ transform: `translateX(${offsetFor(index)}px)` }}
    >
      <motion.button
        type="button"
        onClick={onSelect}
        disabled={locked}
        whileTap={locked ? undefined : { scale: 0.9 }}
        className="relative flex flex-col items-center gap-1.5 disabled:cursor-not-allowed"
      >
        {isNextUp && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ boxShadow: [`0 0 0 0px ${accent}66`, `0 0 0 8px ${accent}00`] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
          />
        )}
        <motion.div
          className="w-16 h-16 rounded-full flex items-center justify-center shrink-0"
          animate={
            level.isBoss && !locked
              ? { boxShadow: [`0 8px 18px ${accent}55`, `0 8px 30px ${accent}aa`, `0 8px 18px ${accent}55`] }
              : undefined
          }
          transition={level.isBoss && !locked ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : undefined}
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
        </motion.div>
        {!locked && <StarRow stars={level.stars} />}
      </motion.button>
      <div className="mt-1 text-center max-w-[140px]">
        <p className={`text-xs font-bold ${locked ? "text-gray-600" : "text-white"}`}>{level.name}</p>
        {!locked && <p className="text-[10px] text-gray-500 leading-snug mt-0.5">{level.tagline}</p>}
      </div>
    </motion.div>
  );
}

export default function CampaignMap() {
  const { data: session } = useSession();
  const [chapterName, setChapterName] = useState<string>("Kampagne");
  const [chapterIntro, setChapterIntro] = useState<string>("");
  const [chapterBackground, setChapterBackground] = useState<string | null>(null);
  const [backgroundFailed, setBackgroundFailed] = useState(false);
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
      setChapterBackground(data.chapterBackground ?? null);
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

  const nextUpLevelId = levels?.find((l) => l.unlocked && !l.completed)?.id;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden rounded-2xl px-4 py-3 space-y-2"
        style={{
          background:
            chapterBackground && !backgroundFailed
              ? undefined
              : "linear-gradient(135deg, #1e1b2e 0%, #2a1830 100%)",
        }}
      >
        {chapterBackground && !backgroundFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={chapterBackground}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setBackgroundFailed(true)}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/20" />
        <p className="relative text-[9px] font-bold text-violet-300 uppercase tracking-widest">OMA Gems</p>
        <div className="relative flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-rose-400" />
            <h2 className="font-battle text-sm text-white uppercase tracking-wide">{chapterName}</h2>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-300">
            <CoinIcon size={10} /> 100 pro neuem Stern
          </span>
        </div>
        {chapterIntro && <p className="relative text-xs text-gray-300 leading-relaxed">{chapterIntro}</p>}
      </motion.div>

      {error && <ErrorNotice message={error} />}

      {!levels ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
        </div>
      ) : (
        <div className="glass rounded-2xl px-4 py-8 flex flex-col items-center gap-8">
          {levels.map((level, index) => (
            <div key={level.id} className="w-full flex flex-col items-center">
              <LevelNode
                level={level}
                index={index}
                isNextUp={level.id === nextUpLevelId}
                onSelect={() => start(level.id)}
              />
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
