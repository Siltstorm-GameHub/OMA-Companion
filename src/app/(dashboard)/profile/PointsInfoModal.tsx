"use client";
import { useState } from "react";
import { Info, X } from "lucide-react";
import { POINT_RULES, DAILY_CAPS, CATEGORY_LABELS, type PointCategory } from "@/lib/points";

const CATEGORY_ICONS: Record<PointCategory, string> = {
  turnier:    "⚔️",
  event:      "📅",
  aktivitaet: "🎙️",
  streak:     "🔥",
  community:  "👥",
};

const RANKS = [
  { label: "Neuling",     range: "0 – 499",         color: "text-gray-400",    dot: "bg-gray-400",    est: "Erste Tage" },
  { label: "Kämpfer",     range: "500 – 2.999",      color: "text-emerald-400", dot: "bg-emerald-400", est: "~2–3 Wochen" },
  { label: "Veteran",     range: "3.000 – 9.999",    color: "text-blue-400",    dot: "bg-blue-400",    est: "~2–3 Monate" },
  { label: "Elite",       range: "10.000 – 24.999",  color: "text-purple-400",  dot: "bg-purple-400",  est: "~6 Monate" },
  { label: "Legende",     range: "25.000 – 59.999",  color: "text-amber-400",   dot: "bg-amber-400",   est: "~1 Jahr" },
  { label: "Grandmaster", range: "60.000+",           color: "text-red-400",     dot: "bg-red-400",     est: "2+ Jahre" },
];

// Regeln nach Kategorie gruppieren
const byCategory = Object.entries(POINT_RULES).reduce<
  Record<string, { key: string; rule: (typeof POINT_RULES)[keyof typeof POINT_RULES]; cap?: number }[]>
>((acc, [key, rule]) => {
  const cat = rule.category;
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push({ key, rule, cap: DAILY_CAPS[key as keyof typeof DAILY_CAPS] });
  return acc;
}, {});

export default function PointsInfoModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Trigger */}
      <button
        onClick={() => setOpen(true)}
        title="Punktesystem erklären"
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white border border-white/10 hover:border-white/20 px-2.5 py-1.5 rounded-lg transition-all"
      >
        <Info className="w-3.5 h-3.5" />
        Punktesystem
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          {/* Modal */}
          <div
            className="relative bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
              <h2 className="font-semibold text-white">Punktesystem</h2>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content — scrollable */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

              {/* Ränge */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-2">Ränge</p>
                <div className="space-y-1">
                  {RANKS.map(r => (
                    <div key={r.label} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${r.dot}`} />
                        <span className={`text-sm font-semibold ${r.color}`}>{r.label}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">{r.range} Pts</p>
                        <p className="text-[10px] text-gray-700">{r.est}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-white/5" />

              {/* Punkte pro Aktion */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">Punkte pro Aktion</p>
                <div className="space-y-4">
                  {Object.entries(byCategory).map(([cat, rules]) => (
                    <div key={cat}>
                      <p className="text-xs text-gray-600 mb-1.5 flex items-center gap-1.5">
                        <span>{CATEGORY_ICONS[cat as PointCategory]}</span>
                        {CATEGORY_LABELS[cat as PointCategory]}
                      </p>
                      <div className="space-y-1">
                        {rules.map(({ key, rule, cap }) => (
                          <div key={key} className="flex items-center justify-between py-1">
                            <div className="min-w-0 pr-3">
                              <span className="text-xs text-gray-300">{rule.reason}</span>
                              {cap !== undefined && (
                                <span className="text-[10px] text-gray-600 ml-1.5">
                                  (max {cap} Pts/Tag)
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-bold text-rose-400 shrink-0">+{rule.amount}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
