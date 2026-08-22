"use client";
import { useState } from "react";
import { Monitor, Trophy, Package, X, CalendarDays, Medal, Swords, Clock, MessageSquare, Gamepad2 } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import type { MancaveData, MancaveHotspotSlot } from "./mancave-data";

/**
 * Statische, illustrative Ego-Perspektive auf den Schreibtisch — bewusst kein
 * echtes 3D (siehe Scope-Entscheidung): eine gebaute SVG-Szene mit drei
 * Hotspots (Monitor, Pokalregal, Gadget-Regal), die jeweils ein Glass-Panel
 * mit echten Profildaten öffnen. Farbschema folgt der approvten Gaming-
 * Zimmer-Promo-Stimmung: nahezu schwarzer Grund, dominantes Teal-Randlicht,
 * gedeckelte Glow-Akzente (kein greller Screen-Blowout).
 */
export default function MancaveDesktopScene({ data }: { data: MancaveData }) {
  const [active, setActive] = useState<MancaveHotspotSlot | null>(null);

  const shelfGadgets = data.gadgets.filter(g => g.slot === "shelf");
  const deskGadgets  = data.gadgets.filter(g => g.slot === "desk" || g.slot === "monitor");

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.06]"
      style={{ aspectRatio: "16 / 9", background: "#050810" }}>

      {/* ── Szene (SVG) ──────────────────────────────────────────────── */}
      <svg viewBox="0 0 1600 900" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="mc-rim" cx="50%" cy="30%" r="65%">
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
          <linearGradient id="mc-screen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0d3b36" />
            <stop offset="100%" stopColor="#04211d" />
          </linearGradient>
          <linearGradient id="mc-screenglow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2dd4bf" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#2dd4bf" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rückwand */}
        <rect x="0" y="0" width="1600" height="640" fill="url(#mc-wall)" />
        {/* Teal-Randlicht */}
        <rect x="0" y="0" width="1600" height="640" fill="url(#mc-rim)" />
        {/* dünne Lichtfuge Wand/Boden */}
        <rect x="0" y="636" width="1600" height="3" fill="#2dd4bf" opacity="0.25" />

        {/* Pokalregal links */}
        <g opacity="0.9">
          <rect x="110" y="150" width="330" height="14" rx="3" fill="#1a2530" />
          <rect x="110" y="300" width="330" height="14" rx="3" fill="#1a2530" />
          <rect x="118" y="164" width="14" height="136" fill="#141c24" />
          <rect x="428" y="164" width="14" height="136" fill="#141c24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={160 + i * 55} cy={286} r="16" fill="#f59e0b" opacity={i < Math.min(5, data.pokaleCount) ? 0.85 : 0.12} />
          ))}
        </g>

        {/* Gadget-Regal rechts */}
        <g opacity="0.9">
          <rect x="1160" y="150" width="330" height="14" rx="3" fill="#1a2530" />
          <rect x="1160" y="300" width="330" height="14" rx="3" fill="#1a2530" />
          <rect x="1168" y="164" width="14" height="136" fill="#141c24" />
          <rect x="1478" y="164" width="14" height="136" fill="#141c24" />
          {Array.from({ length: 5 }).map((_, i) => (
            <rect key={i} x={1210 + i * 55} y={264} width="26" height="26" rx="5" fill="#2dd4bf" opacity={i < Math.min(5, shelfGadgets.length) ? 0.7 : 0.1} />
          ))}
        </g>

        {/* Monitor-Glow hinter dem Bildschirm */}
        <rect x="480" y="260" width="640" height="360" fill="url(#mc-screenglow)" opacity="0.6" />

        {/* Monitor */}
        <rect x="560" y="300" width="480" height="290" rx="14" fill="#0a0f14" stroke="#1e2a33" strokeWidth="3" />
        <rect x="582" y="322" width="436" height="246" rx="6" fill="url(#mc-screen)" />
        {/* Mini-Dashboard-Vorschau im Screen */}
        <g opacity="0.85">
          <rect x="602" y="342" width="140" height="16" rx="3" fill="#2dd4bf" opacity="0.5" />
          <rect x="602" y="368" width="90" height="10" rx="2" fill="#9ca3af" opacity="0.35" />
          {[0.4, 0.7, 0.5, 0.85, 0.6, 0.95].map((h, i) => (
            <rect key={i} x={602 + i * 30} y={470 - h * 70} width="18" height={h * 70} rx="2" fill="#2dd4bf" opacity="0.55" />
          ))}
          <circle cx="920" cy="360" r="22" fill="none" stroke="#2dd4bf" strokeWidth="4" opacity="0.6" />
          <circle cx="920" cy="360" r="22" fill="none" stroke="#2dd4bf" strokeWidth="4"
            strokeDasharray={`${(data.rankPct / 100) * 138} 138`} strokeLinecap="round" transform="rotate(-90 920 360)" />
        </g>
        <rect x="740" y="596" width="140" height="10" rx="3" fill="#0a0f14" />
        <rect x="770" y="602" width="80" height="34" fill="#0a0f14" />

        {/* Schreibtisch */}
        <polygon points="0,640 1600,640 1600,900 0,900" fill="url(#mc-desk)" />
        <rect x="0" y="640" width="1600" height="4" fill="#2dd4bf" opacity="0.15" />
        {/* Tastatur */}
        <rect x="700" y="700" width="200" height="60" rx="8" fill="#0e151c" stroke="#1e2a33" strokeWidth="2" />
        {/* Maus */}
        <rect x="930" y="705" width="34" height="52" rx="14" fill="#0e151c" stroke="#1e2a33" strokeWidth="2" />
        {/* Mug */}
        <rect x="560" y="712" width="46" height="42" rx="6" fill="#101820" stroke="#1e2a33" strokeWidth="2" />

        {/* Vignette unten (Körpernähe / Tischkante) */}
        <rect x="0" y="800" width="1600" height="100" fill="#000000" opacity="0.5" />
      </svg>

      {/* ── Hotspots ─────────────────────────────────────────────────── */}
      <Hotspot label="Dashboard" left="56%" top="52%" onClick={() => setActive("monitor")} Icon={Monitor} />
      <Hotspot label="Pokale & Abzeichen" left="17%" top="30%" onClick={() => setActive("trophy")} Icon={Trophy} />
      <Hotspot label="Gadgets" left="83%" top="30%" onClick={() => setActive("shelf")} Icon={Package} />

      {/* ── Detail-Panel ─────────────────────────────────────────────── */}
      {active && (
        <div className="absolute inset-0 flex items-center justify-center p-6" style={{ background: "rgba(2,5,8,0.55)", backdropFilter: "blur(2px)" }}
          onClick={() => setActive(null)}>
          <div onClick={e => e.stopPropagation()}
            className="glass card-shine rounded-2xl p-5 w-full max-w-md max-h-[85%] overflow-y-auto relative animate-fade-in">
            <button onClick={() => setActive(null)} aria-label="Schließen"
              className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors">
              <X className="w-4 h-4" />
            </button>
            {active === "monitor" && <MonitorPanel data={data} />}
            {active === "trophy" && <TrophyPanel data={data} />}
            {active === "shelf" && <ShelfPanel gadgets={deskGadgets.concat(shelfGadgets)} topGames={data.topGames} />}
          </div>
        </div>
      )}
    </div>
  );
}

function Hotspot({ label, left, top, onClick, Icon }: { label: string; left: string; top: string; onClick: () => void; Icon: typeof Monitor }) {
  return (
    <button onClick={onClick} title={label}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      style={{ left, top }}>
      <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(45,212,191,0.35)", animationDuration: "2.4s" }} />
      <span className="relative flex items-center justify-center w-9 h-9 rounded-full border transition-transform group-hover:scale-110"
        style={{ background: "rgba(4,10,9,0.85)", borderColor: "rgba(45,212,191,0.5)", boxShadow: "0 0 14px rgba(45,212,191,0.35)" }}>
        <Icon className="w-4 h-4 text-teal-300" />
      </span>
    </button>
  );
}

function MonitorPanel({ data }: { data: MancaveData }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-teal-400" />
        <h3 className="text-sm font-semibold text-white">Dashboard</h3>
      </div>
      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className={`text-xs font-semibold ${data.rankColor}`}>{data.rankLabel}</span>
          <span className="text-[10px] text-gray-500">#{data.leaderboardRank} von {data.totalUsers}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
          <div className="h-full rounded-full" style={{ width: `${data.rankPct}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
        </div>
        {data.nextRankLabel && <p className="text-[10px] text-gray-600 mt-1">{data.rankPct}% bis {data.nextRankLabel}</p>}
      </div>
      <div className="flex items-center gap-1.5">
        <CoinIcon size={13} />
        <span className="text-sm text-amber-400 font-medium tabular-nums">{data.totalPoints.toLocaleString("de-DE")} Münzen</span>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-1">
        <StatTile icon={<CalendarDays className="w-3.5 h-3.5" />} label="Events" value={data.eventCount} color="text-emerald-400" />
        <StatTile icon={<Medal className="w-3.5 h-3.5" />} label="Event-Siege" value={data.eventWins} color="text-amber-400" />
        <StatTile icon={<Swords className="w-3.5 h-3.5" />} label="Poll-Master" value={data.pollMasterCount} color="text-purple-400" />
        <StatTile icon={<Trophy className="w-3.5 h-3.5" />} label="Pokale" value={data.pokaleCount} color="text-pink-400" />
        <StatTile icon={<Clock className="w-3.5 h-3.5" />} label="Voice-Std." value={`${data.voiceHours}h`} color="text-teal-400" />
        <StatTile icon={<MessageSquare className="w-3.5 h-3.5" />} label="Nachrichten" value={data.messageCount} color="text-blue-400" />
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
    </div>
  );
}

function ShelfPanel({ gadgets, topGames }: { gadgets: MancaveData["gadgets"]; topGames: string[] }) {
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
              {g.imageUrl && <img src={g.imageUrl} alt="" className="w-7 h-7 object-contain shrink-0" />}
              <span className="text-[11px] text-gray-300 truncate">{g.label}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Gadgets im Gaming-Zimmer aufgestellt.</p>}
      {topGames.length > 0 && (
        <div className="pt-1">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1"><Gamepad2 className="w-3 h-3" /> Lieblingsspiele</p>
          <p className="text-xs text-gray-300">{topGames.slice(0, 3).join(" · ")}</p>
        </div>
      )}
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
