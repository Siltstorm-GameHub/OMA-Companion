"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, X, Send, Bell, BellOff, CheckCircle, Clock } from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";

type Message = {
  id:        string;
  title:     string;
  content:   string;
  startDate: string;
  endDate:   string;
  isActive:  boolean;
  createdAt: string;
  creator:   { username: string | null; name: string | null };
};

type FormState = {
  title:    string;
  content:  string;
  startDate: string;
  endDate:   string;
  isActive: boolean;
  sendPush: boolean;
};

function toLocalInputValue(iso: string) {
  return iso.slice(0, 16); // "YYYY-MM-DDTHH:mm"
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("de-DE", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

function defaultForm(): FormState {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return {
    title:     "",
    content:   "",
    startDate: toLocalInputValue(now.toISOString()),
    endDate:   toLocalInputValue(end.toISOString()),
    isActive:  true,
    sendPush:  false,
  };
}

function isCurrentlyActive(m: Message) {
  const now = Date.now();
  return m.isActive && new Date(m.startDate).getTime() <= now && new Date(m.endDate).getTime() >= now;
}

export function DailyMessagePanel({ messages: initial }: { messages: Message[] }) {
  const [messages, setMessages] = useState(initial);
  const [form,     setForm]     = useState<FormState>(defaultForm());
  const [editId,   setEditId]   = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirm();

  function resetForm() {
    setForm(defaultForm());
    setEditId(null);
  }

  function startEdit(m: Message) {
    setEditId(m.id);
    setForm({
      title:     m.title,
      content:   m.content,
      startDate: toLocalInputValue(m.startDate),
      endDate:   toLocalInputValue(m.endDate),
      isActive:  m.isActive,
      sendPush:  false,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        startDate: new Date(form.startDate).toISOString(),
        endDate:   new Date(form.endDate).toISOString(),
      };

      if (editId) {
        const res  = await fetch(`/api/admin/daily-message/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
        const updated: Message = await res.json();
        setMessages(prev => prev.map(m => m.id === editId ? { ...m, ...updated, creator: m.creator } : m));
        toast.success("Mitteilung aktualisiert");
      } else {
        const res  = await fetch("/api/admin/daily-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json()).error ?? "Fehler");
        const created: Message = await res.json();
        setMessages(prev => [{ ...created, creator: { username: null, name: null } }, ...prev]);
        toast.success(form.sendPush ? "Mitteilung erstellt & Push gesendet" : "Mitteilung erstellt");
      }
      resetForm();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Mitteilung löschen", description: "Mitteilung wirklich löschen?", variant: "danger" }))) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/admin/daily-message/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Fehler beim Löschen");
      setMessages(prev => prev.filter(m => m.id !== id));
      if (editId === id) resetForm();
      toast.success("Mitteilung gelöscht");
    } catch {
      toast.error("Fehler beim Löschen");
    } finally {
      setDeleting(null);
    }
  }

  async function toggleActive(m: Message) {
    try {
      const res = await fetch(`/api/admin/daily-message/${m.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !m.isActive }),
      });
      if (!res.ok) throw new Error();
      setMessages(prev => prev.map(x => x.id === m.id ? { ...x, isActive: !m.isActive } : x));
      toast.success(!m.isActive ? "Aktiviert" : "Deaktiviert");
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
            {editId ? <><Pencil className="w-4 h-4 text-purple-400" /> Mitteilung bearbeiten</> : <><Plus className="w-4 h-4 text-purple-400" /> Neue Mitteilung</>}
          </h2>
          {editId && (
            <button type="button" onClick={resetForm}
              className="text-gray-500 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Titel */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Titel</label>
          <input
            required
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            maxLength={80}
            placeholder="z.B. Willkommen zum Sommer-Event!"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>

        {/* Inhalt */}
        <div>
          <label className="text-xs text-gray-400 mb-1.5 block">Nachricht</label>
          <textarea
            required
            value={form.content}
            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            maxLength={500}
            rows={3}
            placeholder="Die Mitteilung, die alle User sehen sollen …"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-colors resize-none"
          />
          <p className="text-[11px] text-gray-700 text-right mt-0.5">{form.content.length}/500</p>
        </div>

        {/* Zeitraum */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Anzeigen ab</label>
            <input
              required type="datetime-local"
              value={form.startDate}
              onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Anzeigen bis</label>
            <input
              required type="datetime-local"
              value={form.endDate}
              onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Optionen */}
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <input type="checkbox" checked={form.isActive}
              onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
              className="accent-purple-500 w-4 h-4" />
            Sofort aktiv
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

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors">
          <Send className="w-3.5 h-3.5" />
          {saving ? "Wird gespeichert…" : editId ? "Speichern" : "Erstellen"}
        </button>
      </form>

      {/* ── Liste ── */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
          Alle Mitteilungen ({messages.length})
        </h2>

        {messages.length === 0 ? (
          <div className="surface p-8 text-center text-gray-600 text-sm">
            Noch keine Mitteilungen erstellt.
          </div>
        ) : messages.map(m => {
          const active = isCurrentlyActive(m);
          return (
            <div key={m.id}
              className="surface p-4 flex gap-3"
              style={{
                border: active
                  ? "1px solid rgba(168,85,247,0.25)"
                  : "1px solid rgba(255,255,255,0.05)",
              }}>

              {/* Status-Icon */}
              <div className="mt-0.5 shrink-0">
                {active
                  ? <CheckCircle className="w-4 h-4 text-purple-400" />
                  : <Clock className="w-4 h-4 text-gray-600" />}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white leading-snug">{m.title}</p>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Aktiv-Toggle */}
                    <button onClick={() => toggleActive(m)} title={m.isActive ? "Deaktivieren" : "Aktivieren"}
                      className={`p-1.5 rounded-md transition-colors ${m.isActive ? "text-purple-400 hover:bg-purple-500/10" : "text-gray-600 hover:bg-white/5"}`}>
                      {m.isActive ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
                    </button>
                    {/* Bearbeiten */}
                    <button onClick={() => startEdit(m)}
                      className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {/* Löschen */}
                    <button onClick={() => handleDelete(m.id)} disabled={deleting === m.id}
                      className="p-1.5 rounded-md text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{m.content}</p>

                <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-700">
                  <span>{formatDate(m.startDate)} – {formatDate(m.endDate)}</span>
                  {!m.isActive && <span className="text-amber-600">Inaktiv</span>}
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
