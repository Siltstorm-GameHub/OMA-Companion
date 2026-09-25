"use client";

// ============================================
// D&D-Weltkarte — Vorlage: CampaignMap.tsx (Hintergrundbild + onError-
// Fallback, prozentual positionierte Nodes, motion.div-Badges)
// ============================================
// Client-Polling statt SSE (plan Abschnitt 3.1): alle 25s + Refetch bei
// document.visibilitychange. Karte ist jetzt auf allen Bildschirmgrößen
// sichtbar (ersetzt den früheren Mobile-Listen-Fallback) — ZoomPanMap.tsx
// übernimmt Pinch-Zoom/Pan/Doppel-Tap, damit sie auf dem Handy tatsächlich
// bedienbar ist.

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Loader2, Flag, Globe, List } from "@/components/icons";
import ZoomPanMap from "./ZoomPanMap";

const POLL_INTERVAL_MS = 25_000;

interface DndLocationRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  locationType: string;
  mapX: number;
  mapY: number;
}

interface DndCharacterRow {
  cardId: string;
  name: string;
  discordId: string | null;
  inTransit: boolean;
  locationId: string | null;
  fromId: string | null;
  toId: string | null;
  progress: number | null;
}

/** Kleine Location-Illustration als Marker (/dnd/locations/<slug>.jpg, gleicher
 *  Pfad wie die Szenen-Hintergründe in location-scenes.ts) — fällt bei
 *  Ladefehler auf den ursprünglichen Flaggen-Kreis zurück. */
function LocationMarker({ slug, isMine }: { slug: string; isMine: boolean }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <motion.div
        whileHover={{ scale: 1.1 }}
        className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isMine ? "border-amber-400" : "border-white/30"}`}
        style={{ background: "radial-gradient(circle at 35% 28%, #8b5cf6, #6d28d9)" }}
      >
        <Flag className="w-4 h-4 text-white" />
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      className={`w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg ${isMine ? "border-amber-400" : "border-white/40"}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/dnd/locations/${slug}.jpg`}
        alt=""
        className="w-full h-full object-cover"
        onError={() => setFailed(true)}
      />
    </motion.div>
  );
}

const TYPE_LABEL: Record<string, string> = {
  SETTLEMENT: "Siedlung",
  DUNGEON: "Verlies",
  WILDERNESS: "Wildnis",
  LANDMARK: "Wahrzeichen",
};

export default function WorldMap({ myCardId }: { myCardId: string | null }) {
  const [locations, setLocations] = useState<DndLocationRow[] | null>(null);
  const [characters, setCharacters] = useState<DndCharacterRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [backgroundFailed, setBackgroundFailed] = useState(false);
  // Standardansicht ist immer die Karte (auch mobil) — die Liste ist ein
  // manuell wählbarer Umschalter für mobile Nutzer, kein automatischer
  // Breakpoint-Fallback mehr.
  const [view, setView] = useState<"map" | "list">("map");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dnd/world-map");
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Weltkarte konnte nicht geladen werden.");
        return;
      }
      setLocations(data.locations);
      setCharacters(data.characters);
      setError(null);
    } catch {
      setError("Netzwerkfehler.");
    }
  }, []);

  useEffect(() => {
    load();
    timerRef.current = setInterval(load, POLL_INTERVAL_MS);
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const locById = new Map((locations ?? []).map((l) => [l.id, l]));

  function charactersAt(locationId: string) {
    return characters.filter((c) => !c.inTransit && c.locationId === locationId);
  }

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!locations) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Umschalter Karte/Liste — nur auf schmalen Screens sichtbar, Desktop hat immer die Karte. */}
      <div className="sm:hidden flex justify-end">
        <div className="inline-flex rounded-full bg-black/30 p-0.5 gap-0.5">
          <button
            type="button"
            onClick={() => setView("map")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
              view === "map" ? "bg-violet-600 text-white" : "text-gray-400"
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Karte
          </button>
          <button
            type="button"
            onClick={() => setView("list")}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
              view === "list" ? "bg-violet-600 text-white" : "text-gray-400"
            }`}
          >
            <List className="w-3.5 h-3.5" /> Liste
          </button>
        </div>
      </div>

      {view === "list" && (
        <div className="sm:hidden space-y-2">
          {locations.map((loc) => {
            const here = charactersAt(loc.id);
            return (
              <Link
                key={loc.id}
                href={`/dnd/${loc.slug}`}
                className="moba-panel rounded-xl p-3 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{loc.name}</p>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">{TYPE_LABEL[loc.locationType] ?? loc.locationType}</p>
                </div>
                {here.length > 0 && (
                  <span className="shrink-0 text-[10px] font-bold text-amber-300 bg-black/30 rounded-full px-2 py-0.5">
                    {here.length} hier
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <div className={view === "list" ? "hidden sm:block" : ""}>
      <ZoomPanMap>
        {!backgroundFailed && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/dnd/world-map.jpg"
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={() => setBackgroundFailed(true)}
          />
        )}
        {backgroundFailed && (
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #1e1b2e 0%, #2a1830 100%)" }} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        {locations.map((loc) => {
          const here = charactersAt(loc.id);
          const isMine = here.some((c) => c.cardId === myCardId);
          return (
            <Link
              key={loc.id}
              href={`/dnd/${loc.slug}`}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1"
              style={{ left: `${loc.mapX}%`, top: `${loc.mapY}%` }}
            >
              <LocationMarker slug={loc.slug} isMine={isMine} />
              {/* Immer sichtbar statt hover-only — auf Touch-Geräten gibt es kein Hover. */}
              <span className="text-[10px] font-bold text-white bg-black/60 rounded px-1.5 py-0.5 whitespace-nowrap">
                {loc.name}
              </span>
              {here.length > 0 && (
                <span className="text-[9px] font-bold text-amber-300 bg-black/60 rounded-full px-1.5">
                  {here.length}
                </span>
              )}
            </Link>
          );
        })}

        {characters
          .filter((c) => c.inTransit && c.fromId && c.toId)
          .map((c) => {
            const from = locById.get(c.fromId!);
            const to = locById.get(c.toId!);
            if (!from || !to) return null;
            const progress = c.progress ?? 0.5;
            const x = from.mapX + (to.mapX - from.mapX) * progress;
            const y = from.mapY + (to.mapY - from.mapY) * progress;
            return (
              <div
                key={c.cardId}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-teal-400 border border-white/60 shadow"
                style={{ left: `${x}%`, top: `${y}%` }}
                title={`${c.name} unterwegs`}
              />
            );
          })}
      </ZoomPanMap>
      </div>

      {characters.some((c) => c.inTransit) && (
        <p className="text-[11px] text-gray-500 text-center">
          {characters.filter((c) => c.inTransit).length} Charakter(e) gerade unterwegs
        </p>
      )}
    </div>
  );
}
