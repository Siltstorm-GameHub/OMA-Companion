"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Send, Bell, BellOff, CheckCircle, Clock, GripVertical } from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { EmptyState } from "@/components/EmptyState";
import PollOptionGameInput from "@/components/admin/PollOptionGameInput";
import CoinIcon from "@/components/CoinIcon";

type Option = { id: string; label: string; gameName: string | null; steamAppId: number | null; order: number };
type Vote   = { id: string; userId: string };

type Poll = {
  id:            string;
  title:         string;
  question:      string;
  startDate:     string;
  endDate:       string;
  isActive:      boolean;
  allowMultiple: boolean;
  allowFreeText: boolean;
  rewardCoins:   number;
  createdAt:     string;
  creator:       { username: string | null; name: string | null };
  options:       Option[];
  votes:         Vote[];
};

type FormOption = { label: string; gameName: string | null; steamAppId: number | null };

type FormState = {
  title: string;
  question: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  allowMultiple: boolean;
  allowFreeText: boolean;
  rewardCoins: number;
  sendPush: boolean;
  options: FormOption[];
};

function toLocalInputValue(iso: string) {
  return iso.slice(0, 16);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function defaultForm(): FormState {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return {
    title: "", question: "",
    startDate: toLocalInputValue(now.toISOString()),
    endDate:   toLocalInputValue(end.toISOString()),
    isActive: true, allowMultiple: false, allowFreeText: false,
    rewardCoins: 0, sendPush: false,
    options: [{ label: "", gameName: null, steamAppId: null }, { label: "", gameName: null, steamAppId: null }],
  };
}

function isCurrentlyActive(p: Poll) {
  const now = Date.now();
  return p.isActive && new Date(p.startDate).getTime() <= now && new Date(p.endDate).getTime() >= now;
}

export function DailyPollPanel({ polls: initial }: { polls: Poll[] }) {
  const [polls, setPolls]     = useState(initial);
  const [form, setForm]       = useState<FormState>(defaultForm());
  const [editId, setEditId]   = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirm();

  function resetForm() {
    setForm(defaultForm());
    setEditId(null);
  }

  function startEdit(p: Poll) {
    setEditId(p.id);
    setForm({
      title: p.title, question: p.question,
      startDate: toLocalInputValue(p.startDate), endDate: toLocalInputValue(p.endDate),
      isActive: p.isActive, allowMultiple: p.allowMultiple, allowFreeText: p.allowFreeText,
      rewardCoins: p.rewardCoins, sendPush: false,
      options: p.options.length > 0
        ? p.options.map(o => ({ label: o.label, gameName: o.gameName, steamAppId: o.steamAppId }))
        : [{ label: "", gameName: null, steamAppId: null }, { label: "", gameName: null, steamAppId: null }],
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateOption(i: number, patch: Partial<FormOption>) {
    setForm(f => ({ ...f, options: f.options.map((o, idx) => idx === i ? { ...o, ...patch } : o) }));
  }

  function addOption() {
    setForm(f => ({ ...f, options: [...f.options, { label: "", gameName: null, steamAppId: null }] }));
  }

  function removeOption(i: number) {
    setForm(f => ({ ...f, options: f.options.filter((_, idx) => idx !== i) }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate:   new Date(form.endDate).toISOString(),
        options: form.options.filter(o => o.label.trim()),
      };

      if (editId) {
        const res = await fetch(`/api/admin/daily-poll/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
        const updated: Poll = await res.json();
        setPolls(prev => prev.map(p => p.id === editId ? { ...p, ...updated, creator: p.creator, votes: p.votes } : p));
        toast.success("Umfrage aktualisiert");
      } else {
        const res = await fetch("/api/admin/daily-poll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
        const created: Poll = await res.json();
        setPolls(prev => [{ ...created, creator: { username: null, name: null }, votes: [] }, ...prev]);
        toast.success(form.sendPush ? "Umfrage erstellt & Push gesendet" : "Umfrage erstellt");
      }
      resetForm();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Umfrage löschen", description: "Umfrage wirklich löschen? Alle Stimmen gehen verloren.", variant: "danger" }))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/daily-poll/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      setPolls(prev => prev.filter(p => p.id !== id));
      if (editId === id) resetForm();
      toast.success("Umfrage gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(p: Poll) {
    try {
      const res = await fetch(`/api/admin/daily-poll/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error();
      setPolls(prev => prev.map(x => x.id === p.id ? { ...x, isActive: !p.isActive } : x));
      toast.success(!p.isActive ? "Aktiviert" : "Deaktiviert");
    } catch {
      toast.error("Fehler beim Aktualisieren");
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Formular ── */}
      <form onSubmit={handleSubmit}
        className="surface p-5 space-y-4"
        style={{ border: "1px solid rgba(168,85,247,0.15)", boxShadow: "0 4px 20px rgba(0,0,0,0.4)" }}>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            {editId ? <><Pencil className="w-4 h-4 text-purple-400" /> Umfrage bearbeiten</> : <><Plus className="w-4 h-4 text-purple-400" /> Neue Umfrage</>}
          </h2>
          {editId && (
            <button type="button" onClick={resetForm} className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Titel</label>
          <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            maxLength={80} placeholder="z.B. Welches Spiel spielen wir nächstes Event?"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors" />
        </div>

        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Frage</label>
          <textarea required value={form.question} onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
            maxLength={300} rows={2} placeholder="Die Frage, die alle beantworten sollen …"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none" />
        </div>

        {/* Antwortoptionen */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-gray-400">Antwortoptionen</label>
            <button type="button" onClick={addOption}
              className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Option hinzufügen
            </button>
          </div>
          <div className="space-y-2">
            {form.options.map((o, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-gray-700 shrink-0" />
                <input
                  value={o.label}
                  onChange={e => updateOption(i, { label: e.target.value, gameName: null, steamAppId: null })}
                  placeholder={`Option ${i + 1} (Text oder Spieltitel)`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
                />
                <div className="w-56 shrink-0">
                  <PollOptionGameInput
                    value={o.gameName ?? ""}
                    onSelect={g => g
                      ? updateOption(i, { label: g.name, gameName: g.name, steamAppId: g.appId })
                      : updateOption(i, { gameName: null, steamAppId: null })}
                  />
                </div>
                {o.steamAppId && (
                  <img src={`https://cdn.cloudflare.steamstatic.com/steam/apps/${o.steamAppId}/capsule_sm_120.jpg`}
                    alt="" className="w-10 h-6 rounded object-cover shrink-0" />
                )}
                {form.options.length > 1 && (
                  <button type="button" onClick={() => removeOption(i)}
                    className="p-1 rounded text-gray-600 hover:text-red-400 transition-colors shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-700 mt-1">
            Spieltitel eingeben, um Cover + Steam-Link automatisch anzuhängen. Leer lassen für reine Freitext-Umfrage.
          </p>
        </div>

        {/* Zeitraum */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Anzeigen ab</label>
            <input required type="datetime-local" value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Anzeigen bis</label>
            <input required type="datetime-local" value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
          </div>
        </div>

        {/* Optionen-Flags */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="accent-purple-500 w-4 h-4" />
            Sofort aktiv
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={form.allowMultiple}
              onChange={e => setForm(f => ({ ...f, allowMultiple: e.target.checked }))}
              className="accent-purple-500 w-4 h-4" />
            Mehrfachauswahl erlauben
          </label>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={form.allowFreeText}
              onChange={e => setForm(f => ({ ...f, allowFreeText: e.target.checked }))}
              className="accent-purple-500 w-4 h-4" />
            Freitext erlauben
          </label>
          {!editId && (
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
              <input type="checkbox" checked={form.sendPush}
                onChange={e => setForm(f => ({ ...f, sendPush: e.target.checked }))}
                className="accent-purple-500 w-4 h-4" />
              <Bell className="w-3.5 h-3.5 text-purple-400" />
              Push-Benachrichtigung senden
            </label>
          )}
        </div>

        {/* Coin-Reward */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block flex items-center gap-1.5">
            <CoinIcon size={12} /> Coin-Belohnung fürs Abstimmen (optional)
          </label>
          <input type="number" min={0} value={form.rewardCoins}
            onChange={e => setForm(f => ({ ...f, rewardCoins: Math.max(0, parseInt(e.target.value) || 0) }))}
            className="w-32 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
        </div>

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors">
          <Send className="w-3.5 h-3.5" />
          {saving ? "Wird gespeichert…" : editId ? "Speichern" : "Erstellen"}
        </button>
      </form>

      {/* ── Liste ── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Alle Umfragen ({polls.length})
        </h2>

        {polls.length === 0 ? (
          <EmptyState type="generic" title="Noch keine Umfragen erstellt"
            description="Erstelle oben eine neue Umfrage für alle Mitglieder." />
        ) : polls.map(p => {
          const active = isCurrentlyActive(p);
          return (
            <div key={p.id} className="surface p-4 flex gap-3"
              style={{ border: active ? "1px solid rgba(168,85,247,0.25)" : "1px solid rgba(255,255,255,0.05)" }}>

              <div className="mt-0.5 shrink-0">
                {active ? <CheckCircle className="w-4 h-4 text-purple-400" /> : <Clock className="w-4 h-4 text-gray-600" />}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-snug">{p.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => toggleActive(p)} title={p.isActive ? "Deaktivieren" : "Aktivieren"}
                      className={`p-1.5 rounded-md transition-colors ${p.isActive ? "text-purple-400 hover:bg-purple-500/10" : "text-gray-600 hover:bg-white/5"}`}>
                      {p.isActive ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => startEdit(p)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                      className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.question}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-700">
                  <span>{formatDate(p.startDate)} – {formatDate(p.endDate)}</span>
                  <span>{p.votes.length} Stimme{p.votes.length === 1 ? "" : "n"}</span>
                  {p.rewardCoins > 0 && (
                    <span className="text-amber-500 flex items-center gap-1"><CoinIcon size={10} /> {p.rewardCoins}</span>
                  )}
                  {!p.isActive && <span className="text-amber-600">Inaktiv</span>}
                  {active && <span className="text-purple-400 font-medium">Wird gerade angezeigt</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {ConfirmDialogElement}
    </div>
  );
}
