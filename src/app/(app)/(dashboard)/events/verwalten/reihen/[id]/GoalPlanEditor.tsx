"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CommunityGoalEditor from "@/components/CommunityGoalEditor";
import { EMPTY_COMMUNITY_GOAL_FORM, formToGoal, goalToForm, type CommunityGoalForm } from "@/lib/community-goal-form";
import type { CommunityGoal } from "@/lib/community-goal";
import { goalSummary } from "../../[id]/EventGoalPanel";
import { ChevronDown, ChevronUp, X } from "@/components/icons";

/**
 * Ziel-Planung einer Eventreihe (lib/goal-plan.ts): Ziele für die nächsten, noch nicht angelegten
 * Zyklen. Jeder neu angelegte Termin übernimmt das oberste Ziel als eigenes Ziel und es fällt aus der
 * Liste; ist sie leer, gilt das Ziel der Reihe. Speichert direkt über PUT /api/admin/event-series/goal-plan.
 */
export default function GoalPlanEditor({ seriesId, initialPlan, goalFields, disabled, goalLimits = null }: {
  seriesId: string;
  initialPlan: CommunityGoal[];
  /** Auswertbare Felder der Reihe (goalFieldsFor) */
  goalFields: string[];
  disabled?: boolean;
  goalLimits?: { coins: number; seriesPoints: number } | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<CommunityGoal[]>(initialPlan);
  // null = kein Formular offen, -1 = neues Ziel, sonst Index des bearbeiteten Ziels
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<CommunityGoalForm>({ ...EMPTY_COMMUNITY_GOAL_FORM, enabled: true });
  const [saving, setSaving] = useState(false);

  async function save(next: CommunityGoal[]): Promise<boolean> {
    setSaving(true);
    const res = await fetch("/api/admin/event-series/goal-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seriesId, plan: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error((await res.json().catch(() => null))?.error ?? "Fehler beim Speichern");
      return false;
    }
    setPlan(next);
    router.refresh();
    return true;
  }

  function startEdit(index: number) {
    setForm(index >= 0 ? goalToForm(plan[index]) : { ...EMPTY_COMMUNITY_GOAL_FORM, enabled: true, announceResult: true });
    setEditing(index);
  }

  async function submitForm() {
    const goal = formToGoal({ ...form, enabled: true }, goalFields);
    if (!goal) { toast.error("Ziel unvollständig — wähle ein Feld und eine Zielmarke über 0"); return; }
    const next = editing === -1 || editing === null ? [...plan, goal] : plan.map((g, i) => (i === editing ? goal : g));
    if (await save(next)) { setEditing(null); toast.success("Ziel-Planung gespeichert"); }
  }

  function move(index: number, dir: -1 | 1) {
    const j = index + dir;
    if (j < 0 || j >= plan.length) return;
    const next = [...plan];
    [next[index], next[j]] = [next[j], next[index]];
    void save(next);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">
        Lege Ziele für die nächsten Zyklen im Voraus fest. Jeder neu angelegte Termin übernimmt das oberste Ziel, das zu
        ihm passt. Ziele, die nicht passen (z. B. fehlendes Stat-Feld), bleiben stehen. Ist keins passend, gilt das Ziel der Reihe.
      </p>
      {plan.length > 0 && (
        <ol className="rounded-xl overflow-hidden border border-line divide-y divide-line">
          {plan.map((g, i) => (
            <li key={i} className="flex items-center gap-2 px-3 py-2">
              <span className="text-xs text-gray-500 w-24 shrink-0">{i === 0 ? "Als Nächstes" : `${i + 1}. in der Liste`}</span>
              <span className="text-xs text-primary-fg/90 flex-1 min-w-0 truncate">🎯 {goalSummary(g)}</span>
              {!disabled && (
                <span className="flex items-center gap-1 shrink-0">
                  <button type="button" aria-label="Nach oben" disabled={saving || i === 0} onClick={() => move(i, -1)}
                    className="p-1 text-gray-500 hover:text-white disabled:opacity-30"><ChevronUp className="w-3.5 h-3.5" /></button>
                  <button type="button" aria-label="Nach unten" disabled={saving || i === plan.length - 1} onClick={() => move(i, 1)}
                    className="p-1 text-gray-500 hover:text-white disabled:opacity-30"><ChevronDown className="w-3.5 h-3.5" /></button>
                  <button type="button" onClick={() => startEdit(i)} disabled={saving}
                    className="text-xs text-primary-fg hover:text-white px-1.5">Ändern</button>
                  <button type="button" aria-label="Entfernen" disabled={saving} onClick={() => void save(plan.filter((_, k) => k !== i))}
                    className="p-1 text-gray-500 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
                </span>
              )}
            </li>
          ))}
        </ol>
      )}

      {!disabled && editing === null && (
        <button type="button" onClick={() => startEdit(-1)}
          className="text-xs font-medium text-primary-fg hover:text-white border border-primary/40 hover:bg-primary-hover rounded-lg px-3 py-1.5 transition-colors">
          + Ziel für einen kommenden Zyklus planen
        </button>
      )}

      {editing !== null && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
          <p className="text-sm font-semibold text-teal-200">{editing === -1 ? "Neues geplantes Ziel" : `Geplantes Ziel ${editing + 1} ändern`}</p>
          <CommunityGoalEditor value={{ ...form, enabled: true }} onChange={f => setForm({ ...f, enabled: true })}
            statFields={goalFields} inSeries hideToggle
            rewardLimit={goalLimits?.coins ?? null} seriesPointsLimit={goalLimits?.seriesPoints ?? null} />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="text-sm text-gray-400 hover:text-white px-3 py-1.5">Abbrechen</button>
            <button type="button" onClick={submitForm} disabled={saving}
              className="text-sm font-medium text-primary-ink bg-primary hover:bg-primary-hover transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50">
              {saving ? "Speichert…" : "Speichern"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
