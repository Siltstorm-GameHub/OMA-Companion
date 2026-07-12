"use client";
import { useState } from "react";
import { Info, Trophy } from "lucide-react";
import CoinIcon from "@/components/CoinIcon";
import { Modal } from "@/components/ui/Modal";

const RANKS = [
  { label: "Neuling",               emoji: "🔰", range: "0 – 99",    color: "text-gray-400"   },
  { label: "Zivi-Anwärter",         emoji: "📋", range: "100 – 199", color: "text-zinc-300"   },
  { label: "Rollator-Führerschein", emoji: "🛺", range: "200 – 299", color: "text-green-400"  },
  { label: "Kamillenteetrinker",    emoji: "🍵", range: "300 – 399", color: "text-teal-400"   },
  { label: "Heimbeirat",            emoji: "🏛️", range: "400 – 499", color: "text-blue-400"   },
  { label: "Pflegestufe 5",         emoji: "🩺", range: "500 – 999", color: "text-purple-400" },
  { label: "Old Master",            emoji: "👴", range: "1.000+",    color: "text-amber-400"  },
];

const COIN_SOURCES = [
  {
    group: "🎰 Shop & Belohnungen",
    items: [
      { label: "Tages-Spin",            note: "Einmal täglich", value: "bis 500" },
      { label: "Quest abschließen",      note: "Monatliche Quests", value: "variabel" },
      { label: "Geburtstag 🎂",         note: "Einmal pro Jahr + 24h Boost ×2", value: "150" },
      { label: "Erstes Login",           note: "Einmalig", value: "100" },
    ],
  },
  {
    group: "🎙️ Discord-Aktivität",
    items: [
      { label: "Sprachkanal",            note: "Pro Stunde (max. 6h/Tag)", value: "15" },
      { label: "Täglich im Voice aktiv", note: "Tages-Bonus",           value: "30" },
      { label: "10 Nachrichten",         note: "Max. 50 Nachrichten/Tag", value: "8" },
      { label: "Täglich im Chat aktiv",  note: "Tages-Bonus",           value: "20" },
      { label: "Reaktion erhalten",      note: "Max. 20 Pts/Tag",        value: "2" },
    ],
  },
];

export default function PointsInfoModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Punktesystem erklären"
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all"
      >
        <Info className="w-3.5 h-3.5" />
        Info
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Punktesystem" size="sm">
            <div className="space-y-5">

              {/* Zwei Währungen */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-amber-500/8 border border-amber-500/15 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CoinIcon size={16} />
                    <p className="text-sm font-bold text-amber-400">Münzen</p>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Shop-Währung. Damit kaufst du Figuren und Items im Shop.</p>
                </div>
                <div className="rounded-xl bg-rose-500/8 border border-rose-500/15 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Trophy className="w-4 h-4 text-rose-400 shrink-0" />
                    <p className="text-sm font-bold text-rose-400">Rang-Punkte</p>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">Prestige-Währung. Bestimmt deinen Rang in der Gesamtrangliste.</p>
                </div>
              </div>

              {/* Ränge */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="w-3.5 h-3.5 text-rose-400" />
                  <p className="text-xs font-semibold text-rose-400 uppercase tracking-widest">Ränge (Rang-Punkte)</p>
                </div>
                <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] divide-y divide-white/[0.04]">
                  {RANKS.map(r => (
                    <div key={r.label} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{r.emoji}</span>
                        <span className={`text-sm font-semibold ${r.color}`}>{r.label}</span>
                      </div>
                      <span className="text-xs text-gray-500 tabular-nums">{r.range} Pts</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Münzen verdienen */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CoinIcon size={14} />
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-widest">Münzen verdienen</p>
                </div>
                <div className="space-y-2">
                  {COIN_SOURCES.map(group => (
                    <div key={group.group}>
                      <p className="text-[10px] text-gray-600 font-medium mb-1 ml-1">{group.group}</p>
                      <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] divide-y divide-white/[0.04]">
                        {group.items.map(s => (
                          <div key={s.label} className="flex items-center justify-between px-3 py-2.5 gap-3">
                            <div className="min-w-0">
                              <p className="text-xs text-gray-200">{s.label}</p>
                              <p className="text-[10px] text-gray-600">{s.note}</p>
                            </div>
                            <span className="text-xs font-bold text-amber-400 shrink-0 tabular-nums">+{s.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
      </Modal>
    </>
  );
}
