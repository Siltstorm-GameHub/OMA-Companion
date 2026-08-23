"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { MancaveConfig } from "@/lib/mancave-config";

export function MancaveConfigPanel({ initial }: { initial: MancaveConfig }) {
  const [config, setConfig] = useState<MancaveConfig>(initial);
  const [saving, setSaving] = useState(false);

  async function toggle(checked: boolean) {
    setSaving(true);
    setConfig({ mancaveEnabled: checked });
    try {
      const res = await fetch("/api/admin/mancave-config", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mancaveEnabled: checked }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        setConfig(initial);
        return;
      }
      setConfig(await res.json());
      toast.success("Einstellungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
      setConfig(initial);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-2xl divide-y divide-white/5">
      <label className="flex items-center gap-3 px-4 py-3 cursor-pointer">
        <input
          type="checkbox"
          checked={config.mancaveEnabled}
          disabled={saving}
          onChange={e => toggle(e.target.checked)}
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
    </div>
  );
}
