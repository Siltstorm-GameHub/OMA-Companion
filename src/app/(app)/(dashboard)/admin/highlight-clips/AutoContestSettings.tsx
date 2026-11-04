"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";

export default function AutoContestSettings({
  initialDays,
  minDays,
  maxDays,
}: {
  initialDays: number;
  minDays: number;
  maxDays: number;
}) {
  const [savedDays, setSavedDays] = useState(initialDays);
  const [input, setInput] = useState(String(initialDays));
  const [saving, setSaving] = useState(false);

  const parsed = Number(input);
  const valid = Number.isInteger(parsed) && parsed >= minDays && parsed <= maxDays;
  const dirty = valid && parsed !== savedDays;

  async function save() {
    if (!valid) {
      toast.error(`Bitte eine ganze Zahl zwischen ${minDays} und ${maxDays} eingeben`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/clip-contest/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoVotingDays: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      setSavedDays(data.autoVotingDays);
      setInput(String(data.autoVotingDays));
      toast.success("Umfragedauer gespeichert");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="font-bold text-white">Automatische Abstimmung</h2>
        <p className="text-xs text-gray-500 mt-1">
          Startet am 1. jedes Monats für den Vormonat. Gilt ab der nächsten automatisch gestarteten Abstimmung —
          laufende Abstimmungen bleiben unverändert.
        </p>
      </div>
      <div className="flex items-end gap-2">
        <div>
          <label className="text-xs text-gray-500 block mb-1">Umfragedauer (Tage)</label>
          <input
            type="number"
            min={minDays}
            max={maxDays}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && dirty && save()}
            className="w-28 rounded-lg px-2 py-1.5 text-sm text-white bg-white/[0.05] border border-white/[0.1] outline-none focus:border-purple-500/40"
          />
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Speichern
        </button>
      </div>
    </div>
  );
}
