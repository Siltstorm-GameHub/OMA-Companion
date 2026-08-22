"use client";
import { useMemo, useState } from "react";
import { Trophy, Package, X, CalendarDays, Medal, Swords, Clock, MessageSquare, Gamepad2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import type { MancaveData, MancaveGadget } from "./mancave-data";
import { FALLBACK_SCREEN_RECT } from "./mancave-data";

/**
 * Statische, illustrative Ego-Perspektive auf den Schreibtisch — bewusst kein
 * echtes 3D (siehe Scope-Entscheidung). Anders als die erste Fassung stehen
 * hier keine abstrakten Platzhalter mehr: jeder Monitor ist das tatsächlich
 * besessene Gaming-Zimmer-Foto, und die restlichen Gadgets (PC, Peripherie,
 * Konsolen, Stuhl, Licht) sind echte Fotos an ihrem jeweiligen Platz (Monitor/
 * Tischplatte/Boden). Farbschema folgt der approvten Gaming-Zimmer-Promo-
 * Stimmung: nahezu schwarzer Grund, dominantes Teal-Randlicht.
 */
export default function MancaveDesktopScene({ data }: { data: MancaveData }) {
  const [trophyOpen, setTrophyOpen] = useState(false);

  const monitors = useMemo(() => data.gadgets.filter(g => g.zone === "monitor").sort((a, b) => b.price - a.price), [data.gadgets]);
  const deskItems  = useMemo(() => data.gadgets.filter(g => g.zone === "desk"), [data.gadgets]);
  const floorItems = useMemo(() => data.gadgets.filter(g => g.zone === "floor"), [data.gadgets]);
  const primaryMonitor = monitors[0];
  const extraMonitors   = monitors.slice(1, 3);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.06]"
      style={{ aspectRatio: "16 / 9", background: "#050810" }}>

      {/* ── Atmosphäre (Wand/Boden/Licht) ────────────────────────────── */}
      <svg viewBox="0 0 1600 900" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="mc-rim" cx="50%" cy="26%" r="65%">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#0f766e" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#050810" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mc-wall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a1018" />
            <stop offset="100%" stopColor="#050a10" />
          </linearGradient>
          <linearGradient id="mc-desk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#141b22" />
            <stop offset="100%" stopColor="#02050a" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="1600" height="640" fill="url(#mc-wall)" />
        <rect x="0" y="0" width="1600" height="640" fill="url(#mc-rim)" />
        <rect x="0" y="636" width="1600" height="3" fill="#2dd4bf" opacity="0.25" />
        <polygon points="0,640 1600,640 1600,900 0,900" fill="url(#mc-desk)" />
        <rect x="0" y="640" width="1600" height="4" fill="#2dd4bf" opacity="0.15" />
        <rect x="0" y="800" width="1600" height="100" fill="#000000" opacity="0.5" />
      </svg>

      {/* ── Pokalregal links (echte Pokale/Abzeichen haben keine Fotos —
           bleibt bewusst als kompakte Symbol-Vitrine) ───────────────── */}
      <button onClick={() => setTrophyOpen(true)} title="Pokale & Abzeichen"
        className="absolute group text-left" style={{ left: "5%", top: "11%", width: "20%" }}>
        <div className="rounded-xl px-3 py-2.5 transition-transform group-hover:scale-[1.03]"
          style={{ background: "rgba(4,10,9,0.55)", border: "1px solid rgba(245,158,11,0.22)", backdropFilter: "blur(3px)" }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Trophy className="w-3 h-3 text-amber-400" />
            <span className="text-[9px] font-semibold text-amber-300 uppercase tracking-widest">Vitrine</span>
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

      {/* ── Monitore (echte Fotos, Dashboard direkt auf dem Screen) ──── */}
      <div className="absolute flex items-end justify-center gap-3" style={{ left: "50%", top: "20%", transform: "translateX(-50%)" }}>
        {primaryMonitor
          ? <MonitorPhoto gadget={primaryMonitor} data={data} width={260} primary />
          : <MonitorPhoto gadget={null} data={data} width={260} primary />}
        {extraMonitors.map(m => (
          <MonitorPhoto key={m.key} gadget={m} data={data} width={130} primary={false} />
        ))}
      </div>

      {/* ── Tischplatte: Peripherie & Licht ───────────────────────────── */}
      {deskItems.length > 0 && (
        <div className="absolute flex items-end gap-2.5" style={{ left: "50%", top: "62%", transform: "translateX(-50%)" }}>
          {deskItems.slice(0, 6).map(g => <GadgetPhoto key={g.key} gadget={g} width={72} />)}
        </div>
      )}

      {/* ── Boden neben dem Tisch: PC-Tower, Konsolen, Stuhl ──────────── */}
      {floorItems.length > 0 && (
        <div className="absolute flex items-end gap-2.5" style={{ left: "5%", top: "64%" }}>
          {floorItems.slice(0, 5).map(g => <GadgetPhoto key={g.key} gadget={g} width={90} />)}
        </div>
      )}

      {/* ── Pokal/Abzeichen-Detail ───────────────────────────────────── */}
      {trophyOpen && (
        <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: "rgba(2,5,8,0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setTrophyOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            className="glass card-shine rounded-2xl p-5 w-full max-w-md max-h-[85%] overflow-y-auto relative animate-fade-in">
            <button onClick={() => setTrophyOpen(false)} aria-label="Schließen"
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4" />
            </button>
            <TrophyPanel data={data} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Ein Monitor-Foto aus dem echten Gaming-Zimmer-Bestand. Beim Primär-Monitor
 * liegt das kompakte Dashboard direkt (ohne Klick) über der ausgemessenen
 * Bildschirmfläche — dieselben Werte, die vorher nur im Popup steckten, sind
 * jetzt permanent sichtbar. Fehlt ein ausgemessenes `screenRect` (nicht jeder
 * Monitortyp hat eins), greift ein grober, aber plausibler Notfall-Bereich.
 */
function MonitorPhoto({ gadget, data, width, primary }: { gadget: MancaveGadget | null; data: MancaveData; width: number; primary: boolean }) {
  const ratio = gadget ? gadget.w / gadget.h : 1;
  const rect  = gadget?.screenRect ?? FALLBACK_SCREEN_RECT;

  return (
    <div className="relative shrink-0" style={{ width, aspectRatio: `${ratio}` }}>
      {gadget?.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- lokale public-Assets, Seitenverhältnis kommt aus dem Katalog
        <img src={gadget.imageUrl} alt={gadget.label} className="absolute inset-0 w-full h-full object-contain object-bottom drop-shadow-[0_8px_20px_rgba(0,0,0,0.5)]" />
      ) : (
        <div className="absolute inset-0 rounded-lg" style={{ background: "#0a0f14", border: "3px solid #1e2a33" }} />
      )}
      {primary && (
        <div className="absolute overflow-hidden rounded-[3px]"
          style={{
            left: `${rect.x0 * 100}%`, top: `${rect.y0 * 100}%`,
            width: `${(rect.x1 - rect.x0) * 100}%`, height: `${(rect.y1 - rect.y0) * 100}%`,
            background: "linear-gradient(180deg,#0d3b36,#04211d)",
            boxShadow: "inset 0 0 12px rgba(45,212,191,0.25)",
          }}>
          <MonitorScreenContent data={data} />
        </div>
      )}
    </div>
  );
}

/** Kompaktes, immer sichtbares Dashboard direkt auf dem Bildschirm. */
function MonitorScreenContent({ data }: { data: MancaveData }) {
  return (
    <div className="w-full h-full flex flex-col justify-between p-[6%] overflow-hidden select-none">
      <div>
        <div className="flex items-center justify-between">
          <span className={`font-bold leading-none ${data.rankColor}`} style={{ fontSize: 9 }}>
            {data.rankLabel}
          </span>
          <span className="text-teal-300/70" style={{ fontSize: 7 }}>#{data.leaderboardRank}</span>
        </div>
        <div className="mt-1 h-[3px] rounded-full overflow-hidden bg-white/10">
          <div className="h-full rounded-full" style={{ width: `${data.rankPct}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <CoinIcon size={9} />
        <span className="text-amber-300 font-semibold tabular-nums leading-none" style={{ fontSize: 10 }}>
          {data.totalPoints.toLocaleString("de-DE")}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-teal-100/80" style={{ fontSize: 7 }}>
        <span>🏆 {data.eventWins}</span>
        <span>📅 {data.eventCount}</span>
        <span>🏅 {data.pokaleCount}</span>
        <span>⭐ {data.pollMasterCount}</span>
      </div>
    </div>
  );
}

function GadgetPhoto({ gadget, width }: { gadget: MancaveGadget; width: number }) {
  const ratio = gadget.w / gadget.h;
  return (
    <div className="shrink-0" style={{ width, aspectRatio: `${ratio}` }} title={gadget.label}>
      {gadget.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- lokale public-Assets, Seitenverhältnis kommt aus dem Katalog
        <img src={gadget.imageUrl} alt={gadget.label} className="w-full h-full object-contain object-bottom drop-shadow-[0_6px_14px_rgba(0,0,0,0.45)]" />
      ) : (
        <div className="w-full h-full rounded-lg bg-teal-500/10" />
      )}
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
