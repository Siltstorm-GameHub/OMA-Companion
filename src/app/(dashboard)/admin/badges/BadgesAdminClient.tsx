"use client";
import { useState, useMemo } from "react";
import Image from "next/image";
import { Plus, Award, Search, X, ChevronDown } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

type Badge = {
  id: string;
  icon: string;
  name: string;
  desc: string;
  category: string;
  coins: number;
  createdAt: string;
  awardCount: number;
};
type User = { id: string; name: string | null; username: string | null; image: string | null };

const CATEGORIES = ["community", "aktivitaet", "events", "turniere", "punkte", "special"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  community: "Community", aktivitaet: "Aktivität", events: "Events",
  turniere: "Turniere", punkte: "Punkte", special: "Besondere Leistung",
};

export default function BadgesAdminClient({ badges: initialBadges, users }: {
  badges: Badge[];
  users: User[];
}) {
  const [badges, setBadges] = useState(initialBadges);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ icon: "", name: "", desc: "", category: "special", coins: 0 });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const [awardBadge, setAwardBadge] = useState<Badge | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [awardNote, setAwardNote] = useState("");
  const [awardLoading, setAwardLoading] = useState(false);
  const [awardError, setAwardError] = useState("");
  const [awardSuccess, setAwardSuccess] = useState("");

  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    if (!q) return users.slice(0, 20);
    return users.filter(u =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.username ?? "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [users, userSearch]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.icon.trim() || !form.name.trim() || !form.desc.trim()) {
      setFormError("Alle Pflichtfelder ausfüllen.");
      return;
    }
    setFormLoading(true);
    setFormError("");
    try {
      const res = await fetch("/api/admin/badges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { badge } = await res.json();
      setBadges(prev => [{ ...badge, awardCount: 0 }, ...prev]);
      setCreating(false);
      setForm({ icon: "", name: "", desc: "", category: "special", coins: 0 });
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleAward(userId: string) {
    if (!awardBadge) return;
    setAwardLoading(true);
    setAwardError("");
    setAwardSuccess("");
    try {
      const res = await fetch(`/api/admin/badges/${awardBadge.id}/award`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, note: awardNote }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
      const { userName } = await res.json();
      setAwardSuccess(`Abzeichen an ${userName} vergeben!`);
      setBadges(prev => prev.map(b => b.id === awardBadge.id ? { ...b, awardCount: b.awardCount + 1 } : b));
      setAwardNote("");
      setUserSearch("");
    } catch (err: unknown) {
      setAwardError(err instanceof Error ? err.message : "Fehler");
    } finally {
      setAwardLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Custom-Abzeichen</h2>
          <p className="text-xs text-gray-500 mt-0.5">{badges.length} Abzeichen erstellt</p>
        </div>
        <button
          onClick={() => { setCreating(true); setFormError(""); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Neues Abzeichen
        </button>
      </div>

      {/* Create form */}
      {creating && (
        <form onSubmit={handleCreate} className="glass rounded-2xl p-5 space-y-4 border border-purple-500/20">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-semibold text-white">Abzeichen erstellen</p>
            <button type="button" onClick={() => setCreating(false)} className="text-gray-500 hover:text-gray-300">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Icon (Emoji) *</label>
              <input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="🏆" maxLength={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xl text-center focus:outline-none focus:border-purple-500/50" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Kategorie</label>
              <div className="relative">
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm appearance-none focus:outline-none focus:border-purple-500/50">
                  {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="z.B. Legendärer Spieler" maxLength={60}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Beschreibung *</label>
            <input value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
              placeholder="z.B. Für außergewöhnliche Leistungen" maxLength={120}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Münzen-Belohnung (optional)</label>
            <input type="number" min={0} value={form.coins} onChange={e => setForm(f => ({ ...f, coins: Math.max(0, parseInt(e.target.value) || 0) }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            <p className="text-[10px] text-gray-600 mt-1">0 = keine Belohnung. Wird beim Vergeben einmalig gutgeschrieben.</p>
          </div>
          {formError && <p className="text-red-400 text-sm">{formError}</p>}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setCreating(false)} className="text-sm text-gray-400 hover:text-white px-4 py-2">Abbrechen</button>
            <button type="submit" disabled={formLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors">
              {formLoading ? "Speichern…" : "Erstellen"}
            </button>
          </div>
        </form>
      )}

      {/* Badge list */}
      {badges.length === 0 ? (
        <EmptyState
          type="generic"
          title="Noch keine Custom-Abzeichen erstellt"
          description="Erstelle oben ein neues Abzeichen für besondere Leistungen."
        />
      ) : (
        <div className="space-y-2">
          {badges.map(badge => (
            <div key={badge.id} className="glass rounded-2xl px-5 py-4 flex items-center gap-4">
              <span className="text-3xl shrink-0">{badge.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white">{badge.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/5">
                    {CATEGORY_LABELS[badge.category] ?? badge.category}
                  </span>
                  {badge.coins > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      +{badge.coins} Münzen
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{badge.desc}</p>
                <p className="text-[10px] text-gray-600 mt-1">{badge.awardCount}× vergeben</p>
              </div>
              <button
                onClick={() => { setAwardBadge(badge); setAwardError(""); setAwardSuccess(""); setUserSearch(""); setAwardNote(""); }}
                className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 border border-purple-500/20 hover:border-purple-500/40 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                <Award className="w-3.5 h-3.5" /> Vergeben
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Award modal */}
      {awardBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setAwardBadge(null)}>
          <div className="glass rounded-2xl p-6 w-full max-w-md space-y-4 border border-white/10" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{awardBadge.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{awardBadge.name}</p>
                  <p className="text-[11px] text-gray-500">{awardBadge.desc}</p>
                </div>
              </div>
              <button onClick={() => setAwardBadge(null)} className="text-gray-500 hover:text-gray-300"><X className="w-4 h-4" /></button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input value={userSearch} onChange={e => setUserSearch(e.target.value)}
                placeholder="Nutzer suchen…"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>

            <div className="space-y-1 max-h-52 overflow-y-auto">
              {filteredUsers.map(u => (
                <button key={u.id} disabled={awardLoading}
                  onClick={() => handleAward(u.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors text-left">
                  {u.image
                    ? <Image src={u.image} alt="" width={28} height={28} className="w-7 h-7 rounded-full" />
                    : <div className="w-7 h-7 rounded-full bg-purple-600/30 flex items-center justify-center text-xs text-purple-300">{(u.name ?? u.username ?? "?")[0]}</div>
                  }
                  <span className="text-sm text-white">{u.name ?? u.username ?? u.id}</span>
                  {u.username && u.name && <span className="text-xs text-gray-500">@{u.username}</span>}
                </button>
              ))}
              {filteredUsers.length === 0 && <p className="text-center text-sm text-gray-600 py-3">Kein Nutzer gefunden.</p>}
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Notiz (optional)</label>
              <input value={awardNote} onChange={e => setAwardNote(e.target.value)}
                placeholder="Grund für die Vergabe…" maxLength={200}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500/50" />
            </div>

            {awardError && <p className="text-red-400 text-sm">{awardError}</p>}
            {awardSuccess && <p className="text-emerald-400 text-sm">{awardSuccess}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
