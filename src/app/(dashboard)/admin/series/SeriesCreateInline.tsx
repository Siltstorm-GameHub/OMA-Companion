"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";

const inputCls = "w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-gray-900 border border-white/[0.08] focus:border-teal-500/40 transition-colors";

export default function SeriesCreateInline() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    const res = await fetch("/api/events/series", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null }),
    });
    setLoading(false);
    if (!res.ok) { toast.error("Fehler beim Erstellen"); return; }
    const { id } = await res.json();
    toast.success("Eventreihe erstellt");
    router.push(`/admin/series/${id}`);
  }

  return (
    <div className="rounded-xl overflow-hidden border border-teal-500/20 bg-teal-500/[0.02]">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-teal-300 hover:bg-teal-500/5 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Neue Eventreihe erstellen
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-3 border-t border-teal-500/10 pt-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Name *</label>
            <input
              type="text" required value={name} onChange={e => setName(e.target.value)}
              placeholder="z.B. Friday Fights" className={inputCls}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Beschreibung (optional)</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              rows={2} placeholder="Kurze Beschreibung der Reihe"
              className={`${inputCls} resize-none`}
            />
          </div>
          <button
            type="submit" disabled={loading || !name.trim()}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-white transition-all bg-teal-700 hover:bg-teal-600 disabled:opacity-50"
          >
            {loading ? "Wird erstellt…" : "Reihe erstellen & einrichten"}
          </button>
        </form>
      )}
    </div>
  );
}
