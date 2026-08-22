"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Package, CalendarDays, Medal, Swords, Clock, MessageSquare, Gamepad2, Wrench, Lock, ArrowUpCircle, ArrowDownCircle, FlaskConical } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { MANCAVE_DEV_FREE_MODE } from "@/lib/mancave-items";
import type { MancaveData } from "./mancave-data";

export type MancavePanel = "trophy" | "gadgets" | "items" | null;

/** Kompaktes, immer sichtbares Dashboard direkt auf dem Bildschirm. */
export function MonitorScreenContent({ data }: { data: MancaveData }) {
  return (
    <div className="w-full h-full flex flex-col justify-between p-[3%] overflow-hidden select-none"
      style={{ background: "linear-gradient(180deg,rgba(13,59,54,0.92),rgba(4,33,29,0.92))" }}>
      <div>
        <div className="flex items-center justify-between">
          <span className={`font-bold leading-none ${data.rankColor}`} style={{ fontSize: "clamp(9px,1.6vw,15px)" }}>
            {data.rankLabel}
          </span>
          <span className="text-teal-300/70" style={{ fontSize: "clamp(7px,1.2vw,11px)" }}>#{data.leaderboardRank}</span>
        </div>
        <div className="mt-1 h-[3px] rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${data.rankPct}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <CoinIcon size={13} />
        <span className="text-amber-300 font-semibold tabular-nums leading-none" style={{ fontSize: "clamp(9px,1.8vw,16px)" }}>
          {data.totalPoints.toLocaleString("de-DE")}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-x-2 text-teal-100/80" style={{ fontSize: "clamp(6px,1.1vw,10px)" }}>
        <span>🏆 {data.eventWins}</span>
        <span>📅 {data.eventCount}</span>
        <span>🏅 {data.pokaleCount}</span>
        <span>⭐ {data.pollMasterCount}</span>
      </div>
    </div>
  );
}

export function TrophyPanel({ data }: { data: MancaveData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">Pokale &amp; Abzeichen</h3>
      </div>
      {data.pokale.length > 0 ? (
        <div className="space-y-1.5">
          {data.pokale.slice(0, 6).map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
              <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-gray-300 truncate">{p.title}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Pokale gewonnen.</p>}
      {data.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {data.badges.map(b => (
            <span key={b.key} title={`${b.name} — ${b.desc}`}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-white/[0.04] border border-white/[0.06]">
              {b.icon}
            </span>
          ))}
        </div>
      )}
      <div className="pt-2 border-t border-white/[0.06] space-y-2">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest flex items-center gap-1"><Package className="w-3 h-3" /> Aktivität & Spiele</p>
        <div className="grid grid-cols-2 gap-2">
          <StatTile icon={<CalendarDays className="w-3.5 h-3.5" />} label="Events" value={data.eventCount} color="text-emerald-400" />
          <StatTile icon={<Medal className="w-3.5 h-3.5" />} label="Event-Siege" value={data.eventWins} color="text-amber-400" />
          <StatTile icon={<Swords className="w-3.5 h-3.5" />} label="Poll-Master" value={data.pollMasterCount} color="text-purple-400" />
          <StatTile icon={<Clock className="w-3.5 h-3.5" />} label="Voice-Std." value={`${data.voiceHours}h`} color="text-teal-400" />
          <StatTile icon={<MessageSquare className="w-3.5 h-3.5" />} label="Nachrichten" value={data.messageCount} color="text-blue-400" />
        </div>
        {data.topGames.length > 0 && (
          <p className="text-xs text-gray-300 flex items-center gap-1.5"><Gamepad2 className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {data.topGames.slice(0, 3).join(" · ")}</p>
        )}
      </div>
    </div>
  );
}

export function GadgetsPanel({ data }: { data: MancaveData }) {
  const gadgets = data.gadgets.filter(g => g.zone === "other");
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Package className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Gadgets</h3>
      </div>
      {gadgets.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {gadgets.map(g => (
            <div key={g.key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale public-Assets, kein next/image nötig */}
              {g.imageUrl && <img src={g.imageUrl} alt="" className="w-9 h-9 object-contain shrink-0" />}
              <span className="text-[11px] text-gray-300 truncate">{g.label}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Gadgets im Gaming-Zimmer aufgestellt.</p>}
    </div>
  );
}

/**
 * Ausbau-Panel des neuen Mancave-Systems (siehe mancave-items.ts,
 * mancave-economy.ts) — Phase 1: nur Wirtschaft/Buttons, die Szene selbst
 * sieht optisch noch gleich aus, bis es Blender-Stufenvarianten gibt.
 * Boden/Wand/Fenster tauchen hier bewusst NICHT als eigene Kaufzeile auf —
 * ihre Stufe steigt automatisch mit (Durchschnitt aller Objekt-Stufen).
 */
export function ItemsPanel({ data }: { data: MancaveData }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(url: string, itemKey: string, fallbackError: string) {
    setPending(itemKey);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? fallbackError);
        return;
      }
      router.refresh();
    } catch {
      setError("Verbindung fehlgeschlagen");
    } finally {
      setPending(null);
    }
  }

  const upgrade   = (itemKey: string) => run("/api/mancave/upgrade", itemKey, "Konnte nicht aufgerüstet werden");
  const downgrade = (itemKey: string) => run("/api/mancave/downgrade", itemKey, "Konnte nicht zurückgestuft werden");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wrench className="w-4 h-4 text-teal-400" />
          <h3 className="text-sm font-semibold text-white">Ausbau</h3>
        </div>
        <span className="text-[10px] text-gray-500">Boden/Wand/Fenster: Stufe {data.surfaceTier}</span>
      </div>
      {MANCAVE_DEV_FREE_MODE && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-amber-200"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
          <FlaskConical className="w-3 h-3 shrink-0" />
          Testphase: Upgrades sind kostenlos, Rückstufen ist möglich.
        </div>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      <div className="space-y-1.5">
        {data.items.map(item => {
          const minTier = item.baseline ? 1 : 0;
          const canDowngrade = MANCAVE_DEV_FREE_MODE && item.tier > minTier;
          return (
          <div key={item.key} className="flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
            <div className="min-w-0 flex items-center gap-2">
              {item.tier === 0 ? <Lock className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ArrowUpCircle className="w-3.5 h-3.5 text-teal-400 shrink-0" />}
              <div className="min-w-0">
                <p className="text-xs text-gray-200 truncate">{item.label}</p>
                <p className="text-[10px] text-gray-500">{item.tier === 0 ? "Nicht freigeschaltet" : `Stufe ${item.tier}/${item.maxTier}`}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {canDowngrade && (
                <button
                  onClick={() => downgrade(item.key)}
                  disabled={pending === item.key}
                  aria-label={`${item.label} zurückstufen`}
                  className="flex items-center justify-center w-6 h-6 rounded-full disabled:opacity-50"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#9ca3af" }}
                >
                  <ArrowDownCircle className="w-3.5 h-3.5" />
                </button>
              )}
              {item.nextCost === null ? (
                <span className="text-[10px] text-amber-300/80 whitespace-nowrap">Max</span>
              ) : (
                <button
                  onClick={() => upgrade(item.key)}
                  disabled={pending === item.key}
                  className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold whitespace-nowrap disabled:opacity-50"
                  style={{ background: "rgba(45,212,191,0.12)", border: "1px solid rgba(45,212,191,0.3)", color: "#5eead4" }}
                >
                  {item.nextCost === 0 ? null : <CoinIcon size={10} />}
                  {pending === item.key ? "…" : item.nextCost === 0 ? "Gratis" : item.nextCost.toLocaleString("de-DE")}
                  {item.tier === 0 && " · Freischalten"}
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function StatTile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/[0.03]">
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-bold text-white tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}
