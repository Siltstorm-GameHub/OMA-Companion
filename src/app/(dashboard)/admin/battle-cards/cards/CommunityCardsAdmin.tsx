"use client";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Search, Save, Loader2, ChevronDown, Upload, RotateCcw } from "lucide-react";

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
  const [imageUrl, setImageUrl] = useState(card.imageUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function save(patch: { title?: string; flavorText?: string; imageUrl?: string | null } = { title, flavorText }) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/battle-cards/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
      if (patch.imageUrl !== undefined) setImageUrl(patch.imageUrl);
      toast.success(`${card.name} gespeichert`);
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  async function handleFileSelected(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("kind", "battle-card-avatar");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Upload fehlgeschlagen"); return; }
      await save({ imageUrl: data.url });
    } catch {
      toast.error("Netzwerkfehler beim Upload");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          {imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-white/10" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{card.name}</p>
            <p className="text-xs text-gray-500 truncate">{title || flavorText ? (title || "—") : "Kein Untertitel/Beschreibung gesetzt"}</p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500">Individuelles Avatar-Bild</span>
            <div className="mt-1 flex items-center gap-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[9px] text-gray-600 text-center px-1">
                  Profilbild
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || saving}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-white/[0.06] text-gray-300 hover:bg-white/[0.1] disabled:opacity-50 transition-colors"
                >
                  {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {uploading ? "Lädt hoch…" : "Bild hochladen"}
                </button>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => save({ imageUrl: null })}
                    disabled={uploading || saving}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-gray-500 hover:text-gray-300 disabled:opacity-50 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Zurücksetzen auf Profilbild
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                  e.target.value = "";
                }}
              />
            </div>
            <p className="text-[10px] text-gray-600 mt-1">
              Ohne Upload zeigt die Karte automatisch das aktuelle Discord-Profilbild. Bei einem eigenen
              Bild wird das echte Profilbild zusätzlich als kleines Badge auf der Karte angezeigt.
            </p>
          </label>

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
              maxLength={100}
              rows={3}
              onChange={(e) => setFlavorText(e.target.value)}
              placeholder="leer"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50 resize-none"
            />
          </label>
          <button
            onClick={() => save({ title, flavorText })}
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
