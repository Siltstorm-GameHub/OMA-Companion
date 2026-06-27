"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X, Check, Plus, Loader2, ImageIcon } from "lucide-react";
import { RARITY_CONFIG, type Rarity, MAX_SHOWCASE } from "@/lib/collectibles";

interface ShowcaseItem { id: string; name: string; imageUrl: string | null; rarity: string }
interface OwnedItem    { id: string; name: string; imageUrl: string | null; rarity: string; collectionName: string }

interface Props {
  showcaseItems: ShowcaseItem[];
  allOwned:      OwnedItem[];
  maxSlots:      number;
  readOnly?:     boolean;
}

export default function CollectiblesShowcase({ showcaseItems, allOwned, maxSlots, readOnly = false }: Props) {
  const router = useRouter();
  const [editing,   setEditing]   = useState(false);
  const [selected,  setSelected]  = useState<string[]>(showcaseItems.map(i => i.id));
  const [saving,    setSaving]    = useState(false);

  // Local preview while editing
  const displayItems = editing
    ? selected.map(id => allOwned.find(o => o.id === id)).filter(Boolean) as OwnedItem[]
    : showcaseItems;

  function toggleSelect(id: string) {
    setSelected(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= maxSlots) {
        toast.error(`Maximal ${maxSlots} Figuren erlaubt`);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function saveShowcase() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/showcase", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ itemIds: selected }),
      });
      if (res.ok) {
        toast.success("Showcase gespeichert");
        setEditing(false);
        router.refresh();
      } else {
        const d = await res.json();
        toast.error(d.error ?? "Fehler");
      }
    } finally { setSaving(false); }
  }

  function cancelEdit() {
    setSelected(showcaseItems.map(i => i.id));
    setEditing(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
          🏆 Showcase <span className="text-gray-600 normal-case">({displayItems.length}/{maxSlots})</span>
        </h2>
        {!readOnly && !editing ? (
          <button
            onClick={() => setEditing(true)}
            disabled={allOwned.length === 0}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-white/[0.1] text-gray-500 hover:text-white hover:border-white/[0.2] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Pencil className="w-3 h-3" /> Bearbeiten
          </button>
        ) : !readOnly ? (
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-white/[0.08] text-gray-500 hover:text-white transition-colors">
              <X className="w-3 h-3" /> Abbrechen
            </button>
            <button
              onClick={saveShowcase}
              disabled={saving}
              className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Speichern
            </button>
          </div>
        ) : null}
      </div>

      {/* Showcase-Slots */}
      <div className="glass card-shine rounded-2xl p-4">
        {allOwned.length === 0 && !readOnly ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm font-medium">Noch keine Figuren gesammelt</p>
            <p className="text-xs text-gray-600 mt-1">Kaufe Figuren im Shop, um deinen Showcase zu befüllen</p>
          </div>
        ) : (
          <>
            {/* 5 Slots */}
            <div className="flex gap-3 flex-wrap">
              {Array.from({ length: maxSlots }).map((_, i) => {
                const item = displayItems[i];
                const rarity = item ? (RARITY_CONFIG[item.rarity as Rarity] ?? RARITY_CONFIG.common) : null;
                return (
                  <div
                    key={i}
                    className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border transition-all ${
                      item && rarity
                        ? `${rarity.border} ${rarity.glow} bg-white/[0.02]`
                        : "border-dashed border-white/[0.1] bg-white/[0.01]"
                    }`}
                    style={{ width: "72px", height: "88px" }}
                  >
                    {item ? (
                      <>
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} className="w-10 h-10 object-contain" loading="lazy" />
                          : <ImageIcon className="w-7 h-7 text-gray-600" />
                        }
                        <span className={`text-[9px] font-medium px-1 text-center leading-tight ${rarity?.color}`}>{item.name}</span>
                        {!readOnly && editing && (
                          <button
                            onClick={() => toggleSelect(item.id)}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500/80 border border-red-400/40 flex items-center justify-center hover:bg-red-500"
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        )}
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5 text-gray-700" />
                        <span className="text-[9px] text-gray-700">Leer</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Picker (nur beim Bearbeiten) */}
            {editing && (
              <div className="mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-3">
                  Figuren auswählen ({selected.length}/{maxSlots})
                </p>
                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto pr-1">
                  {allOwned.map(item => {
                    const isSelected = selected.includes(item.id);
                    const rarity     = RARITY_CONFIG[item.rarity as Rarity] ?? RARITY_CONFIG.common;
                    return (
                      <button
                        key={item.id}
                        onClick={() => toggleSelect(item.id)}
                        title={`${item.name} · ${item.collectionName}`}
                        className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-xl border transition-all ${
                          isSelected
                            ? `${rarity.border} ${rarity.glow} bg-white/[0.06] ring-1 ring-inset ${rarity.border.replace("border-", "ring-")}`
                            : `${rarity.border} bg-white/[0.01] hover:bg-white/[0.04]`
                        }`}
                      >
                        {item.imageUrl
                          ? <img src={item.imageUrl} alt={item.name} className="w-8 h-8 object-contain" loading="lazy" />
                          : <ImageIcon className="w-5 h-5 text-gray-600" />
                        }
                        <span className={`text-[9px] font-medium ${rarity.color}`}>{item.name}</span>
                        {isSelected && (
                          <span className="text-[8px] text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-2 h-2" /> Ausgewählt
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
