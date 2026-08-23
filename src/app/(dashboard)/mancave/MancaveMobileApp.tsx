"use client";
import { useState } from "react";
import { BarChart3, Trophy, Gamepad2, Activity, Wrench, CalendarDays, Medal, Swords, Clock, MessageSquare } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import RankIcon from "@/components/RankIcon";
import CoinIcon from "@/components/CoinIcon";
import { ItemsPanel } from "./MancaveSharedUI";
import type { MancaveData } from "./mancave-data";

type Tab = "stats" | "pokale" | "spiele" | "aktivitaet" | "ausbau";

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "stats",      label: "Statistik",  icon: BarChart3 },
  { key: "pokale",     label: "Pokale",     icon: Trophy },
  { key: "spiele",     label: "Spiele",     icon: Gamepad2 },
  { key: "aktivitaet", label: "Aktivität",  icon: Activity },
  { key: "ausbau",     label: "Ausbau",     icon: Wrench },
];

/**
 * Ambiente pro Gesamt-Zimmerstufe (`data.surfaceTier`, 1-4 — Durchschnitt
 * ALLER Item-Stufen, siehe computeSurfaceTier in mancave-items.ts). Bewusst
 * NICHT an einzelne Items gekoppelt (User-Wunsch) — nur der Gesamtausbau
 * treibt Hintergrund-Ambiente, Kachel-Form und Animationsgrad, analog zur
 * Optik-Progression im 3D-Raum (nüchtern -> Teal-Akzente -> RGB). Stufe 3/4
 * greifen die tatsächlichen Beleuchtungsfarben aus der 3D-Szene auf (Violett
 * von Nanoleaf ~#7714ff, Warmgelb vom Ringlicht ~#fff24a — MancaveScene3D.tsx).
 */
const TIER_THEME: Record<number, {
  blobs: { color: string; size: string; pos: string; anim?: string }[];
  tileRadius: string;
  tileBorder: string;
  tileGlow: string;
  cardAnim: string;
  iconActiveAnim: string;
  scanline: boolean;
}> = {
  1: {
    blobs: [],
    tileRadius: "rounded-lg",
    tileBorder: "border border-white/[0.06]",
    tileGlow: "",
    cardAnim: "",
    iconActiveAnim: "",
    scanline: false,
  },
  2: {
    blobs: [
      { color: "rgba(20,184,166,0.16)", size: "60vw", pos: "top:-10%; left:-15%;" },
    ],
    tileRadius: "rounded-xl",
    tileBorder: "border border-white/[0.08]",
    tileGlow: "",
    cardAnim: "animate-fade-in",
    iconActiveAnim: "",
    scanline: false,
  },
  3: {
    blobs: [
      { color: "rgba(20,184,166,0.20)", size: "65vw", pos: "top:-15%; left:-20%;", anim: "aurora-blob--teal" },
      { color: "rgba(119,20,255,0.16)", size: "50vw", pos: "bottom:-15%; right:-15%;", anim: "aurora-blob--accent" },
    ],
    tileRadius: "rounded-2xl",
    tileBorder: "border border-teal-500/20",
    tileGlow: "shadow-[0_0_14px_rgba(20,184,166,0.12)]",
    cardAnim: "animate-fade-in scan-on-load",
    iconActiveAnim: "glow-active",
    scanline: false,
  },
  4: {
    blobs: [
      { color: "rgba(20,184,166,0.22)", size: "65vw", pos: "top:-15%; left:-20%;", anim: "aurora-blob--teal" },
      { color: "rgba(119,20,255,0.20)", size: "55vw", pos: "bottom:-20%; right:-15%;", anim: "aurora-blob--crimson" },
      { color: "rgba(255,242,74,0.10)", size: "35vw", pos: "top:35%; left:35%;", anim: "aurora-blob--accent" },
    ],
    tileRadius: "rounded-2xl",
    tileBorder: "border border-teal-400/30",
    tileGlow: "shadow-[0_0_20px_rgba(20,184,166,0.22)]",
    cardAnim: "animate-fade-in scan-on-load",
    iconActiveAnim: "glow-active",
    scanline: true,
  },
};

/**
 * User hält beim Aufruf bereits ein echtes Handy in der Hand — ein
 * simuliertes Phone-Frame (abgerundete Kachel, Notch) wäre daher unnötige
 * Doppelung. Stattdessen volle Breite, Ambiente/Kachel-Design/Animationsgrad
 * skalieren mit der Gesamt-Zimmerstufe (siehe TIER_THEME oben).
 */
export default function MancaveMobileApp({ data }: { data: MancaveData }) {
  const [tab, setTab] = useState<Tab>("stats");
  const theme = TIER_THEME[Math.min(4, Math.max(1, data.surfaceTier))];

  return (
    <div className="relative -mx-5 -my-4 px-5 py-4 min-h-full overflow-hidden">
      {/* ── Ambiente-Hintergrund (skaliert mit Gesamt-Zimmerstufe) ──────── */}
      <div aria-hidden className="fixed inset-0 pointer-events-none select-none overflow-hidden" style={{ zIndex: 0 }}>
        {theme.blobs.map((b, i) => (
          <div key={i} className={`absolute rounded-full ${b.anim ?? ""}`}
            style={{
              width: b.size, height: b.size,
              background: `radial-gradient(ellipse at center, ${b.color} 0%, transparent 72%)`,
              filter: "blur(70px)",
              ...Object.fromEntries(b.pos.split(";").filter(Boolean).map(kv => kv.trim().split(":").map(s => s.trim())) as [string, string][]),
            }} />
        ))}
        {theme.scanline && (
          <div className="absolute inset-x-0 top-0 h-32 scan-on-load" style={{
            background: "linear-gradient(180deg, rgba(20,184,166,0.06), transparent)",
          }} />
        )}
      </div>

      <div className="relative space-y-4" style={{ zIndex: 1 }}>
        {/* Header */}
        <div className="relative">
          <div className="relative flex items-center gap-3">
            <RankedAvatar rankPoints={data.rankPoints} src={data.avatarUrl} alt={data.displayName} size={56} rounded="2xl" />
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold text-white truncate">{data.displayName}</p>
              <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${data.rankColor} mt-0.5`}>
                <RankIcon rankPoints={data.rankPoints} size="xs" showPips={false} /> {data.rankLabel}
              </span>
              <div className="flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
                <span className="text-[11px] text-gray-500">Mitglied seit {data.memberSince}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">Rang</p>
              <p className="text-xl font-black text-white tabular-nums leading-none">#{data.leaderboardRank}</p>
            </div>
          </div>
          <div className="relative mt-3 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
            <div className="h-full rounded-full" style={{ width: `${data.rankPct}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
          </div>
        </div>

        {/* App-Grid */}
        <div className="grid grid-cols-5 gap-1.5">
          {TABS.map(t => {
            const active = tab === t.key;
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex flex-col items-center gap-1.5 py-2.5 ${theme.tileRadius} transition-colors ${active ? theme.tileGlow : ""}`}
                style={{ background: active ? "rgba(45,212,191,0.14)" : "rgba(255,255,255,0.03)", border: active ? "1px solid rgba(45,212,191,0.3)" : "1px solid transparent" }}>
                <Icon className={`w-4 h-4 ${active ? `text-teal-300 ${theme.iconActiveAnim}` : "text-gray-500"}`} />
                <span className={`text-[9px] font-medium ${active ? "text-teal-300" : "text-gray-500"}`}>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content-Bereich */}
        <div className="min-h-[240px]" key={tab}>
          {tab === "stats" && <StatsCard data={data} theme={theme} />}
          {tab === "pokale" && <PokaleCard data={data} theme={theme} />}
          {tab === "spiele" && <SpieleCard data={data} theme={theme} />}
          {tab === "aktivitaet" && <AktivitaetCard data={data} theme={theme} />}
          {tab === "ausbau" && <ItemsPanel data={data} />}
        </div>
      </div>
    </div>
  );
}

type Theme = typeof TIER_THEME[number];

function Tile({ icon, label, value, color, theme }: { icon: React.ReactNode; label: string; value: string | number; color: string; theme: Theme }) {
  return (
    <div className={`flex items-center gap-2.5 px-3 py-2.5 ${theme.tileRadius} ${theme.tileBorder} bg-white/[0.03] ${theme.tileGlow}`}>
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <p className={`text-base font-bold text-white tabular-nums leading-none ${theme.cardAnim ? "animate-number-pop" : ""}`}>{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function StatsCard({ data, theme }: { data: MancaveData; theme: Theme }) {
  return (
    <div className={`space-y-2.5 ${theme.cardAnim}`}>
      <div className="flex items-center gap-1.5">
        <CoinIcon size={13} />
        <span className="text-sm text-amber-400 font-medium tabular-nums">{data.totalPoints.toLocaleString("de-DE")} Münzen</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile icon={<CalendarDays className="w-3.5 h-3.5" />} label="Events" value={data.eventCount} color="text-emerald-400" theme={theme} />
        <Tile icon={<Medal className="w-3.5 h-3.5" />} label="Event-Siege" value={data.eventWins} color="text-amber-400" theme={theme} />
        <Tile icon={<Swords className="w-3.5 h-3.5" />} label="Poll-Master" value={data.pollMasterCount} color="text-purple-400" theme={theme} />
        <Tile icon={<Trophy className="w-3.5 h-3.5" />} label="Pokale" value={data.pokaleCount} color="text-pink-400" theme={theme} />
      </div>
    </div>
  );
}

function PokaleCard({ data, theme }: { data: MancaveData; theme: Theme }) {
  return (
    <div className={`space-y-3 ${theme.cardAnim}`}>
      {data.pokale.length > 0 ? (
        <div className="space-y-1.5">
          {data.pokale.slice(0, 5).map(p => (
            <div key={p.id} className={`flex items-center gap-2 text-xs px-2.5 py-2 ${theme.tileRadius} ${theme.tileBorder} bg-white/[0.03]`}>
              <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
              <span className="text-gray-300 truncate">{p.title}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Pokale gewonnen.</p>}
      {data.badges.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.badges.map(b => (
            <span key={b.key} title={`${b.name} — ${b.desc}`}
              className={`w-8 h-8 ${theme.tileRadius} flex items-center justify-center text-base bg-white/[0.04] ${theme.tileBorder}`}>
              {b.icon}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SpieleCard({ data, theme }: { data: MancaveData; theme: Theme }) {
  return (
    <div className={theme.cardAnim}>
      {data.topGames.length > 0 ? (
        <div className="space-y-1.5">
          {data.topGames.slice(0, 5).map(g => (
            <div key={g} className={`flex items-center gap-2 text-xs px-2.5 py-2 ${theme.tileRadius} ${theme.tileBorder} bg-white/[0.03]`}>
              <Gamepad2 className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-gray-300 truncate">{g}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Lieblingsspiele hinterlegt.</p>}
    </div>
  );
}

function AktivitaetCard({ data, theme }: { data: MancaveData; theme: Theme }) {
  return (
    <div className={`grid grid-cols-2 gap-2 ${theme.cardAnim}`}>
      <Tile icon={<Clock className="w-3.5 h-3.5" />} label="Voice-Stunden" value={`${data.voiceHours}h`} color="text-teal-400" theme={theme} />
      <Tile icon={<MessageSquare className="w-3.5 h-3.5" />} label="Nachrichten" value={data.messageCount} color="text-blue-400" theme={theme} />
    </div>
  );
}
