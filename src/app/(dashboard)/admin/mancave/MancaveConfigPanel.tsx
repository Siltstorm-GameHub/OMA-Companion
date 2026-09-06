"use client";
import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import type { MancaveConfig } from "@/lib/mancave-config";

export function MancaveConfigPanel({ initial }: { initial: MancaveConfig }) {
  const [config, setConfig] = useState<MancaveConfig>(initial);
  const [saving, setSaving] = useState<"enabled" | "devFreeMode" | null>(null);
  const [resetting, setResetting] = useState(false);

  async function resetAllUpgrades() {
    if (!confirm(
      "Wirklich den kompletten Ausbau-Fortschritt ALLER User zurücksetzen? " +
      "Das löscht jede erreichte Stufe unwiderruflich (Grundausstattung bleibt erhalten)."
    )) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/mancave-reset", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(body.error ?? "Zurücksetzen fehlgeschlagen"); return; }
      toast.success(`${body.deleted} Ausbau-Zeilen zurückgesetzt`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setResetting(false);
    }
  }

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
          <p className="text-sm text-white font-medium">Admin-Testmodus (kostenlose Upgrades)</p>
          <p className="text-xs text-gray-500">
            An = Stufen-Upgrades kosten NUR für Admins nichts, Zurückstufen ist nur für Admins
            möglich. Alle anderen User zahlen immer die echten Münz-Preise (siehe unten) und
            können nicht zurückstufen — keine globale Testphase mehr.
          </p>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          config.devFreeMode ? "text-amber-300 bg-amber-500/10" : "text-gray-500 bg-white/[0.04]"
        }`}>
          {config.devFreeMode ? "Admin-Testmodus" : "Echte Preise"}
        </span>
      </label>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1">
          <p className="text-sm text-white font-medium">Ausbau-Fortschritt zurücksetzen</p>
          <p className="text-xs text-gray-500">
            Löscht alle erreichten Stufen JEDES Users unwiderruflich (Grundausstattung bleibt
            erhalten). Für den einmaligen Übergang von der alten Testphase zu echten Preisen.
          </p>
        </div>
        <button
          type="button"
          onClick={resetAllUpgrades}
          disabled={resetting}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold
                     text-rose-300 bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/15 transition-colors disabled:opacity-50"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {resetting ? "Setzt zurück…" : "Für alle zurücksetzen"}
        </button>
      </div>
    </div>
  );
}
