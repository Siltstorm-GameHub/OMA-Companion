"use client";

// Bearbeitet Name/Flavor-Text/Beschreibung/Artwork einer Taktik-Karte (Item/
// Falle für OMA Duels) — analog zu CommunityCardsAdmin.tsx. `kind` und der
// Trigger (bei Fallen) sind nur zur Orientierung sichtbar, nicht editierbar
// hier (siehe tactic-card-content.ts-Kommentar: Spieldaten kommen aus dem Seed).

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Search, Save, Loader2, Upload, RotateCcw, Shield, Zap } from "@/components/icons";

interface TacticCardRow {
  id: string;
  name: string;
  kind: "INSTANT" | "TRAP";
  flavorText: string;
  description: string;
  imageUrl: string | null;
  triggerCondition: { type: string } | null;
}

function TacticCardEditRow({ card }: { card: TacticCardRow }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(card.name);
  const [flavorText, setFlavorText] = useState(card.flavorText);
  const [description, setDescription] = useState(card.description);
  const [imageUrl, setImageUrl] = useState(card.imageUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const Icon = card.kind === "TRAP" ? Shield : Zap;

  async function save(
    patch: { name?: string; flavorText?: string; description?: string; imageUrl?: string | null } = {
      name,
      flavorText,
      description,
    }
  ) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/battle-cards/tactic-cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
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
      form.append("kind", "tactic-card-art");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Upload fehlgeschlagen");
        return;
      }
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
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-white/10" />
          ) : (
            <div
              className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center border border-white/10 ${
                card.kind === "TRAP" ? "bg-rose-500/10" : "bg-amber-500/10"
              }`}
            >
              <Icon className={`w-4 h-4 ${card.kind === "TRAP" ? "text-rose-400" : "text-amber-400"}`} />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{card.name}</p>
            <p className="text-xs text-gray-500 truncate">
              {card.kind === "TRAP" ? "Falle" : "Item"}
              {card.triggerCondition ? ` · löst bei ${card.triggerCondition.type}` : ""}
            </p>
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <label className="block">
            <span className="text-xs text-gray-500">Artwork</span>
            <div className="mt-1 flex items-center gap-3">
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imageUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-white/10" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[9px] text-gray-600 text-center px-1">
                  Kein Bild
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
                    <RotateCcw className="w-3.5 h-3.5" /> Entfernen
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
              Extern (z.B. per ComfyUI) generieren, dann hier hochladen — es gibt keine In-App-Generierung.
            </p>
          </label>

          <label className="block">
            <span className="text-xs text-gray-500">Name</span>
            <input
              type="text"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Flavor-Text</span>
            <textarea
              value={flavorText}
              maxLength={140}
              rows={2}
              onChange={(e) => setFlavorText(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50 resize-none"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-500">Beschreibung (Effekt-Klartext fürs UI)</span>
            <textarea
              value={description}
              maxLength={140}
              rows={2}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-teal-500/50 resize-none"
            />
          </label>
          <p className="text-[10px] text-gray-600">
            Spielwerte (Effekte, Trigger-Bedingung) werden über den Content-Seed gepflegt, nicht hier.
          </p>
          <button
            onClick={() => save({ name, flavorText, description })}
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

export function TacticCardsAdmin({ cards }: { cards: TacticCardRow[] }) {
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
          <p className="text-sm text-gray-500">Keine Taktik-Karten gefunden.</p>
        ) : (
          filtered.map((card) => <TacticCardEditRow key={card.id} card={card} />)
        )}
      </div>
    </div>
  );
}
