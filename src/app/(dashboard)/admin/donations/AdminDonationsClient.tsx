"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Plus, Euro, Heart, ShoppingCart, TrendingDown, Wallet, Lightbulb, Pencil, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

type Donation = {
  id: string; userId: string; amount: number; month: number; year: number;
  note: string | null; createdAt: Date | string;
  user: { id: string; name: string | null; image: string | null };
};
type Expense = {
  id: string; title: string; description: string | null;
  amount: number; date: Date | string;
};
type Idea = { id: string; title: string; description: string | null; estimatedCost: number | null };
type User = { id: string; name: string | null; image: string | null };

const now = new Date();

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function Input({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-gray-500 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

const inputStyle = { background: "#0b1a17", border: "1px solid rgba(20,184,166,0.15)" };
const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm text-white bg-transparent outline-none";

export default function AdminDonationsClient({
  donations: initial,
  users,
  expenses: initialExpenses,
  ideas: initialIdeas,
}: {
  donations: Donation[];
  users: User[];
  expenses: Expense[];
  ideas: Idea[];
}) {
  const router = useRouter();
  const [donations, setDonations] = useState(initial);
  const [expenses,  setExpenses]  = useState(initialExpenses);
  const [ideas,     setIdeas]     = useState(initialIdeas);
  const [isPending, startTransition] = useTransition();

  // Donation form
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [month,  setMonth]  = useState(now.getMonth() + 1);
  const [year,   setYear]   = useState(now.getFullYear());
  const [note,   setNote]   = useState("");

  // Expense form
  const [exTitle, setExTitle]  = useState("");
  const [exDesc,  setExDesc]   = useState("");
  const [exAmt,   setExAmt]    = useState("");
  const [exDate,  setExDate]   = useState(now.toISOString().slice(0, 10));

  // Idea form
  const [ideaTitle, setIdeaTitle] = useState("");
  const [ideaDesc,  setIdeaDesc]  = useState("");
  const [ideaCost,  setIdeaCost]  = useState("");

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc,  setEditDesc]  = useState("");
  const [editCost,  setEditCost]  = useState("");

  const totalPool  = donations.reduce((s, d) => s + d.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const balance    = totalPool - totalSpent;
  const years = [now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1];

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
    });
  }

  async function handleDeleteExpense(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/donations/expenses/${id}`, { method: "DELETE" });
      toast.success("Ausgabe gelöscht");
      setExpenses(prev => prev.filter(e => e.id !== id));
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
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Header + Bilanz */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.2)" }}>
          <Heart className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Spendenpool verwalten</h1>
          <p className="text-xs text-gray-500">
            Einnahmen <span className="text-teal-400 font-semibold">{fmt(totalPool)} €</span>
            {" · "}Ausgaben <span className="text-red-400 font-semibold">{fmt(totalSpent)} €</span>
            {" · "}Guthaben <span className={`font-semibold ${balance >= 0 ? "text-green-400" : "text-red-400"}`}>{fmt(balance)} €</span>
          </p>
        </div>
      </div>

      {/* Bilanz-Karten */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Einnahmen", value: totalPool, icon: Euro, color: "#14b8a6", bg: "rgba(20,184,166,0.08)", border: "rgba(20,184,166,0.18)" },
          { label: "Ausgaben",  value: totalSpent, icon: TrendingDown, color: "#f87171", bg: "rgba(239,68,68,0.06)", border: "rgba(239,68,68,0.15)" },
          { label: "Guthaben",  value: balance, icon: Wallet, color: balance >= 0 ? "#4ade80" : "#f87171", bg: balance >= 0 ? "rgba(74,222,128,0.07)" : "rgba(239,68,68,0.07)", border: balance >= 0 ? "rgba(74,222,128,0.18)" : "rgba(239,68,68,0.18)" },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ background: bg, border: `1px solid ${border}` }}>
            <Icon className="w-4 h-4 mx-auto mb-1.5" style={{ color }} />
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <p className="text-lg font-black text-white tabular-nums">{fmt(Math.abs(value))} <span className="text-sm" style={{ color }}>€</span></p>
          </div>
        ))}
      </div>

      {/* ── Spende eintragen ─────────────────────────────────────── */}
      <form onSubmit={handleAddDonation} className="rounded-2xl p-5 space-y-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(20,184,166,0.12)" }}>
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Plus className="w-4 h-4 text-teal-400" /> Spende eintragen
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Spender">
              <select value={userId} onChange={e => setUserId(e.target.value)} required
                className={inputCls} style={inputStyle}>
                <option value="">– User auswählen –</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name ?? u.id}</option>)}
              </select>
            </Input>
          </div>
          <Input label="Betrag (€)">
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input type="number" min="0.01" step="0.01" value={amount}
                onChange={e => setAmount(e.target.value)} required placeholder="5.00"
                className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                style={inputStyle} />
            </div>
          </Input>
          <Input label="Monat">
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              className={inputCls} style={inputStyle}>
              {MONTH_NAMES.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
            </select>
          </Input>
          <Input label="Jahr">
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              className={inputCls} style={inputStyle}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </Input>
          <div className="col-span-2">
            <Input label="Notiz (optional, nur für Admins)">
              <input type="text" value={note} onChange={e => setNote(e.target.value)}
                placeholder="z.B. PayPal-Referenz" className={inputCls} style={inputStyle} />
            </Input>
          </div>
        </div>
        <button type="submit" disabled={isPending} className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)", opacity: isPending ? 0.6 : 1 }}>
          {isPending ? "Wird gespeichert…" : "Spende eintragen"}
        </button>
      </form>

      {/* ── Ausgabe eintragen ────────────────────────────────────── */}
      <form onSubmit={handleAddExpense} className="rounded-2xl p-5 space-y-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(239,68,68,0.15)" }}>
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-red-400" /> Ausgabe dokumentieren
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <Input label="Titel">
              <input type="text" value={exTitle} onChange={e => setExTitle(e.target.value)} required
                placeholder="z.B. Minecraft Server Oktober"
                className={inputCls} style={{ background: "#0b1a17", border: "1px solid rgba(239,68,68,0.15)" }} />
            </Input>
          </div>
          <Input label="Betrag (€)">
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input type="number" min="0.01" step="0.01" value={exAmt}
                onChange={e => setExAmt(e.target.value)} required placeholder="9.99"
                className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                style={{ background: "#0b1a17", border: "1px solid rgba(239,68,68,0.15)" }} />
            </div>
          </Input>
          <Input label="Datum">
            <input type="date" value={exDate} onChange={e => setExDate(e.target.value)} required
              className={inputCls} style={{ background: "#0b1a17", border: "1px solid rgba(239,68,68,0.15)" }} />
          </Input>
          <div className="col-span-2">
            <Input label="Beschreibung (optional, öffentlich sichtbar)">
              <input type="text" value={exDesc} onChange={e => setExDesc(e.target.value)}
                placeholder="z.B. Monatliche Servergebühr bei Hetzner"
                className={inputCls} style={{ background: "#0b1a17", border: "1px solid rgba(239,68,68,0.15)" }} />
            </Input>
          </div>
        </div>
        <button type="submit" disabled={isPending} className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #991b1b, #ef4444)", opacity: isPending ? 0.6 : 1 }}>
          {isPending ? "Wird gespeichert…" : "Ausgabe eintragen"}
        </button>
      </form>

      {/* ── Ausgaben-Liste ───────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Ausgaben</h2>
        {expenses.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">Noch keine Ausgaben eingetragen.</p>
        ) : (
          <div className="space-y-2">
            {expenses.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <ShoppingCart className="w-4 h-4 text-red-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{e.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(e.date).toLocaleDateString("de-DE")}
                    {e.description && <span className="ml-1">· {e.description}</span>}
                  </p>
                </div>
                <span className="text-sm font-bold text-red-400 shrink-0">−{fmt(e.amount)} €</span>
                <button onClick={() => handleDeleteExpense(e.id)} disabled={isPending}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Ideen verwalten ─────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-400" /> Ideen für mögliche Ausgaben
        </h2>
        <form onSubmit={handleAddIdea} className="rounded-2xl p-5 space-y-3 mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(234,179,8,0.18)" }}>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Input label="Titel">
                <input type="text" value={ideaTitle} onChange={e => setIdeaTitle(e.target.value)} required
                  placeholder="z.B. Neuer Gameserver"
                  className={inputCls} style={{ background: "#0b1a17", border: "1px solid rgba(234,179,8,0.2)" }} />
              </Input>
            </div>
            <Input label="Beschreibung (optional)">
              <input type="text" value={ideaDesc} onChange={e => setIdeaDesc(e.target.value)}
                placeholder="Details zur Idee"
                className={inputCls} style={{ background: "#0b1a17", border: "1px solid rgba(234,179,8,0.2)" }} />
            </Input>
            <Input label="Schätzpreis in € (optional)">
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input type="number" min="0" step="0.01" value={ideaCost} onChange={e => setIdeaCost(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                  style={{ background: "#0b1a17", border: "1px solid rgba(234,179,8,0.2)" }} />
              </div>
            </Input>
          </div>
          <button type="submit" disabled={isPending || !ideaTitle.trim()}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-black transition-all disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #ca8a04, #eab308)" }}>
            {isPending ? "Wird gespeichert…" : "Idee hinzufügen"}
          </button>
        </form>

        {ideas.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-4">Noch keine Ideen eingetragen.</p>
        ) : (
          <div className="space-y-2">
            {ideas.map(idea => (
              <div key={idea.id} className="rounded-xl px-4 py-3"
                style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.12)" }}>
                {editingId === idea.id ? (
                  <div className="space-y-2">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className={inputCls} style={{ background: "#0b1a17", border: "1px solid rgba(234,179,8,0.3)" }} />
                    <div className="grid grid-cols-2 gap-2">
                      <input value={editDesc} onChange={e => setEditDesc(e.target.value)}
                        placeholder="Beschreibung"
                        className={inputCls} style={{ background: "#0b1a17", border: "1px solid rgba(234,179,8,0.3)" }} />
                      <div className="relative">
                        <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                        <input type="number" min="0" step="0.01" value={editCost} onChange={e => setEditCost(e.target.value)}
                          placeholder="Schätzpreis"
                          className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white outline-none"
                          style={{ background: "#0b1a17", border: "1px solid rgba(234,179,8,0.3)" }} />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(idea.id)} disabled={isPending}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-black"
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
                      <p className="text-sm font-semibold text-white">{idea.title}</p>
                      {idea.description && <p className="text-xs text-gray-500">{idea.description}</p>}
                    </div>
                    {idea.estimatedCost != null && (
                      <span className="text-sm font-bold text-yellow-400 shrink-0 tabular-nums">
                        ~{fmt(idea.estimatedCost)} €
                      </span>
                    )}
                    <button onClick={() => startEdit(idea)} disabled={isPending}
                      className="text-gray-600 hover:text-yellow-400 transition-colors p-1.5 rounded-lg hover:bg-yellow-500/10 shrink-0">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteIdea(idea.id)} disabled={isPending}
                      className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Spenden-Liste ────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Alle Spenden</h2>
        {donations.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-6">Noch keine Spenden eingetragen.</p>
        ) : (
          <div className="space-y-2">
            {donations.map(d => (
              <div key={d.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                {d.user.image ? (
                  <Image src={d.user.image} alt={d.user.name ?? ""} width={32} height={32} className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>
                    {d.user.name?.[0] ?? "?"}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{d.user.name ?? "Unbekannt"}</p>
                  <p className="text-xs text-gray-500">
                    {MONTH_NAMES[d.month - 1]} {d.year}
                    {d.note && <span className="ml-1 text-gray-600">· {d.note}</span>}
                  </p>
                </div>
                <span className="text-sm font-bold text-teal-400 shrink-0">{fmt(d.amount)} €</span>
                <button onClick={() => handleDeleteDonation(d.id)} disabled={isPending}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
