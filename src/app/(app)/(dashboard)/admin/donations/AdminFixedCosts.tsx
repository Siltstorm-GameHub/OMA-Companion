"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { GoldColor as Euro } from "@/components/icons-color";
import { Check, Pencil, Plus, Repeat, Trash2, X } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";
import { formatBerlinDate, getBerlinDateParts } from "@/lib/time";
import { monthlyRunRate } from "@/lib/donation-pool";

export type FixedCost = {
  id: string; title: string; description: string | null; amount: number;
  interval: string; nextDueAt: Date | string; active: boolean;
};
export type PaidExpense = {
  id: string; title: string; description: string | null; amount: number; date: Date | string; fixedCostId: string | null;
};

const fmt = (n: number) => n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toDateInput = (d: Date | string) => {
  const p = getBerlinDateParts(d);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
};
// Mittag UTC: bleibt in Berlin sicher auf demselben Kalendertag
const fromDateInput = (s: string) => `${s}T12:00:00.000Z`;

const inputStyle = { background: "var(--color-surface-2)", border: "1px solid rgba(56,189,248,0.2)" };
const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm text-white bg-transparent outline-none";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

/**
 * Admin: wiederkehrende Kosten. Sie werden auf der Spenden-Seite vor den Zielen gedeckt.
 * "Bezahlt" bucht die Zahlung als Ausgabe und schiebt die Fälligkeit weiter.
 */
export default function AdminFixedCosts({
  initial,
  onPaid,
}: {
  initial: FixedCost[];
  onPaid: (expense: PaidExpense) => void;
}) {
  const [costs, setCosts] = useState(initial);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [due, setDue] = useState(toDateInput(new Date()));

  const [editingId, setEditingId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", amount: "", interval: "monthly", due: "" });

  const sorted = [...costs].sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
  const runRate = monthlyRunRate(costs.filter((c) => c.active));

  function replace(updated: FixedCost) {
    setCosts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !amount || !due) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/donations/fixed-costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: desc || null, amount: parseFloat(amount), interval, nextDueAt: fromDateInput(due) }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      const cost = await res.json();
      setCosts((prev) => [...prev, cost]);
      setTitle(""); setDesc(""); setAmount("");
      toast.success("Fixkosten angelegt");
    });
  }

  function handlePaid(cost: FixedCost) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/donations/fixed-costs/${cost.id}/paid`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      if (!res.ok) { toast.error("Fehler beim Buchen"); return; }
      const { expense, cost: updated } = await res.json();
      replace(updated);
      onPaid(expense);
      toast.success(`Als Ausgabe gebucht · nächste Fälligkeit ${formatBerlinDate(updated.nextDueAt)}`);
    });
  }

  function handleToggle(cost: FixedCost) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/donations/fixed-costs/${cost.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !cost.active }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      replace(await res.json());
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/donations/fixed-costs/${id}`, { method: "DELETE" });
      setCosts((prev) => prev.filter((c) => c.id !== id));
    });
  }

  function startEdit(c: FixedCost) {
    setEditingId(c.id);
    setEdit({ title: c.title, amount: String(c.amount), interval: c.interval, due: toDateInput(c.nextDueAt) });
  }

  function handleSaveEdit(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/donations/fixed-costs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: edit.title, amount: parseFloat(edit.amount), interval: edit.interval, nextDueAt: fromDateInput(edit.due) }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      replace(await res.json());
      setEditingId(null);
    });
  }

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-2">
        <Repeat className="w-4 h-4 text-sky-400" /> Laufende Kosten
      </h2>
      <p className="text-xs text-gray-500 mb-3">
        Werden auf der Spenden-Seite immer zuerst gedeckt, erst danach fließt Geld in die Ziele.
        {costs.some((c) => c.active) && <> Aktuell ca. <span className="text-sky-300 font-semibold">{fmt(runRate)} € / Monat</span>.</>}
      </p>

      <form onSubmit={handleAdd} className="rounded-2xl p-5 space-y-3 mb-4"
        style={{ background: "var(--color-surface-2)", border: "1px solid rgba(56,189,248,0.18)" }}>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Field label="Titel">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="z.B. Hosting Gameserver" className={inputCls} style={inputStyle} />
            </Field>
          </div>
          <Field label="Betrag je Zahlung (€)">
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <NumberInput min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required placeholder="9.99"
                className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none" style={inputStyle} />
            </div>
          </Field>
          <Field label="Intervall">
            <select value={interval} onChange={(e) => setInterval(e.target.value as "monthly" | "yearly")} className={inputCls} style={inputStyle}>
              <option value="monthly">monatlich</option>
              <option value="yearly">jährlich</option>
            </select>
          </Field>
          <Field label="Nächste Fälligkeit">
            <input type="date" value={due} onChange={(e) => setDue(e.target.value)} required className={inputCls} style={inputStyle} />
          </Field>
          <Field label="Beschreibung (optional, öffentlich)">
            <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="z.B. bei Hetzner"
              className={inputCls} style={inputStyle} />
          </Field>
        </div>
        <button type="submit" disabled={isPending || !title.trim()}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
          style={{ background: "linear-gradient(135deg, #0369a1, #0ea5e9)" }}>
          <Plus className="w-4 h-4" /> {isPending ? "Wird gespeichert…" : "Fixkosten anlegen"}
        </button>
      </form>

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-600 text-center py-4">Noch keine laufenden Kosten eingetragen.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((c) => (
            <div key={c.id} className={`rounded-xl px-4 py-3 ${c.active ? "" : "opacity-50"}`}
              style={{ background: "rgba(56,189,248,0.04)", border: "1px solid rgba(56,189,248,0.12)" }}>
              {editingId === c.id ? (
                <div className="space-y-2">
                  <input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} className={inputCls} style={inputStyle} />
                  <div className="grid grid-cols-3 gap-2">
                    <NumberInput min="0.01" step="0.01" value={edit.amount} onChange={(e) => setEdit({ ...edit, amount: e.target.value })}
                      className={inputCls} style={inputStyle} />
                    <select value={edit.interval} onChange={(e) => setEdit({ ...edit, interval: e.target.value })} className={inputCls} style={inputStyle}>
                      <option value="monthly">monatlich</option>
                      <option value="yearly">jährlich</option>
                    </select>
                    <input type="date" value={edit.due} onChange={(e) => setEdit({ ...edit, due: e.target.value })} className={inputCls} style={inputStyle} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleSaveEdit(c.id)} disabled={isPending}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-sky-600 max-lg:min-h-10">
                      <Check className="w-3 h-3" /> Speichern
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white bg-line max-lg:min-h-10">
                      <X className="w-3 h-3" /> Abbrechen
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Repeat className="w-4 h-4 text-sky-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {fmt(c.amount)} € {c.interval === "yearly" ? "jährlich" : "monatlich"} · fällig {formatBerlinDate(c.nextDueAt)}
                      {!c.active && " · pausiert"}
                    </p>
                  </div>
                  {c.active && (
                    <button onClick={() => handlePaid(c)} disabled={isPending}
                      title="Zahlung als Ausgabe buchen und Fälligkeit weiterschieben"
                      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-sky-200 bg-sky-500/15 border border-sky-500/25 hover:bg-sky-500/25">
                      Bezahlt
                    </button>
                  )}
                  <button onClick={() => handleToggle(c)} disabled={isPending}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-gray-500 hover:text-white hover:bg-line">
                    {c.active ? "Pausieren" : "Aktivieren"}
                  </button>
                  <button onClick={() => startEdit(c)} disabled={isPending} aria-label="Bearbeiten"
                    className="text-gray-600 hover:text-sky-300 p-1.5 rounded-lg hover:bg-sky-500/10 shrink-0">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(c.id)} disabled={isPending} aria-label="Löschen"
                    className="text-gray-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
