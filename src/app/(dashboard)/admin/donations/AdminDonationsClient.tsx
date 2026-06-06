"use client";
import { useState, useTransition } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Trash2, Plus, Euro, Heart } from "lucide-react";
import { useRouter } from "next/navigation";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"];

type Donation = {
  id: string;
  userId: string;
  amount: number;
  month: number;
  year: number;
  note: string | null;
  createdAt: Date | string;
  user: { id: string; name: string | null; image: string | null };
};

type User = { id: string; name: string | null; image: string | null };

const now = new Date();

export default function AdminDonationsClient({
  donations: initial,
  users,
}: {
  donations: Donation[];
  users: User[];
}) {
  const router = useRouter();
  const [donations, setDonations] = useState(initial);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [userId,  setUserId]  = useState("");
  const [amount,  setAmount]  = useState("");
  const [month,   setMonth]   = useState(now.getMonth() + 1);
  const [year,    setYear]    = useState(now.getFullYear());
  const [note,    setNote]    = useState("");

  const totalPool = donations.reduce((s, d) => s + d.amount, 0);

  async function handleAdd(e: React.FormEvent) {
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

  async function handleDelete(id: string) {
    startTransition(async () => {
      await fetch(`/api/admin/donations/${id}`, { method: "DELETE" });
      toast.success("Spende gelöscht");
      setDonations(prev => prev.filter(d => d.id !== id));
    });
  }

  const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(20,184,166,0.12)", border: "1px solid rgba(20,184,166,0.2)" }}>
          <Heart className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Spendenpool verwalten</h1>
          <p className="text-xs text-gray-500">Gesamtpool: <span className="text-teal-400 font-semibold">{totalPool.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €</span></p>
        </div>
      </div>

      {/* Formular */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl p-5 space-y-4"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(20,184,166,0.12)" }}
      >
        <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <Plus className="w-4 h-4 text-teal-400" /> Spende eintragen
        </h2>

        <div className="grid grid-cols-2 gap-3">
          {/* User */}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Spender</label>
            <select
              value={userId}
              onChange={e => setUserId(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-transparent outline-none"
              style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.15)" }}
            >
              <option value="">– User auswählen –</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.name ?? u.id}</option>
              ))}
            </select>
          </div>

          {/* Betrag */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Betrag (€)</label>
            <div className="relative">
              <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                placeholder="5.00"
                className="w-full rounded-xl pl-8 pr-3 py-2.5 text-sm text-white bg-transparent outline-none"
                style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.15)" }}
              />
            </div>
          </div>

          {/* Monat */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Monat</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.15)" }}
            >
              {MONTH_NAMES.map((n, i) => (
                <option key={i + 1} value={i + 1}>{n}</option>
              ))}
            </select>
          </div>

          {/* Jahr */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Jahr</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none"
              style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.15)" }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {/* Notiz */}
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Notiz (optional, nur für Admins sichtbar)</label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="z.B. PayPal-Referenz oder Anmerkung"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white bg-transparent outline-none"
              style={{ background: "#0b1a17", border: "1px solid rgba(20,184,166,0.15)" }}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all"
          style={{ background: "linear-gradient(135deg, #0d9488, #14b8a6)", opacity: isPending ? 0.6 : 1 }}
        >
          {isPending ? "Wird gespeichert…" : "Spende eintragen"}
        </button>
      </form>

      {/* Spendenliste */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Alle Spenden</h2>
        {donations.length === 0 ? (
          <p className="text-sm text-gray-600 text-center py-8">Noch keine Spenden eingetragen.</p>
        ) : (
          <div className="space-y-2">
            {donations.map(d => (
              <div
                key={d.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                {d.user.image ? (
                  <Image src={d.user.image} alt={d.user.name ?? ""} width={32} height={32} className="w-8 h-8 rounded-full shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>
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
                <span className="text-sm font-bold text-teal-400 shrink-0">
                  {d.amount.toLocaleString("de-DE", { minimumFractionDigits: 2 })} €
                </span>
                <button
                  onClick={() => handleDelete(d.id)}
                  disabled={isPending}
                  className="text-gray-600 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-500/10 shrink-0"
                >
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
