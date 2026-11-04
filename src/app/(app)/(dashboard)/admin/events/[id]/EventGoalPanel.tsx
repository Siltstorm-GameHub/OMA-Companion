"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CommunityGoalEditor, { formToGoal, goalToForm, type CommunityGoalForm } from "@/components/CommunityGoalEditor";
import type { CommunityGoal } from "@/lib/community-goal";
import { Save } from "@/components/icons";

/**
 * Community-Ziel eines einzelnen Termins anpassen — für Termine einer Reihe mit festem Spiel, die
 * keinen eigenen "Turnier"-Reiter haben. Vorbelegt mit dem Ziel des Termins (das beim Anlegen aus
 * der Turniervorlage der Reihe kommt). Speichert über PATCH /api/events/[id]/goal, ohne die übrige
 * Turnier-Konfiguration anzufassen.
 */
export default function EventGoalPanel({ eventId, initialGoal, statFields }: {
  eventId: string;
  initialGoal: CommunityGoal | null;
  statFields: string[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<CommunityGoalForm>(() => goalToForm(initialGoal));
  const [saving, setSaving] = useState(false);

  async function save() {
    const goal = formToGoal(form, statFields);
    if (form.enabled && !goal) {
      toast.error("Ziel unvollständig — wähle mindestens ein Stat-Feld und eine Zielmarke über 0");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/events/${eventId}/goal`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success(goal ? "Community-Ziel für diesen Termin gespeichert" : "Community-Ziel entfernt");
      router.refresh();
    } else {
      toast.error((await res.json().catch(() => null))?.error ?? "Fehler beim Speichern");
    }
  }

  return (
    <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-4 space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-200">Community-Ziel dieses Termins</p>
        <p className="text-[11px] text-gray-500">
          Gilt nur für diesen Termin. Neue Termine übernehmen das Ziel aus der Turniervorlage der Reihe.
        </p>
      </div>
      <CommunityGoalEditor value={form} onChange={setForm} statFields={statFields} />
      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving}
          className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50">
          <Save className="w-4 h-4" /> {saving ? "Speichert…" : "Ziel speichern"}
        </button>
      </div>
    </div>
  );
}
