"use client";
import AppIcon from "@/components/AppIcon";
import { CATEGORIES } from "../shared";
import type { EventWizard } from "../useEventWizard";

const KINDS = [
  {
    value: "tournament" as const, emoji: "🏆", label: "Mit Platzierung",
    desc: "Es gibt eine Rangliste und Sieger. Belohnungen gibt es je nach Platz, dazu die Teilnahme-Belohnung.",
  },
  {
    value: "community" as const, emoji: "🤝", label: "Ohne Platzierung",
    desc: "Alle spielen zusammen, es gibt keinen Sieger. Jeder bekommt die Teilnahme-Belohnung.",
  },
];

// ── Schritt 1: Art (mit/ohne Platzierung) und Kategorie — für Einzel-Event und Reihe ─────────────
// Zuerst die Frage, die alles Weitere bestimmt (gibt es Sieger?), danach die Stimmung des Events.
export default function StepCategory({ w }: { w: EventWizard }) {
  const { category, setCategory, eventType, setEventType, spectatorMode, setSpectatorMode, isSeriesMode } = w;
  const showSpectatorToggle = category === "competitive" || eventType === "tournament";
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-white mb-1">{isSeriesMode ? "Gibt es bei den Terminen Sieger?" : "Gibt es Sieger?"}</h2>
        <p className="text-xs text-gray-500 mb-4">Das legt fest, ob am Ende eine Platzierung eingetragen wird.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {KINDS.map(k => {
            const on = eventType === k.value;
            return (
              <button key={k.value} type="button" onClick={() => setEventType(k.value)} aria-pressed={on}
                className={`text-left rounded-2xl p-4 border-2 transition-all ${
                  on ? "border-primary/60 bg-primary/10" : "border-line bg-surface-2 hover:border-line-strong"
                }`}>
                <span className={`flex items-center gap-2 text-sm font-semibold ${on ? "text-primary-fg" : "text-gray-200"}`}>
                  <span aria-hidden className="text-xl">{k.emoji}</span> {k.label}
                </span>
                <span className="mt-1.5 block text-xs text-gray-400 leading-relaxed">{k.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-white mb-1">Kategorie</h2>
        <p className="text-xs text-gray-500 mb-4">Was erwartet die Mitspieler? Die Kategorie steht auf der Event-Karte.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CATEGORIES.map(cat => (
            <button key={cat.value} type="button" onClick={() => setCategory(cat.value)} aria-pressed={category === cat.value}
              className={`flex flex-col items-center gap-1.5 rounded-2xl p-3 border-2 transition-all text-center ${
                category === cat.value ? `${cat.border} ${cat.bg}` : "border-line bg-surface-2 hover:border-line-strong"
              }`}>
              <AppIcon kind="category" name={cat.value} size={28} className="text-2xl" />
              <span className={`text-sm font-semibold ${category === cat.value ? cat.color : "text-gray-300"}`}>{cat.label}</span>
              <span className="text-xs leading-snug text-gray-500">{cat.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {showSpectatorToggle && (
        <div className="rounded-xl p-4 border" style={{ borderColor: "var(--color-line)", background: "var(--color-surface-2)" }}>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={spectatorMode} onChange={e => setSpectatorMode(e.target.checked)} className="peer sr-only" />
            <span aria-hidden
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${spectatorMode ? "bg-primary" : "bg-gray-700"}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${spectatorMode ? "translate-x-5" : ""}`} />
            </span>
            <span>
              <span className="block text-sm font-medium text-gray-200">
                {isSeriesMode ? "Zuschauer zulassen (Standard für neue Termine)" : "Zuschauer zulassen"}
              </span>
              <span className="block text-xs text-gray-500">Mitglieder können sich auch als Zuschauer anmelden und bekommen dafür eine kleine Belohnung.</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
