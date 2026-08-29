"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Search, Save, Loader2, ChevronDown } from "lucide-react";

interface CardRow {
  id: string;
  name: string;
  title: string;
  flavorText: string;
  imageUrl: string | null;
}

function CardEditRow({ card }: { card: CardRow }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [flavorText, setFlavorText] = useState(card.flavorText);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/battle-cards/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, flavorText }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
      toast.success(`${card.name} gespeichert`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{card.name}</p>
          <p className="text-xs text-gray-500 truncate">{title || flavorText ? (title || "—") : "Kein Untertitel/Beschreibung gesetzt"}</p>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500">Untertitel</span>
            <input
              type="text"
              value={title}
              maxLength={25}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="leer"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Beschreibung</span>
            <textarea
              value={flavorText}
              maxLength={240}
              rows={3}
              onChange={(e) => setFlavorText(e.target.value)}
              placeholder="leer"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50 resize-none"
            />
          </label>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>
      )}
    </div>
  );
}

export function CommunityCardsAdmin({ cards }: { cards: CardRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => c.name.toLowerCase().includes(q));
  }, [cards, search]);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nach Name suchen…"
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
        />
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">Keine Karten gefunden.</p>
        ) : (
          filtered.map((card) => <CardEditRow key={card.id} card={card} />)
        )}
      </div>
    </div>
  );
}
