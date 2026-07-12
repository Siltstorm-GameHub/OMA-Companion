"use client";

import { useState } from "react";
import CoinIcon from "@/components/CoinIcon";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown, ChevronUp, Eye, EyeOff, Check, X, Loader2, Package, ImageIcon, Pencil, Tag } from "lucide-react";
import { RARITY_CONFIG, type Rarity, effectivePrice } from "@/lib/collectibles";
import { useConfirm } from "@/components/admin/ConfirmDialog";

const RARITIES: Rarity[] = ["common", "rare", "epic", "legendary"];

interface CollectibleItem {
  id: string; name: string; description: string | null; imageUrl: string | null;
  rarity: string; price: number; salePrice: number | null; saleUntil: string | null;
  active: boolean; stock: number | null; sortOrder: number;
}
interface Collection {
  id: string; name: string; description: string | null; game: string | null;
  coverImageUrl: string | null; active: boolean; sortOrder: number;
  items: CollectibleItem[];
}

interface Props { collections: Collection[] }

function ItemImage({ url, name, size = "lg" }: { url: string | null; name: string; size?: "sm" | "lg" }) {
  const dim = size === "lg" ? "w-16 h-16" : "w-10 h-10";
  if (url) return <img src={url} alt={name} className={`${dim} object-contain rounded-lg`} />;
  return (
    <div className={`${dim} rounded-lg bg-white/[0.05] border border-white/[0.08] flex items-center justify-center`}>
      <ImageIcon className={size === "lg" ? "w-7 h-7 text-gray-600" : "w-4 h-4 text-gray-600"} />
    </div>
  );
}

// Datum-String für datetime-local Input (lokale Zeit)
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CollectiblesAdminPanel({ collections: initial }: Props) {
  const [cols, setCols] = useState<Collection[]>(initial);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirm();

  // ── Neue Sammlung ─────────────────────────────────────────────────────────
  const [newCol,     setNewCol]     = useState({ name: "", description: "", game: "", coverImageUrl: "" });
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
      setCols(c => [...c, { ...data, items: [] }].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCol({ name: "", description: "", game: "", coverImageUrl: "" });
      setShowNewCol(false);
      toast.success("Sammlung erstellt");
    } finally { setBusy(false); }
  }

  async function toggleCollectionActive(col: Collection) {
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
    if (!(await confirm({ title: "Sammlung löschen", description: `Sammlung „${col.name}" und alle ${col.items.length} Items löschen?`, variant: "danger" }))) return;
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

  // ── Sammlung bearbeiten ───────────────────────────────────────────────────
  const [editColId,   setEditColId]   = useState<string | null>(null);
  const [editColForm, setEditColForm] = useState({ name: "", description: "", game: "", coverImageUrl: "" });

  function startEditCol(col: Collection) {
    setEditColId(col.id);
    setEditColForm({ name: col.name, description: col.description ?? "", game: col.game ?? "", coverImageUrl: col.coverImageUrl ?? "" });
  }

  async function saveEditCol(col: Collection) {
    if (!editColForm.name.trim()) { toast.error("Name fehlt"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({
          type: "collection", id: col.id,
          name:          editColForm.name.trim(),
          description:   editColForm.description.trim() || null,
          game:          editColForm.game.trim()        || null,
          coverImageUrl: editColForm.coverImageUrl.trim() || null,
        }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      setCols(c =>
        c.map(x => x.id === col.id ? {
          ...x,
          name:          editColForm.name.trim(),
          description:   editColForm.description.trim() || null,
          game:          editColForm.game.trim()        || null,
          coverImageUrl: editColForm.coverImageUrl.trim() || null,
        } : x).sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditColId(null);
      toast.success("Sammlung gespeichert");
    } finally { setBusy(false); }
  }

  // ── Neues Item ────────────────────────────────────────────────────────────
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
          imageUrl:    form.imageUrl    || null,
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
    if (!(await confirm({ title: "Item löschen", description: `„${item.name}" löschen?`, variant: "danger" }))) return;
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

  // ── Item: Sichtbarkeit ───────────────────────────────────────────────────
  async function toggleItemActive(collectionId: string, item: CollectibleItem) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles/items", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ id: item.id, active: !item.active }),
      });
      if (!res.ok) { toast.error("Fehler"); return; }
      setCols(c => c.map(col => col.id === collectionId
        ? { ...col, items: col.items.map(i => i.id === item.id ? { ...i, active: !i.active } : i) }
        : col));
      toast.success(item.active ? "Figur ausgeblendet" : "Figur sichtbar");
    } finally { setBusy(false); }
  }

  // ── Item: Rabatt ─────────────────────────────────────────────────────────
  const [saleItemId,   setSaleItemId]   = useState<string | null>(null);
  const [saleForm,     setSaleForm]     = useState({ salePrice: "", saleUntil: "" });

  function startSale(item: CollectibleItem) {
    setSaleItemId(item.id);
    setSaleForm({
      salePrice: item.salePrice != null ? String(item.salePrice) : "",
      saleUntil: toDatetimeLocal(item.saleUntil),
    });
  }

  async function saveSale(collectionId: string, item: CollectibleItem) {
    setBusy(true);
    try {
      const salePrice = saleForm.salePrice ? Number(saleForm.salePrice) : null;
      const saleUntil = saleForm.saleUntil ? new Date(saleForm.saleUntil).toISOString() : null;
      const res = await fetch("/api/admin/collectibles/items", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ id: item.id, salePrice, saleUntil }),
      });
      if (!res.ok) { toast.error("Fehler"); return; }
      setCols(c => c.map(col => col.id === collectionId
        ? { ...col, items: col.items.map(i => i.id === item.id ? { ...i, salePrice, saleUntil } : i) }
        : col));
      setSaleItemId(null);
      toast.success(salePrice != null ? "Rabatt gesetzt" : "Rabatt entfernt");
    } finally { setBusy(false); }
  }

  async function clearSale(collectionId: string, item: CollectibleItem) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/collectibles/items", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ id: item.id, salePrice: null, saleUntil: null }),
      });
      if (!res.ok) { toast.error("Fehler"); return; }
      setCols(c => c.map(col => col.id === collectionId
        ? { ...col, items: col.items.map(i => i.id === item.id ? { ...i, salePrice: null, saleUntil: null } : i) }
        : col));
      setSaleItemId(null);
      toast.success("Rabatt entfernt");
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

      {cols.length === 0 && (
        <div className="glass rounded-2xl p-10 text-center">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500">Noch keine Sammlungen. Lege die erste an!</p>
        </div>
      )}

      {/* Sammlungen */}
      {cols.map(col => {
        const isOpen    = open[col.id]  ?? false;
        const isEditing = editColId     === col.id;
        const itemForm  = newItem[col.id] ?? emptyItem();
        const showForm  = showNewItem   === col.id;

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
                <p className="text-sm font-semibold text-white truncate">{col.name}</p>
                <p className="text-xs text-gray-500">{col.game ? `${col.game} · ` : ""}{col.items.length} Figuren</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${col.active ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.04] text-gray-600 border border-white/[0.06]"}`}>
                {col.active ? "Sichtbar" : "Ausgeblendet"}
              </span>
              <button onClick={() => isEditing ? setEditColId(null) : startEditCol(col)} title="Sammlung bearbeiten"
                className={`p-1.5 rounded-lg border transition-colors ${isEditing ? "text-indigo-400 border-indigo-500/30 bg-indigo-500/10" : "text-gray-500 hover:text-indigo-400 border-transparent hover:border-indigo-500/20"}`}>
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => toggleCollectionActive(col)} disabled={busy} title={col.active ? "Ausblenden" : "Im Shop anzeigen"}
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

            {/* Bearbeitungsformular */}
            {isEditing && (
              <div className="px-4 py-3 border-b border-indigo-500/15 bg-indigo-500/[0.04] space-y-3">
                <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Sammlung bearbeiten</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={editColForm.name} onChange={e => setEditColForm(s => ({ ...s, name: e.target.value }))}
                    placeholder="Name *" className="col-span-2 input-glass text-xs" />
                  <input value={editColForm.game} onChange={e => setEditColForm(s => ({ ...s, game: e.target.value }))}
                    placeholder="Spiel" className="input-glass text-xs" />
                  <input value={editColForm.coverImageUrl} onChange={e => setEditColForm(s => ({ ...s, coverImageUrl: e.target.value }))}
                    placeholder="Cover-Bild URL" className="input-glass text-xs" />
                  <input value={editColForm.description} onChange={e => setEditColForm(s => ({ ...s, description: e.target.value }))}
                    placeholder="Beschreibung (optional)" className="col-span-2 input-glass text-xs" />
                </div>
                {editColForm.coverImageUrl && (
                  <div className="flex items-center gap-3">
                    <img src={editColForm.coverImageUrl} alt="Vorschau" className="w-12 h-12 object-contain rounded-xl border border-white/[0.1]" />
                    <p className="text-xs text-gray-500">Vorschau</p>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setEditColId(null)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-white/[0.06] transition-colors">Abbrechen</button>
                  <button onClick={() => saveEditCol(col)} disabled={busy}
                    className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Speichern
                  </button>
                </div>
              </div>
            )}

            {/* Items */}
            {isOpen && (
              <div className="p-4 space-y-3">
                {col.items.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {col.items.map(item => {
                      const r         = RARITY_CONFIG[item.rarity as Rarity] ?? RARITY_CONFIG.common;
                      const isOnSale  = item.salePrice != null && (item.saleUntil == null || new Date() <= new Date(item.saleUntil));
                      const dispPrice = effectivePrice(item);
                      const showSale  = saleItemId === item.id;

                      return (
                        <div key={item.id} className={`relative rounded-xl border ${r.border} bg-white/[0.02] p-3 flex flex-col items-center gap-1.5 ${!item.active ? "opacity-40" : ""}`}>
                          {/* Sale-Badge */}
                          {isOnSale && (
                            <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-500/30">
                              <Tag className="w-2.5 h-2.5 text-rose-400" />
                              <span className="text-[8px] font-bold text-rose-400">SALE</span>
                            </div>
                          )}

                          <ItemImage url={item.imageUrl} name={item.name} size="lg" />
                          <p className="text-xs font-semibold text-white text-center leading-tight">{item.name}</p>
                          <span className={`text-[10px] ${r.color} font-medium`}>{r.label}</span>

                          {/* Preis */}
                          <div className="flex flex-col items-center gap-0.5">
                            {isOnSale && (
                              <p className="flex items-center gap-0.5 text-[10px] text-gray-500 line-through tabular-nums">{item.price.toLocaleString("de-DE")} <CoinIcon size={11} /></p>
                            )}
                            <p className={`text-[11px] font-bold tabular-nums ${isOnSale ? "text-rose-400" : "text-amber-400"}`}>
                              <span className="flex items-center gap-0.5">{dispPrice.toLocaleString("de-DE")} <CoinIcon size={11} /></span>
                            </p>
                          </div>
                          {item.stock !== null && <p className="text-[10px] text-gray-500">Lager: {item.stock}</p>}

                          {/* Rabatt-Formular */}
                          {showSale && (
                            <div className="w-full mt-1 space-y-1.5 border-t border-white/[0.08] pt-2">
                              <p className="text-[10px] text-rose-400 font-semibold uppercase tracking-wide">Rabatt</p>
                              <input
                                type="number"
                                value={saleForm.salePrice}
                                onChange={e => setSaleForm(s => ({ ...s, salePrice: e.target.value }))}
                                placeholder="Rabattpreis *"
                                className="w-full input-glass text-[10px] py-1 px-2"
                              />
                              <input
                                type="datetime-local"
                                value={saleForm.saleUntil}
                                onChange={e => setSaleForm(s => ({ ...s, saleUntil: e.target.value }))}
                                className="w-full input-glass text-[10px] py-1 px-2"
                              />
                              <p className="text-[9px] text-gray-600">Kein Ablaufdatum = dauerhafter Rabatt</p>
                              <div className="flex gap-1">
                                {isOnSale && (
                                  <button onClick={() => clearSale(col.id, item)} disabled={busy}
                                    className="flex-1 text-[10px] py-1 rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-colors">
                                    Entfernen
                                  </button>
                                )}
                                <button onClick={() => setSaleItemId(null)}
                                  className="flex-1 text-[10px] py-1 rounded-lg border border-white/[0.08] text-gray-500 hover:text-white transition-colors">
                                  Abbrechen
                                </button>
                                <button onClick={() => saveSale(col.id, item)} disabled={busy || !saleForm.salePrice}
                                  className="flex-1 text-[10px] py-1 rounded-lg bg-rose-600/80 hover:bg-rose-500 text-white transition-colors disabled:opacity-40">
                                  {busy ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Speichern"}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Action-Buttons */}
                          {!showSale && (
                            <div className="flex gap-1 w-full mt-1">
                              {/* Rabatt */}
                              <button onClick={() => startSale(item)} title="Rabatt setzen"
                                className={`flex-1 flex items-center justify-center py-1 rounded-lg border text-[10px] transition-colors ${
                                  isOnSale
                                    ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
                                    : "border-white/[0.06] text-gray-600 hover:text-rose-400 hover:border-rose-500/20"
                                }`}>
                                <Tag className="w-3 h-3" />
                              </button>
                              {/* Sichtbarkeit */}
                              <button onClick={() => toggleItemActive(col.id, item)} disabled={busy} title={item.active ? "Ausblenden" : "Einblenden"}
                                className="flex-1 flex items-center justify-center py-1 rounded-lg border border-white/[0.06] text-gray-600 hover:text-white hover:border-white/[0.15] transition-colors">
                                {item.active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                              {/* Löschen */}
                              <button onClick={() => deleteItem(col.id, item)} disabled={busy} title="Figur löschen"
                                className="flex-1 flex items-center justify-center py-1 rounded-lg border border-white/[0.06] text-gray-600 hover:text-red-400 hover:border-red-500/20 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
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
      {ConfirmDialogElement}
    </div>
  );
}
