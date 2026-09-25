"use client";

// ============================================
// OMA-Quest-Location-Szene — Vorlage: BoardMatch3.tsx (Positionierung) +
// CampaignMap.tsx (Hintergrund/Fallback)
// ============================================
// Lädt GET /api/dnd/location/[slug] (führt serverseitig den Story-Tick für
// den eigenen Charakter aus, siehe route.ts) — zeigt anwesende Charaktere an
// festen spawnPoints, Story-Panel am storyAnchor, Reise-Buttons zu Nachbar-
// Locations. Reisen läuft über die Hex-Weltkarte (/oma-quest), nicht mehr von hier.

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, ArrowLeft } from "@/components/icons";

interface ScenePresentCard {
  id: string;
  name: string;
  linkedDiscordId: string | null;
  avatarUrl: string | null;
  dndClass: string | null;
  spawnPoint: { x: number; y: number };
}

interface SceneEventLogEntry {
  id: string;
  title: string;
  text: string;
  xpGained: number;
  occurredAt: string;
  cardName: string;
}

interface SceneData {
  location: { id: string; slug: string; name: string; description: string | null; locationType: string };
  scene: { backgroundImage: string; storyAnchor: { x: number; y: number } };
  present: ScenePresentCard[];
  eventLog: SceneEventLogEntry[];
  storyTick: { arrived: boolean; newEvent: { title: string; text: string; xpGained: number } | null } | null;
  myCardId: string | null;
  myCardInTransit: boolean;
}

export default function LocationScene({ slug }: { slug: string }) {
  const [data, setData] = useState<SceneData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [traveling, setTraveling] = useState(false);
  const [backgroundFailed, setBackgroundFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/dnd/location/${slug}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Location konnte nicht geladen werden.");
        return;
      }
      setData(json);
      setBackgroundFailed(false);
      if (json.storyTick?.newEvent) {
        toast(json.storyTick.newEvent.title, { description: json.storyTick.newEvent.text });
      }
    } catch {
      setError("Netzwerkfehler.");
    }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  async function cancelTravel() {
    setTraveling(true);
    try {
      const res = await fetch("/api/dnd/character/travel/cancel", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Reise konnte nicht abgebrochen werden.");
      toast.success("Reise abgebrochen.");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setTraveling(false);
    }
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link href="/oma-quest" className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Zur Weltkarte
      </Link>

      <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden moba-panel">
        {!backgroundFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.scene.backgroundImage}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setBackgroundFailed(true)}
          />
        )}
        {backgroundFailed && (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1e1b2e 0%, #2a1830 100%)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/30" />

        <div className="absolute top-3 left-3 right-3">
          <h2 className="font-battle text-base text-white drop-shadow">{data.location.name}</h2>
          {data.location.description && (
            <p className="text-[11px] text-gray-300 max-w-md drop-shadow">{data.location.description}</p>
          )}
        </div>

        <AnimatePresence>
          {data.present.map((c) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ left: `${c.spawnPoint.x}%`, top: `${c.spawnPoint.y}%` }}
              title={`${c.name} (${c.dndClass ?? "?"})`}
            >
              <div
                className={`w-9 h-9 rounded-full overflow-hidden border-2 ${c.id === data.myCardId ? "border-amber-400" : "border-white/50"} bg-black/40`}
              >
                {c.avatarUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                )}
              </div>
              <span className="text-[9px] font-bold text-white bg-black/60 rounded px-1 whitespace-nowrap">{c.name}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {data.myCardInTransit && (
        <div className="flex items-center gap-2">
          <p className="text-xs text-amber-300">Dein Charakter ist gerade unterwegs.</p>
          <button
            type="button"
            disabled={traveling}
            onClick={cancelTravel}
            className="text-xs underline text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          >
            Reise abbrechen
          </button>
        </div>
      )}
      {!data.myCardInTransit && (
        <Link
          href="/oma-quest"
          className="inline-flex rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-white/5 transition-colors"
        >
          Weiterreisen — Ziel auf der Weltkarte wählen
        </Link>
      )}

      <div className="moba-panel rounded-2xl p-4 space-y-2">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Story</p>
        {data.eventLog.length === 0 ? (
          <p className="text-xs text-gray-500">Hier ist noch nichts passiert.</p>
        ) : (
          <ul className="space-y-2">
            {data.eventLog.map((e) => (
              <li key={e.id} className="text-xs">
                <span className="font-bold text-white">{e.cardName}</span>{" "}
                <span className="text-gray-400">— {e.title}: {e.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
