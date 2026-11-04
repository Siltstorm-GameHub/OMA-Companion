"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CommunityGoalEditor, { formToGoal, goalToForm, type CommunityGoalForm } from "@/components/CommunityGoalEditor";
import { goalUnit, type CommunityGoal } from "@/lib/community-goal";
import type { EventGoalSource } from "@/lib/event-goal";
import { Save } from "@/components/icons";

type Mode = "inherit" | "override" | "off";

const fmt = (n: number) => n.toLocaleString("de-DE");
const goalSummary = (g: CommunityGoal) =>
  `${g.title ? `${g.title} · ` : ""}${fmt(g.target)} ${goalUnit(g)}${g.rewardCoins ? ` · ${g.rewardCoins} Münzen` : ""}`;

/**
 * Community-Ziel eines Termins einer Eventreihe: Standard ist das Ziel der Reihe (wird automatisch
 * übernommen). Nur bei Bedarf überschreiben oder für diesen Termin abschalten. Speichert über
 * PATCH /api/events/[id]/goal, ohne die übrige Turnier-Konfiguration anzufassen (lib/event-goal.ts).
 */
export default function EventGoalPanel({ eventId, source, ownGoal, seriesGoal, statFields }: {
  eventId: string;
  source: EventGoalSource;
  ownGoal: CommunityGoal | null;
  seriesGoal: CommunityGoal | null;
  statFields: string[];
}) {
  const router = useRouter();
  const initialMode: Mode = source === "event" ? "override" : source === "off" ? "off" : "inherit";
  const [mode, setMode] = useState<Mode>(initialMode);
  // Eigenes Ziel: mit dem bisherigen eigenen Ziel vorbelegen, sonst mit dem der Reihe als Startpunkt
  const [form, setForm] = useState<CommunityGoalForm>(() => goalToForm(ownGoal ?? seriesGoal));
  const [saving, setSaving] = useState(false);

  async function save() {
    const goal = mode === "override" ? formToGoal({ ...form, enabled: true }, statFields) : null;
    if (mode === "override" && !goal) {
      toast.error("Ziel unvollständig — wähle mindestens ein Stat-Feld und eine Zielmarke über 0");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/events/${eventId}/goal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, goal }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(mode === "inherit" ? "Termin übernimmt das Ziel der Reihe" : mode === "off" ? "Kein Ziel für diesen Termin" : "Eigenes Ziel für diesen Termin gespeichert");
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Fehler beim Speichern");
    }
  }

  const option = (value: Mode, label: string, hint: string) => (
    <button type="button" onClick={() => setMode(value)}
      className={`flex-1 min-w-[150px] text-left rounded-lg p-2.5 border transition-colors ${
        mode === value ? "border-teal-500/60 bg-teal-500/10" : "border-white/[0.08] bg-white/[0.02] hover:border-white/15"
      }`}>
      <span className={`block text-sm font-semibold ${mode === value ? "text-teal-200" : "text-gray-300"}`}>{label}</span>
      <span className="block text-[11px] text-gray-500">{hint}</span>
    </button>
  );

  return (
    <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-200">🎯 Community-Ziel dieses Termins</p>
        <p className="text-[11px] text-gray-500">
          Termine übernehmen automatisch das Ziel der Eventreihe. Hier kannst du es für diesen einen Termin ändern.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {option("inherit", "Ziel der Reihe", seriesGoal ? goalSummary(seriesGoal) : "Die Reihe hat (noch) kein Ziel")}
        {option("override", "Eigenes Ziel", "Nur für diesen Termin")}
        {option("off", "Kein Ziel", "Dieser Termin ohne Ziel")}
      </div>

      {mode === "override" && (
        <CommunityGoalEditor value={{ ...form, enabled: true }} onChange={f => setForm({ ...f, enabled: true })} statFields={statFields} />
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Speichert…" : "Speichern"}
        </button>
      </div>
    </div>
  );
}
