"use client";
import AppIcon from "@/components/AppIcon";
import { CATEGORIES } from "../shared";
import type { EventWizard } from "../useEventWizard";

// ── Step 0: Kategorie (shared) ────────────────────────────────────────────────
export default function StepCategory({ w }: { w: EventWizard }) {
  const { category, setCategory, eventType, setEventType, spectatorMode, setSpectatorMode, isSeriesMode } = w;
  const showSpectatorToggle = category === "competitive" || eventType === "tournament";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">Kategorie</h2>
        <p className="text-xs text-gray-500 mb-4">Was erwartet die Community bei diesem Event?</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button key={cat.value} type="button" onClick={() => setCategory(cat.value)}
              className={`flex flex-col items-center gap-2 rounded-2xl p-4 border-2 transition-all ${
                category === cat.value ? `${cat.border} ${cat.bg}` : "border-white/8 bg-white/3 hover:border-white/15"
              }`}>
              <AppIcon kind="category" name={cat.value} size={32} className="text-2xl" />
              <span className={`text-sm font-semibold ${category === cat.value ? cat.color : "text-gray-400"}`}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-white mb-3">
          {isSeriesMode ? "Typ der Events in der Reihe" : "Event-Typ"}
        </h2>
        <div className={`grid gap-3 ${isSeriesMode ? "grid-cols-1 sm:grid-cols-2" : "flex"}`}>
          {(["community", "tournament"] as const).map(t => (
            <button key={t} type="button" onClick={() => setEventType(t)}
              className={`flex-1 rounded-xl py-3 px-4 text-sm font-medium border-2 transition-all ${
                eventType === t
                  ? "border-teal-500/60 bg-teal-500/10 text-teal-300"
                  : "border-white/8 bg-white/3 text-gray-400 hover:border-white/15"
              }`}>
              {t === "community" ? "🤝 Community-Event" : "⚔️ Turnier"}
            </button>
          ))}
        </div>
      </div>

      {showSpectatorToggle && (
        <div className="rounded-xl p-4 border" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div onClick={() => setSpectatorMode(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 cursor-pointer ${spectatorMode ? "bg-teal-500" : "bg-gray-700"}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${spectatorMode ? "translate-x-5" : ""}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-200">
                {isSeriesMode ? "Zuschauer-Registrierung (Standard für neue Events)" : "Zuschauer-Registrierung aktivieren"}
              </p>
              <p className="text-xs text-gray-500">Community-Mitglieder können sich als Zuschauer anmelden</p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
