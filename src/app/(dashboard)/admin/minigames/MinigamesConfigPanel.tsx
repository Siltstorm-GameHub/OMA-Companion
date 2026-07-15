"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import type { MinigamesConfig } from "@/lib/minigames-config";

export function MinigamesConfigPanel({ initial }: { initial: MinigamesConfig }) {
  const [config, setConfig] = useState<MinigamesConfig>(initial);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof MinigamesConfig>(key: K, value: MinigamesConfig[K]) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/minigames", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      const data = await res.json();
      setConfig(data);
      toast.success("Einstellungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ── Aktivieren/Deaktivieren ── */}
      <div className="glass rounded-2xl divide-y divide-white/5">
        {([
          { key: "predictionEnabled" as const, label: "Event-Sieger-Vorhersage", desc: "Tipp auf den Gesamtsieger eines Events" },
          { key: "duelEnabled" as const, label: "1v1 Münzen-Duell", desc: "User-vs-User-Wette per Münzwurf" },
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

      {/* ── Münzen-Caps ── */}
      <div className="glass rounded-2xl p-4 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Münzen-Caps & Limits</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Vorhersage Höchst-Einsatz" value={config.predictionMaxWager} onChange={v => set("predictionMaxWager", v)} />
          <Field label="Duell Tages-Wettlimit (Münzen)" value={config.duelDailyWagerCap} onChange={v => set("duelDailyWagerCap", v)} />
          <Field label="Duell Mindest-Einsatz" value={config.duelMinWager} onChange={v => set("duelMinWager", v)} />
          <Field label="Duell Höchst-Einsatz" value={config.duelMaxWager} onChange={v => set("duelMaxWager", v)} />
        </div>
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

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="text-xs text-gray-500">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(parseInt(e.target.value, 10) || 0)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
      />
    </label>
  );
}
