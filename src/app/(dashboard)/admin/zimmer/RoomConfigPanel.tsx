"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { RoomConfig } from "@/lib/room-config";

export function RoomConfigPanel({ initial }: { initial: RoomConfig }) {
  const [config, setConfig] = useState<RoomConfig>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof RoomConfig>(key: K, value: RoomConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/room-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setConfig(await res.json());
      toast.success("Einstellungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl divide-y divide-white/5">
        {([
          {
            key: "roomEnabled" as const, label: "Gaming-Zimmer für alle",
            desc: "Aus = nur Admins sehen Zimmer, Möbel-Shop und Nav-Eintrag",
          },
          {
            key: "jobsEnabled" as const, label: "Idle-Jobs",
            desc: "Bewerben, Lohn abholen und kündigen an der Jobbörse",
          },
        ]).map(item => (
          <label key={item.key} className="flex items-center gap-3 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={config[item.key]}
              onChange={e => set(item.key, e.target.checked)}
              className="w-4 h-4 accent-teal-500"
            />
            <div className="flex-1">
              <p className="text-sm text-white font-medium">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              config[item.key] ? "text-emerald-300 bg-emerald-500/10" : "text-gray-500 bg-white/[0.04]"
            }`}>
              {config[item.key] ? "Aktiv" : "Deaktiviert"}
            </span>
          </label>
        ))}
      </div>

      <div className="glass rounded-2xl p-4 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Lohn-Balancing</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Lohn-Deckel (Stunden)" min={1} max={168}
            hint="Danach verfällt unabgeholter Lohn"
            value={config.wageCapHours} onChange={v => set("wageCapHours", v)}
          />
          <Field
            label="Lohn-Multiplikator (%)" min={0} max={500}
            hint="100 = unverändert, 70 = alle Jobs 30 % schwächer"
            value={config.wageMultiplierPct} onChange={v => set("wageMultiplierPct", v)}
          />
          <Field
            label="Wechselsperre (Stunden)" min={0} max={168}
            hint="Nach der Einstellung, bevor gewechselt werden darf"
            value={config.hireLockHours} onChange={v => set("hireLockHours", v)}
          />
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Zum Vergleich: eine Stunde im Sprachkanal bringt 15 Münzen (max. 90/Tag).
          Beim aktuellen Deckel bringt der Einstiegsjob {3 * config.wageCapHours * config.wageMultiplierPct / 100} Münzen
          pro Abholung, der Spitzenjob {42 * config.wageCapHours * config.wageMultiplierPct / 100}.
        </p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Zimmer-Ausbaustufen</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field
            label="Schwelle Stufe 2" min={1} max={10_000_000}
            hint="Investitionssumme (Münzen), ab der Stufe 2 beginnt"
            value={config.levelThresholds[0]}
            onChange={v => set("levelThresholds", [v, config.levelThresholds[1], config.levelThresholds[2]])}
          />
          <Field
            label="Schwelle Stufe 3" min={1} max={10_000_000}
            hint="Investitionssumme (Münzen), ab der Stufe 3 beginnt"
            value={config.levelThresholds[1]}
            onChange={v => set("levelThresholds", [config.levelThresholds[0], v, config.levelThresholds[2]])}
          />
          <Field
            label="Schwelle Stufe 4" min={1} max={10_000_000}
            hint="Investitionssumme (Münzen), ab der Stufe 4 (voll ausgebaut) beginnt"
            value={config.levelThresholds[2]}
            onChange={v => set("levelThresholds", [config.levelThresholds[0], config.levelThresholds[1], v])}
          />
        </div>
        <p className="text-[11px] text-gray-600 leading-relaxed">
          Stufe 1 (Grundausstattung) beginnt immer bei 0. Jede Schwelle muss größer sein als die vorherige — eine
          ungültige Reihenfolge wird beim Speichern verworfen. Zählt aufgestellte UND eingelagerte Möbel zusammen.
        </p>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        <Save className="w-4 h-4" />
        {saving ? "Speichert…" : "Speichern"}
      </button>
    </div>
  );
}

function Field({
  label, value, onChange, min, max, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type="number" min={min} max={max} value={value}
        onChange={e => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
        }}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
      />
      {hint && <span className="block text-[10px] text-gray-600 mt-1 leading-snug">{hint}</span>}
    </label>
  );
}
