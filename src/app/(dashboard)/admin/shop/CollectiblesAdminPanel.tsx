"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, Check, X, Loader2, Package, ImageIcon } from "lucide-react";
import { RARITY_CONFIG, type Rarity } from "@/lib/collectibles";

const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];

interface CollectibleItem {
  id: string; name: string; description: string | null; imageUrl: string | null;
  rarity: string; price: number; stock: number | null; sortOrder: number;
}
interface Collection {
  id: string; name: string; description: string | null; game: string | null;
  coverImageUrl: string | null; active: boolean; sortOrder: number;
  items: CollectibleItem[];
}

interface Props { collections: Collection[] }

function ItemImage({ url, name, size = "lg" }: { url: string | null; name: string; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16" : "w-10 h-10";
  if (url) {
    return <img src={url} alt={name} className={`${dim} object-contain rounded-lg`} />;
  }
  return (
    <div className={`${dim} rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center`}>
      <ImageIcon className={size === "lg" ? "w-7 h-7 text-gray-600" : "w-4 h-4 text-gray-600"} />
    </div>
  );
}

export default function CollectiblesAdminPanel({ collections: initial }: Props) {
  const router = useRouter();
  const [cols,  setCols] = useState<Collection[]>(initial);
  const [open,  setOpen] = useState<Record<string, boolean>>({});
  const [busy,  setBusy] = useState(false);

  // ── Neue Sammlung ────────────────────────────────────────────────────────
  const [newCol, setNewCol]       = useState({ name: "", description: "", game: "", coverImageUrl: "" });
  const [showNewCol, setShowNewCol] = useState(false);

  async function createCollection() {
    if (!newCol.name.trim()) { toast.error("Name fehlt"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ ...newCol, coverImageUrl: newCol.coverImageUrl || null, active: true }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      setCols(c => [...c, { ...data, items: [] }]);
      setNewCol({ name: "", description: "", game: "", coverImageUrl: "" });
      setShowNewCol(false);
      toast.success("Sammlung erstellt");
    } finally { setBusy(false); }
  }

  async function toggleActive(col: Collection) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ type: "collection", id: col.id, active: !col.active }),
      });
      if (!res.ok) { toast.error("Fehler"); return; }
      setCols(c => c.map(x => x.id === col.id ? { ...x, active: !x.active } : x));
      toast.success(col.active ? "Sammlung ausgeblendet" : "Sammlung sichtbar");
    } finally { setBusy(false); }
  }

  async function deleteCollection(col: Collection) {
    if (!confirm(`Sammlung „${col.name}" und alle ${col.items.length} Items löschen?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ type: "collection", id: col.id }),
      });
      if (!res.ok) { toast.error("Fehler"); return; }
      setCols(c => c.filter(x => x.id !== col.id));
      toast.success("Sammlung gelöscht");
    } finally { setBusy(false); }
  }

  // ── Neues Item ───────────────────────────────────────────────────────────
  const emptyItem = () => ({ name: "", description: "", imageUrl: "", rarity: "common" as Rarity, price: "", stock: "" });
  const [newItem,     setNewItem]     = useState<Record<string, ReturnType<typeof emptyItem>>>({});
  const [showNewItem, setShowNewItem] = useState<string | null>(null);

  async function createItem(collectionId: string) {
    const form = newItem[collectionId];
    if (!form?.name.trim() || !form.price) { toast.error("Name und Preis sind Pflicht"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles/items", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({
          collectionId,
          name:        form.name,
          description: form.description || null,
          imageUrl:    form.imageUrl || null,
          rarity:      form.rarity,
          price:       Number(form.price),
          stock:       form.stock ? Number(form.stock) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      setCols(c => c.map(col => col.id === collectionId ? { ...col, items: [...col.items, data] } : col));
      setNewItem(ni => ({ ...ni, [collectionId]: emptyItem() }));
      setShowNewItem(null);
      toast.success(`${data.name} hinzugefügt`);
    } finally { setBusy(false); }
  }

  async function deleteItem(collectionId: string, item: CollectibleItem) {
    if (!confirm(`„${item.name}" löschen?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ type: "item", id: item.id }),
      });
      if (!res.ok) { toast.error("Fehler"); return; }
      setCols(c => c.map(col => col.id === collectionId
        ? { ...col, items: col.items.filter(i => i.id !== item.id) } : col));
      toast.success("Item gelöscht");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-white">{cols.length} Sammlungen · {cols.reduce((s, c) => s + c.items.length, 0)} Figuren gesamt</p>
          <p className="text-xs text-gray-500">Sammlungen im Shop ein-/ausblenden und Figuren verwalten</p>
        </div>
        <button onClick={() => setShowNewCol(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Neue Sammlung
        </button>
      </div>

      {/* Formular neue Sammlung */}
      {showNewCol && (
        <div className="glass card-shine rounded-2xl p-4 border border-indigo-500/20 space-y-3">
          <p className="text-sm font-semibold text-white">Neue Sammlung</p>
          <div className="grid grid-cols-2 gap-3">
            <input value={newCol.name} onChange={e => setNewCol(s => ({ ...s, name: e.target.value }))}
              placeholder="Name *" className="col-span-2 input-glass" />
            <input value={newCol.game} onChange={e => setNewCol(s => ({ ...s, game: e.target.value }))}
              placeholder="Spiel (z.B. Rocket League)" className="input-glass" />
            <input value={newCol.coverImageUrl} onChange={e => setNewCol(s => ({ ...s, coverImageUrl: e.target.value }))}
              placeholder="Cover-Bild URL (Supabase)" className="input-glass" />
            <input value={newCol.description} onChange={e => setNewCol(s => ({ ...s, description: e.target.value }))}
              placeholder="Beschreibung (optional)" className="col-span-2 input-glass" />
          </div>
          {/* Cover-Vorschau */}
          {newCol.coverImageUrl && (
            <div className="flex items-center gap-3">
              <img src={newCol.coverImageUrl} alt="Vorschau" className="w-12 h-12 object-contain rounded-xl border border-white/[0.1]" />
              <p className="text-xs text-gray-500">Vorschau</p>
            </div>
          )}
          <div className="flex items-center justify-end gap-2">
            <button onClick={() => setShowNewCol(false)} className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 rounded-lg border border-white/[0.08] transition-colors">Abbrechen</button>
            <button onClick={createCollection} disabled={busy}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Erstellen
            </button>
          </div>
        </div>
      )}

      {/* Leer-State */}
      {cols.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Noch keine Sammlungen. Lege die erste an!</p>
        </div>
      )}

      {/* Sammlungen */}
      {cols.map(col => {
        const isOpen   = open[col.id] ?? false;
        const itemForm = newItem[col.id] ?? emptyItem();
        const showForm = showNewItem === col.id;

        return (
          <div key={col.id} className={`glass card-shine rounded-2xl overflow-hidden ${!col.active ? "opacity-60" : ""}`}>
            {/* Collection Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]">
              {col.coverImageUrl
                ? <img src={col.coverImageUrl} alt={col.name} className="w-10 h-10 object-contain rounded-lg shrink-0" />
                : <div className="w-10 h-10 rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center shrink-0">
                    <ImageIcon className="w-5 h-5 text-gray-600" />
                  </div>
              }
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">{col.name}</p>
                <p className="text-xs text-gray-500">{col.game ? `${col.game} · ` : ""}{col.items.length} Figuren</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${col.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.04] text-gray-600 border border-white/[0.06]"}`}>
                {col.active ? "Sichtbar" : "Ausgeblendet"}
              </span>
              <button onClick={() => toggleActive(col)} disabled={busy} title={col.active ? "Ausblenden" : "Im Shop anzeigen"}
                className="p-1.5 rounded-lg text-gray-500 hover:text-white border border-transparent hover:border-white/[0.1] transition-colors">
                {col.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => deleteCollection(col)} disabled={busy} title="Sammlung löschen"
                className="p-1.5 rounded-lg text-gray-600 hover:text-red-400 border border-transparent hover:border-red-500/20 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(o => ({ ...o, [col.id]: !isOpen }))}
                className="p-1.5 rounded-lg text-gray-600 hover:text-white transition-colors">
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>

            {/* Items */}
            {isOpen && (
              <div className="p-4 space-y-3">
                {col.items.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {col.items.map(item => {
                      const r = RARITY_CONFIG[item.rarity as Rarity] ?? RARITY_CONFIG.common;
                      return (
                        <div key={item.id} className={`relative rounded-xl border ${r.border} bg-white/[0.02] p-3 flex flex-col items-center gap-1.5`}>
                          <ItemImage url={item.imageUrl} name={item.name} size="lg" />
                          <p className="text-xs font-semibold text-white text-center leading-tight">{item.name}</p>
                          <span className={`text-[10px] ${r.color} font-medium`}>{r.label}</span>
                          <p className="text-[11px] text-amber-400 font-bold">{item.price.toLocaleString("de-DE")} 🪙</p>
                          {item.stock !== null && <p className="text-[10px] text-gray-500">Lager: {item.stock}</p>}
                          <button onClick={() => deleteItem(col.id, item)} disabled={busy}
                            className="absolute top-1.5 right-1.5 p-1 rounded-lg text-gray-600 hover:text-red-400 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Neue Figur */}
                {!showForm ? (
                  <button onClick={() => { setShowNewItem(col.id); setNewItem(ni => ({ ...ni, [col.id]: itemForm })); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/[0.1] text-xs text-gray-500 hover:text-white hover:border-white/[0.2] transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Figur hinzufügen
                  </button>
                ) : (
                  <div className="glass rounded-xl p-4 border border-indigo-500/20 space-y-3">
                    <p className="text-xs font-semibold text-white">Neue Figur</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input value={itemForm.name} onChange={e => setNewItem(ni => ({ ...ni, [col.id]: { ...itemForm, name: e.target.value } }))}
                        placeholder="Name *" className="col-span-2 input-glass text-xs" />
                      <input value={itemForm.imageUrl} onChange={e => setNewItem(ni => ({ ...ni, [col.id]: { ...itemForm, imageUrl: e.target.value } }))}
                        placeholder="Bild-URL (Supabase) *" className="col-span-2 input-glass text-xs" />
                      {/* Bild-Vorschau */}
                      {itemForm.imageUrl && (
                        <div className="col-span-2 flex items-center gap-3">
                          <img src={itemForm.imageUrl} alt="Vorschau" className="w-14 h-14 object-contain rounded-xl border border-white/[0.1]" />
                          <p className="text-xs text-gray-500">Vorschau</p>
                        </div>
                      )}
                      <select value={itemForm.rarity} onChange={e => setNewItem(ni => ({ ...ni, [col.id]: { ...itemForm, rarity: e.target.value as Rarity } }))}
                        className="input-glass text-xs">
                        {RARITIES.map(r => <option key={r} value={r}>{RARITY_CONFIG[r].label}</option>)}
                      </select>
                      <input type="number" value={itemForm.price} onChange={e => setNewItem(ni => ({ ...ni, [col.id]: { ...itemForm, price: e.target.value } }))}
                        placeholder="Preis (Münzen) *" className="input-glass text-xs" />
                      <input type="number" value={itemForm.stock} onChange={e => setNewItem(ni => ({ ...ni, [col.id]: { ...itemForm, stock: e.target.value } }))}
                        placeholder="Lager (leer = ∞)" className="input-glass text-xs" />
                      <input value={itemForm.description} onChange={e => setNewItem(ni => ({ ...ni, [col.id]: { ...itemForm, description: e.target.value } }))}
                        placeholder="Beschreibung (optional)" className="col-span-2 input-glass text-xs" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowNewItem(null)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.06] transition-colors">Abbrechen</button>
                      <button onClick={() => createItem(col.id)} disabled={busy}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
                        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Hinzufügen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
