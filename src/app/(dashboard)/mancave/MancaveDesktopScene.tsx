"use client";
import { useState } from "react";
import { Trophy, Package, X, CalendarDays, Medal, Swords, Clock, MessageSquare, Gamepad2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import type { MancaveData } from "./mancave-data";
import { DESK_SCENE } from "./mancave-data";

/**
 * Ego-Perspektive: der User sitzt selbst am Schreibtisch (kein Stuhl im
 * eigenen Blickfeld) und blickt auf Monitor + Tastatur. Statt einer
 * handgezeichneten SVG-Kulisse ist der Hintergrund ein einziges, in Blender
 * aus dem echten Schreibtisch-Aufbau gerendertes Sitzperspektiven-Foto
 * (siehe DESK_SCENE) — das Live-Dashboard liegt direkt (ohne Klick nötig)
 * auf dem ausgemessenen Bildschirmbereich dieses Fotos. Pokale/Abzeichen
 * ("Wandregal") und die übrigen besessenen Gadgets (PC, Controller,
 * Peripherie, Licht) hängen als Hotspots daneben — echte Fotos im
 * Detail-Panel statt Position im Bild, weil ihre isolierten Cutout-Renders
 * perspektivisch nicht zur Sitzperspektive passen würden.
 */
export default function MancaveDesktopScene({ data }: { data: MancaveData }) {
  const [panel, setPanel] = useState<"trophy" | "gadgets" | null>(null);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.06]"
      style={{ aspectRatio: `${DESK_SCENE.w} / ${DESK_SCENE.h}`, background: "#050810" }}>

      {/* eslint-disable-next-line @next/next/no-img-element -- lokales public-Asset, Seitenverhältnis kommt aus dem Katalog */}
      <img src={DESK_SCENE.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />

      {/* Live-Dashboard direkt auf dem Monitor-Screen des Fotos — immer sichtbar, kein Klick nötig */}
      <div className="absolute overflow-hidden rounded-[2px]"
        style={{
          left: `${DESK_SCENE.screenRect.x0 * 100}%`, top: `${DESK_SCENE.screenRect.y0 * 100}%`,
          width: `${(DESK_SCENE.screenRect.x1 - DESK_SCENE.screenRect.x0) * 100}%`,
          height: `${(DESK_SCENE.screenRect.y1 - DESK_SCENE.screenRect.y0) * 100}%`,
        }}>
        <MonitorScreenContent data={data} />
      </div>

      {/* ── Wandregal (Pokale & Abzeichen) ───────────────────────────── */}
      <button onClick={() => setPanel("trophy")} title="Pokale & Abzeichen"
        className="absolute group text-left" style={{ left: "3%", top: "6%", width: "26%" }}>
        <div className="rounded-xl px-3 py-2.5 transition-transform group-hover:scale-[1.03]"
          style={{ background: "rgba(4,10,9,0.55)", border: "1px solid rgba(245,158,11,0.22)", backdropFilter: "blur(3px)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] font-semibold text-amber-300 uppercase tracking-widest">Wandregal</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {data.badges.slice(0, 6).map(b => (
              <span key={b.key} className="text-[13px] leading-none">{b.icon}</span>
            ))}
            {data.pokale.length > 0 && (
              <span className="text-[10px] text-amber-300/80 font-semibold ml-1">+{data.pokaleCount} Pokale</span>
            )}
          </div>
        </div>
      </button>

      {/* ── Gadgets (PC, Controller, Peripherie, Licht) ─────────────── */}
      {data.gadgets.some(g => g.zone === "other") && (
        <button onClick={() => setPanel("gadgets")} title="Gadgets"
          className="absolute flex items-center gap-1.5 px-2.5 py-1.5 rounded-full transition-transform hover:scale-[1.05]"
          style={{ right: "3%", bottom: "4%", background: "rgba(4,10,9,0.65)", border: "1px solid rgba(45,212,191,0.3)", backdropFilter: "blur(3px)" }}>
          <Package className="w-3.5 h-3.5 text-teal-300" />
          <span className="text-[10px] font-semibold text-teal-200">Gadgets</span>
        </button>
      )}

      {/* ── Detail-Panel ─────────────────────────────────────────────── */}
      {panel && (
        <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: "rgba(2,5,8,0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setPanel(null)}>
          <div onClick={e => e.stopPropagation()}
            className="glass card-shine rounded-2xl p-5 w-full max-w-md max-h-[85%] overflow-y-auto relative animate-fade-in">
            <button onClick={() => setPanel(null)} aria-label="Schließen"
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4" />
            </button>
            {panel === "trophy" && <TrophyPanel data={data} />}
            {panel === "gadgets" && <GadgetsPanel data={data} />}
          </div>
        </div>
      )}
    </div>
  );
}

/** Kompaktes, immer sichtbares Dashboard direkt auf dem Bildschirm. */
function MonitorScreenContent({ data }: { data: MancaveData }) {
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

function TrophyPanel({ data }: { data: MancaveData }) {
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

function GadgetsPanel({ data }: { data: MancaveData }) {
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
