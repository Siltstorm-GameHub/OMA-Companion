"use client";
import { useState } from "react";
import Image from "next/image";
import { BarChart3, Trophy, Gamepad2, Activity, CalendarDays, Medal, Swords, Clock, MessageSquare } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import RankIcon from "@/components/RankIcon";
import CoinIcon from "@/components/CoinIcon";
import type { MancaveData } from "./mancave-data";

type Tab = "stats" | "pokale" | "spiele" | "aktivitaet";

const TABS: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
  { key: "stats",      label: "Statistik",  icon: BarChart3 },
  { key: "pokale",     label: "Pokale",     icon: Trophy },
  { key: "spiele",     label: "Spiele",     icon: Gamepad2 },
  { key: "aktivitaet", label: "Aktivität",  icon: Activity },
];

/**
 * "Smartphone-in-Hand": kein erzwungener 3D-Raum auf kleinen Screens, sondern
 * ein Phone-Frame mit App-Grid-Dashboard darin — App-Kacheln wechseln den
 * Inhaltsbereich, Gadgets aus dem Gaming-Zimmer laufen als horizontale
 * Sammlung unterhalb des Geräts.
 */
export default function MancaveMobileApp({ data }: { data: MancaveData }) {
  const [tab, setTab] = useState<Tab>("stats");

  return (
    <div className="space-y-4">
      {/* ── Phone Frame ──────────────────────────────────────────────── */}
      <div className="mx-auto max-w-sm rounded-[2rem] p-2.5 border border-white/[0.08]"
        style={{ background: "linear-gradient(180deg,#0a1018,#050810)", boxShadow: "0 0 0 1px rgba(45,212,191,0.06), 0 20px 50px rgba(0,0,0,0.5)" }}>
        <div className="rounded-[1.5rem] overflow-hidden" style={{ background: "#050810" }}>

          {/* Notch */}
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-20 h-4 rounded-full" style={{ background: "#0a1018" }} />
          </div>

          {/* Header */}
          <div className="px-4 pt-1 pb-4 relative">
            <div className="absolute inset-x-0 top-0 h-24" style={{ background: "radial-gradient(circle at 50% 0%, rgba(45,212,191,0.14), transparent 70%)" }} />
            <div className="relative flex items-center gap-3">
              <RankedAvatar rankPoints={data.rankPoints} src={data.avatarUrl} alt={data.displayName} size={52} rounded="2xl" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white truncate">{data.displayName}</p>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${data.rankColor} mt-0.5`}>
                  <RankIcon rankPoints={data.rankPoints} size="xs" showPips={false} /> {data.rankLabel}
                </span>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }} />
                  <span className="text-[10px] text-gray-500">Mitglied seit {data.memberSince}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] text-gray-500 uppercase tracking-widest">Rang</p>
                <p className="text-lg font-black text-white tabular-nums leading-none">#{data.leaderboardRank}</p>
              </div>
            </div>
            <div className="relative mt-3 h-1.5 rounded-full overflow-hidden bg-white/[0.06]">
              <div className="h-full rounded-full" style={{ width: `${data.rankPct}%`, background: "linear-gradient(90deg,#14b8a6,#2dd4bf)" }} />
            </div>
          </div>

          {/* App-Grid */}
          <div className="grid grid-cols-4 gap-2 px-4 pb-3">
            {TABS.map(t => {
              const active = tab === t.key;
              const Icon = t.icon;
              return (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="flex flex-col items-center gap-1.5 py-2.5 rounded-2xl transition-colors"
                  style={{ background: active ? "rgba(45,212,191,0.14)" : "rgba(255,255,255,0.03)", border: active ? "1px solid rgba(45,212,191,0.3)" : "1px solid transparent" }}>
                  <Icon className={`w-4 h-4 ${active ? "text-teal-300" : "text-gray-500"}`} />
                  <span className={`text-[9px] font-medium ${active ? "text-teal-300" : "text-gray-500"}`}>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content-Bereich: wischbare Karte je Tab */}
          <div className="px-4 pb-5 min-h-[220px]">
            {tab === "stats" && <StatsCard data={data} />}
            {tab === "pokale" && <PokaleCard data={data} />}
            {tab === "spiele" && <SpieleCard data={data} />}
            {tab === "aktivitaet" && <AktivitaetCard data={data} />}
          </div>
        </div>
      </div>

      {/* ── Gadgets unterhalb des Geräts ─────────────────────────────── */}
      {data.gadgets.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-1">🎮 Deine Gadgets</p>
          <div className="flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
            {data.gadgets.map(g => (
              <div key={g.key} className="shrink-0 w-20 flex flex-col items-center gap-1.5 p-2.5 rounded-xl glass">
                {g.imageUrl
                  ? <Image src={g.imageUrl} alt="" width={40} height={40} className="w-10 h-10 object-contain" />
                  : <div className="w-10 h-10 rounded-lg bg-teal-500/10" />}
                <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2">{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Tile({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.03]">
      <span className={color}>{icon}</span>
      <div className="min-w-0">
        <p className="text-base font-bold text-white tabular-nums leading-none">{value}</p>
        <p className="text-[10px] text-gray-500 mt-0.5 truncate">{label}</p>
      </div>
    </div>
  );
}

function StatsCard({ data }: { data: MancaveData }) {
  return (
    <div className="space-y-2.5 animate-fade-in">
      <div className="flex items-center gap-1.5">
        <CoinIcon size={13} />
        <span className="text-sm text-amber-400 font-medium tabular-nums">{data.totalPoints.toLocaleString("de-DE")} Münzen</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Tile icon={<CalendarDays className="w-3.5 h-3.5" />} label="Events" value={data.eventCount} color="text-emerald-400" />
        <Tile icon={<Medal className="w-3.5 h-3.5" />} label="Event-Siege" value={data.eventWins} color="text-amber-400" />
        <Tile icon={<Swords className="w-3.5 h-3.5" />} label="Poll-Master" value={data.pollMasterCount} color="text-purple-400" />
        <Tile icon={<Trophy className="w-3.5 h-3.5" />} label="Pokale" value={data.pokaleCount} color="text-pink-400" />
      </div>
    </div>
  );
}

function PokaleCard({ data }: { data: MancaveData }) {
  return (
    <div className="space-y-3 animate-fade-in">
      {data.pokale.length > 0 ? (
        <div className="space-y-1.5">
          {data.pokale.slice(0, 5).map(p => (
            <div key={p.id} className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-xl bg-white/[0.03]">
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
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base bg-white/[0.04] border border-white/[0.06]">
              {b.icon}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SpieleCard({ data }: { data: MancaveData }) {
  return (
    <div className="animate-fade-in">
      {data.topGames.length > 0 ? (
        <div className="space-y-1.5">
          {data.topGames.slice(0, 5).map(g => (
            <div key={g} className="flex items-center gap-2 text-xs px-2.5 py-2 rounded-xl bg-white/[0.03]">
              <Gamepad2 className="w-3 h-3 text-blue-400 shrink-0" />
              <span className="text-gray-300 truncate">{g}</span>
            </div>
          ))}
        </div>
      ) : <p className="text-xs text-gray-600">Noch keine Lieblingsspiele hinterlegt.</p>}
    </div>
  );
}

function AktivitaetCard({ data }: { data: MancaveData }) {
  return (
    <div className="grid grid-cols-2 gap-2 animate-fade-in">
      <Tile icon={<Clock className="w-3.5 h-3.5" />} label="Voice-Stunden" value={`${data.voiceHours}h`} color="text-teal-400" />
      <Tile icon={<MessageSquare className="w-3.5 h-3.5" />} label="Nachrichten" value={data.messageCount} color="text-blue-400" />
    </div>
  );
}
