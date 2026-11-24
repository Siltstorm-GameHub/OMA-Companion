"use client";
import AppIcon from "@/components/AppIcon";
import { Glyph } from "@/components/ui/Glyph";
import { EVENT_KIND_LABEL, type EventKind } from "@/lib/event-placement";
import type { EventCategory } from "@prisma/client";
import { CATEGORIES } from "../shared";
import type { EventWizard } from "../useEventWizard";

const KINDS: { value: EventKind; desc: string }[] = [
  { value: "tournament", desc: "Es gibt eine Rangliste und Sieger. Belohnungen gibt es je nach Platz, dazu die Teilnahme-Belohnung." },
  { value: "community",  desc: "Alle spielen zusammen, es gibt keinen Sieger. Jeder bekommt die Teilnahme-Belohnung." },
];

/** Vorlagen für den Einstieg: setzen Typ und Kategorie, beides bleibt darunter einzeln änderbar. */
const PRESETS: { key: string; emoji: string; label: string; desc: string; kind: EventKind | null; category: EventCategory }[] = [
  { key: "tournament", emoji: "🏆", label: "Turnier",      desc: "Ernsthaft um den Sieg",               kind: "tournament", category: "competitive" },
  { key: "fun",        emoji: "🎉", label: "Fun-Turnier",  desc: "Mit Sieger, aber Spaß geht vor",      kind: "tournament", category: "fun" },
  { key: "gamenight",  emoji: "🎮", label: "Spieleabend",  desc: "Zusammen zocken, ohne Platzierung",   kind: "community",  category: "fun" },
  { key: "training",   emoji: "🎓", label: "Training",     desc: "Üben und voneinander lernen",         kind: "community",  category: "training" },
  // Special: Anlass statt Spielweise — Typ bleibt, wie er ist (unten wählbar)
  { key: "special",    emoji: "⭐", label: "Special",      desc: "Besonderer Anlass, frei kombinierbar", kind: null,         category: "special" },
];

// ── Schritt 1: Was für ein Event? Vorlage → Typ (Turnier / Freies Spiel) und Kategorie ─────────────
// Die Vorlage ist nur ein Schnellweg; wer will, stellt darunter Typ und Kategorie einzeln ein.
export default function StepCategory({ w }: { w: EventWizard }) {
  const { category, setCategory, eventType, setEventType, spectatorMode, setSpectatorMode, isSeriesMode } = w;
  const showSpectatorToggle = category === "competitive" || eventType === "tournament";
  const activePreset = PRESETS.find(p => p.category === category && (p.kind === null || p.kind === eventType))?.key ?? null;
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-fg mb-1">{isSeriesMode ? "Was für eine Reihe?" : "Was für ein Event?"}</h2>
        <p className="text-xs text-subtle mb-4">Wähle eine Vorlage — darunter kannst du alles noch anpassen.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {PRESETS.map(p => {
            const on = activePreset === p.key;
            return (
              <button key={p.key} type="button" aria-pressed={on}
                onClick={() => { setCategory(p.category); if (p.kind) setEventType(p.kind); }}
                className={`flex flex-col items-start gap-1 rounded-card p-3 border-2 text-left transition-all ${
                  on ? "border-primary/60 bg-primary/10" : "border-line bg-surface-2 hover:border-line-strong"
                }`}>
                <span aria-hidden className="text-2xl leading-none">{p.emoji}</span>
                <span className={`text-sm font-semibold ${on ? "text-primary-fg" : "text-fg"}`}>{p.label}</span>
                <span className="text-xs leading-snug text-subtle">{p.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5 rounded-card border border-line bg-surface p-4">
        <div>
          <h3 className="text-sm font-semibold text-fg mb-1">{isSeriesMode ? "Gibt es bei den Terminen Sieger?" : "Gibt es Sieger?"}</h3>
          <p className="text-xs text-subtle mb-3">Das legt fest, ob am Ende eine Platzierung eingetragen wird.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {KINDS.map(k => {
              const on = eventType === k.value;
              const meta = EVENT_KIND_LABEL[k.value];
              return (
                <button key={k.value} type="button" onClick={() => setEventType(k.value)} aria-pressed={on}
                  className={`text-left rounded-card p-3 border-2 transition-all ${
                    on ? "border-primary/60 bg-primary/10" : "border-line bg-surface-2 hover:border-line-strong"
                  }`}>
                  <span className={`flex items-center gap-2 text-sm font-semibold ${on ? "text-primary-fg" : "text-fg"}`}>
                    <span className={`grid size-7 place-items-center rounded-full bg-canvas ${meta.tone}`}><Glyph name={meta.glyph} className="size-4" /></span>
                    {meta.label}
                    <span className="text-xs font-normal text-subtle">· {meta.short}</span>
                  </span>
                  <span className="mt-1.5 block text-xs text-muted leading-relaxed">{k.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-fg mb-1">Kategorie</h3>
          <p className="text-xs text-subtle mb-3">Was erwartet die Mitspieler? Die Kategorie steht auf der Event-Karte.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {CATEGORIES.map(cat => (
              <button key={cat.value} type="button" onClick={() => setCategory(cat.value)} aria-pressed={category === cat.value}
                className={`flex flex-col items-center gap-1.5 rounded-card p-3 border-2 transition-all text-center ${
                  category === cat.value ? `${cat.border} ${cat.bg}` : "border-line bg-surface-2 hover:border-line-strong"
                }`}>
                <AppIcon kind="category" name={cat.value} size={28} className="text-2xl" />
                <span className={`text-sm font-semibold ${category === cat.value ? cat.color : "text-fg/90"}`}>{cat.label}</span>
                <span className="text-xs leading-snug text-subtle">{cat.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSpectatorToggle && (
        <div className="rounded-control p-4 border" style={{ borderColor: "var(--color-line)", background: "var(--color-surface-2)" }}>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={spectatorMode} onChange={e => setSpectatorMode(e.target.checked)} className="peer sr-only" />
            <span aria-hidden
              className={`relative w-10 h-5 rounded-full transition-colors shrink-0 peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${spectatorMode ? "bg-primary" : "bg-gray-700"}`}>
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${spectatorMode ? "translate-x-5" : ""}`} />
            </span>
            <span>
              <span className="block text-sm font-medium text-fg">
                {isSeriesMode ? "Zuschauer zulassen (Standard für neue Termine)" : "Zuschauer zulassen"}
              </span>
              <span className="block text-xs text-subtle">Mitglieder können sich auch als Zuschauer anmelden und bekommen dafür eine kleine Belohnung.</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
