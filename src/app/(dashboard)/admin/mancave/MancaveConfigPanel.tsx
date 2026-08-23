"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { MancaveConfig } from "@/lib/mancave-config";

export function MancaveConfigPanel({ initial }: { initial: MancaveConfig }) {
  const [config, setConfig] = useState<MancaveConfig>(initial);
  const [saving, setSaving] = useState<"enabled" | "devFreeMode" | null>(null);

  async function patch(field: "mancaveEnabled" | "devFreeMode", checked: boolean) {
    setSaving(field === "mancaveEnabled" ? "enabled" : "devFreeMode");
    const prev = config;
    setConfig({ ...config, [field]: checked });
    try {
      const res = await fetch("/api/admin/mancave-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: checked }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        setConfig(prev);
        return;
      }
      setConfig(await res.json());
      toast.success("Einstellungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
      setConfig(prev);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="glass rounded-2xl divide-y divide-white/5">
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.mancaveEnabled}
          disabled={saving !== null}
          onChange={e => patch("mancaveEnabled", e.target.checked)}
          className="w-4 h-4 accent-teal-500"
        />
        <div className="flex-1">
          <p className="text-sm text-white font-medium">Mancave für alle</p>
          <p className="text-xs text-gray-500">
            Aus = nur Admins sehen die Mancave-Profilseite und den Nav-Eintrag. Die klassische
            Profilseite bleibt davon unberührt.
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          config.mancaveEnabled ? "text-emerald-300 bg-emerald-500/10" : "text-gray-500 bg-white/[0.04]"
        }`}>
          {config.mancaveEnabled ? "Aktiv" : "Deaktiviert"}
        </span>
      </label>
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.devFreeMode}
          disabled={saving !== null}
          onChange={e => patch("devFreeMode", e.target.checked)}
          className="w-4 h-4 accent-amber-500"
        />
        <div className="flex-1">
          <p className="text-sm text-white font-medium">Testphase (kostenlose Upgrades)</p>
          <p className="text-xs text-gray-500">
            An = Stufen-Upgrades kosten für alle nichts, Zurückstufen ist möglich. Aus = echte
            Münz-Preise (siehe unten) gelten, Zurückstufen ist gesperrt.
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          config.devFreeMode ? "text-amber-300 bg-amber-500/10" : "text-gray-500 bg-white/[0.04]"
        }`}>
          {config.devFreeMode ? "Testphase" : "Echte Preise"}
        </span>
      </label>
    </div>
  );
}
