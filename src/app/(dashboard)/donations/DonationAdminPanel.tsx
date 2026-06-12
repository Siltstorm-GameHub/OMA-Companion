"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, Euro, ChevronDown, ChevronUp, ShoppingCart, Lightbulb, Pencil, Check, X } from "lucide-react";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type User = { id: string; name: string | null; image: string | null };
type Donation = {
  id: string; userId: string; amount: number; month: number; year: number;
  note: string | null; createdAt: Date | string;
  user: { id: string; name: string | null; image: string | null };
};
type Expense = { id: string; title: string; description: string | null; amount: number; date: Date | string };
type Idea   = { id: string; title: string; description: string | null; estimatedCost: number | null; createdAt: Date | string };

const now = new Date();
const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none";
const inputStyle = { background: "#0b1a17", border: "1px solid rgba(20,184,166,0.15)" };
const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1];

export default function DonationAdminPanel({
  users,
  initialDonations,
  initialExpenses,
  initialIdeas,
}: {
  users: User[];
  initialDonations: Donation[];
  initialExpenses: Expense[];
  initialIdeas: Idea[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  const [donations, setDonations] = useState(initialDonations);
  const [expenses, setExpenses]   = useState(initialExpenses);
  const [ideas,    setIdeas]      = useState(initialIdeas);

  // Donation form
  const [userId, setUserId]   = useState("");
  const [amount, setAmount]   = useState("");
  const [month,  setMonth]    = useState(now.getMonth() + 1);
  const [year,   setYear]     = useState(now.getFullYear());
  const [note,   setNote]     = useState("");

  // Expense form
  const [exTitle, setExTitle] = useState("");
  const [exDesc,  setExDesc]  = useState("");
  const [exAmt,   setExAmt]   = useState("");
  const [exDate,  setExDate]  = useState(now.toISOString().slice(0, 10));

  // Idea form
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc,  setIdeaDesc]  = useState("");
  const [ideaCost,  setIdeaCost]  = useState("");

  // Inline editing
  const [editingId,    setEditingId]    = useState<string | null>(null);
  const [editTitle,    setEditTitle]    = useState("");
  const [editDesc,     setEditDesc]     = useState("");
  const [editCost,     setEditCost]     = useState("");

  async function handleAddDonation(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !amount) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: parseFloat(amount), month, year, note: note || null }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      toast.success("Spende eingetragen");
      setAmount(""); setNote(""); setUserId("");
      router.refresh();
      const updated = await fetch("/api/admin/donations").then(r => r.json());
      setDonations(updated);
    });
  }

  async function handleDeleteDonation(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/donations/${id}`, { method: "DELETE" });
      toast.success("Spende gelöscht");
      setDonations(prev => prev.filter(d => d.id !== id));
      router.refresh();
    });
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!exTitle || !exAmt || !exDate) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/donations/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: exTitle, description: exDesc || null, amount: parseFloat(exAmt), date: exDate }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      toast.success("Ausgabe eingetragen");
      setExTitle(""); setExDesc(""); setExAmt(""); setExDate(now.toISOString().slice(0, 10));
      const updated = await fetch("/api/admin/donations/expenses").then(r => r.json());
      setExpenses(updated);
      router.refresh();
    });
  }

  async function handleDeleteExpense(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/donations/expenses/${id}`, { method: "DELETE" });
      toast.success("Ausgabe gelöscht");
      setExpenses(prev => prev.filter(e => e.id !== id));
      router.refresh();
    });
  }

  async function handleAddIdea(e: React.FormEvent) {
    e.preventDefault();
    if (!ideaTitle.trim()) return;
    startTransition(async () => {
      const res = await fetch("/api/admin/donations/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: ideaTitle, description: ideaDesc || null, estimatedCost: ideaCost || null }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      const idea = await res.json();
      setIdeas(prev => [...prev, idea]);
      setIdeaTitle(""); setIdeaDesc(""); setIdeaCost("");
      router.refresh();
    });
  }

  async function handleDeleteIdea(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/donations/ideas/${id}`, { method: "DELETE" });
      setIdeas(prev => prev.filter(i => i.id !== id));
      router.refresh();
    });
  }

  function startEdit(idea: Idea) {
    setEditingId(idea.id);
    setEditTitle(idea.title);
    setEditDesc(idea.description ?? "");
    setEditCost(idea.estimatedCost != null ? String(idea.estimatedCost) : "");
  }

  async function handleSaveEdit(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/admin/donations/ideas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle, description: editDesc || null, estimatedCost: editCost || null }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      const updated = await res.json();
      setIdeas(prev => prev.map(i => i.id === id ? updated : i));
      setEditingId(null);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(20,184,166,0.18)", background: "rgba(20,184,166,0.04)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-teal-300 hover:bg-teal-500/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Spenden & Ausgaben verwalten
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="border-t space-y-5 p-4" style={{ borderColor: "rgba(20,184,166,0.12)" }}>

          {/* ── Spende eintragen ───────────────────────────── */}
          <form onSubmit={handleAddDonation} className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(20,184,166,0.10)" }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-teal-400" /> Spende eintragen
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Spender</label>
                <select value={userId} onChange={e => setUserId(e.target.value)} required className={inputCls} style={inputStyle}>
                  <option value="">– User auswählen –</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name ?? u.id}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Betrag (€)</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}
                    required placeholder="5.00" className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none" style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Monat</label>
                <select value={month} onChange={e => setMonth(Number(e.target.value))} className={inputCls} style={inputStyle}>
                  {MONTH_NAMES.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Jahr</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))} className={inputCls} style={inputStyle}>
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Notiz (optional)</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)}
                  placeholder="z.B. PayPal-Referenz" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <button type="submit" disabled={isPending}
              className="w-full rounded-xl py-2 text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)", opacity: isPending ? 0.6 : 1 }}>
              {isPending ? "Wird gespeichert…" : "Spende eintragen"}
            </button>
          </form>

          {/* ── Ausgabe eintragen ──────────────────────────── */}
          <form onSubmit={handleAddExpense} className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(239,68,68,0.12)" }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-red-400" /> Ausgabe dokumentieren
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Titel</label>
                <input type="text" value={exTitle} onChange={e => setExTitle(e.target.value)} required
                  placeholder="z.B. Minecraft Server Oktober"
                  className={inputCls} style={{ ...inputStyle, border: "1px solid rgba(239,68,68,0.15)" }} />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Betrag (€)</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input type="number" min="0.01" step="0.01" value={exAmt} onChange={e => setExAmt(e.target.value)}
                    required placeholder="9.99"
                    className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                    style={{ ...inputStyle, border: "1px solid rgba(239,68,68,0.15)" }} />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Datum</label>
                <input type="date" value={exDate} onChange={e => setExDate(e.target.value)} required
                  className={inputCls} style={{ ...inputStyle, border: "1px solid rgba(239,68,68,0.15)" }} />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 mb-1 block">Beschreibung (optional, öffentlich)</label>
                <input type="text" value={exDesc} onChange={e => setExDesc(e.target.value)}
                  placeholder="z.B. Monatliche Servergebühr bei Hetzner"
                  className={inputCls} style={{ ...inputStyle, border: "1px solid rgba(239,68,68,0.15)" }} />
              </div>
            </div>
            <button type="submit" disabled={isPending}
              className="w-full rounded-xl py-2 text-sm font-semibold text-white transition-all"
              style={{ background: "linear-gradient(135deg, #991b1b, #ef4444)", opacity: isPending ? 0.6 : 1 }}>
              {isPending ? "Wird gespeichert…" : "Ausgabe eintragen"}
            </button>
          </form>

          {/* ── Spenden-Liste ──────────────────────────────── */}
          {donations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alle Spenden</p>
              <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                {donations.map(d => (
                  <div key={d.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    {d.user.image
                      ? <Image src={d.user.image} alt={d.user.name ?? ""} width={28} height={28} className="w-7 h-7 rounded-full shrink-0" />
                      : <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>{d.user.name?.[0] ?? "?"}</div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{d.user.name ?? "Unbekannt"}</p>
                      <p className="text-[10px] text-gray-500">{MONTH_NAMES[d.month - 1]} {d.year}{d.note && ` · ${d.note}`}</p>
                    </div>
                    <span className="text-xs font-bold text-teal-400 shrink-0">{fmt(d.amount)} €</span>
                    <button onClick={() => handleDeleteDonation(d.id)} disabled={isPending}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Ausgaben-Liste ─────────────────────────────── */}
          {expenses.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Alle Ausgaben</p>
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {expenses.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <ShoppingCart className="w-4 h-4 text-red-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate">{e.title}</p>
                      <p className="text-[10px] text-gray-500">{new Date(e.date).toLocaleDateString("de-DE")}</p>
                    </div>
                    <span className="text-xs font-bold text-red-400 shrink-0">−{fmt(e.amount)} €</span>
                    <button onClick={() => handleDeleteExpense(e.id)} disabled={isPending}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Ideen verwalten ────────────────────────────── */}
          <div className="rounded-xl p-4 space-y-3"
            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(234,179,8,0.15)" }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5 text-yellow-400" /> Ideen verwalten
            </p>

            {/* Neue Idee */}
            <form onSubmit={handleAddIdea} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2">
                  <input
                    type="text"
                    value={ideaTitle}
                    onChange={e => setIdeaTitle(e.target.value)}
                    required
                    placeholder="Titel der Idee"
                    className={inputCls}
                    style={{ ...inputStyle, border: "1px solid rgba(234,179,8,0.18)" }}
                  />
                </div>
                <div>
                  <input
                    type="text"
                    value={ideaDesc}
                    onChange={e => setIdeaDesc(e.target.value)}
                    placeholder="Beschreibung (optional)"
                    className={inputCls}
                    style={{ ...inputStyle, border: "1px solid rgba(234,179,8,0.18)" }}
                  />
                </div>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={ideaCost}
                    onChange={e => setIdeaCost(e.target.value)}
                    placeholder="Schätzpreis (optional)"
                    className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                    style={{ ...inputStyle, border: "1px solid rgba(234,179,8,0.18)" }}
                  />
                </div>
              </div>
              <button type="submit" disabled={isPending || !ideaTitle.trim()}
                className="w-full rounded-xl py-2 text-sm font-semibold text-black transition-all disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #ca8a04, #eab308)" }}>
                {isPending ? "Wird gespeichert…" : "Idee hinzufügen"}
              </button>
            </form>

            {/* Ideen-Liste */}
            {ideas.length > 0 && (
              <div className="space-y-1.5 mt-1">
                {ideas.map(idea => (
                  <div key={idea.id} className="rounded-xl px-3 py-2.5"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(234,179,8,0.12)" }}>
                    {editingId === idea.id ? (
                      <div className="space-y-2">
                        <input
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className={inputCls}
                          style={{ ...inputStyle, border: "1px solid rgba(234,179,8,0.25)" }}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            placeholder="Beschreibung"
                            className={inputCls}
                            style={{ ...inputStyle, border: "1px solid rgba(234,179,8,0.25)" }}
                          />
                          <div className="relative">
                            <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editCost}
                              onChange={e => setEditCost(e.target.value)}
                              placeholder="Schätzpreis"
                              className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                              style={{ ...inputStyle, border: "1px solid rgba(234,179,8,0.25)" }}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleSaveEdit(idea.id)} disabled={isPending}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black transition-all"
                            style={{ background: "#eab308" }}>
                            <Check className="w-3 h-3" /> Speichern
                          </button>
                          <button onClick={() => setEditingId(null)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-400 hover:text-white transition-colors"
                            style={{ background: "rgba(255,255,255,0.05)" }}>
                            <X className="w-3 h-3" /> Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <Lightbulb className="w-4 h-4 text-yellow-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{idea.title}</p>
                          {idea.description && <p className="text-[10px] text-gray-500 truncate">{idea.description}</p>}
                        </div>
                        {idea.estimatedCost != null && (
                          <span className="text-xs font-bold text-yellow-400 shrink-0">~{fmt(idea.estimatedCost)} €</span>
                        )}
                        <button onClick={() => startEdit(idea)} disabled={isPending}
                          className="text-gray-600 hover:text-yellow-400 transition-colors p-1 rounded-lg hover:bg-yellow-500/10 shrink-0">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteIdea(idea.id)} disabled={isPending}
                          className="text-gray-600 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
