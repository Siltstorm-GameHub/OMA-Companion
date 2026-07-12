"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X, Check, ChevronDown, ChevronUp, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";

type ShopItem = {
  id: string; name: string; description: string; icon: string;
  price: number; type: string; value: string; category: string;
  rarity: string; stock: number | null; active: boolean; sortOrder: number;
  availableFrom: Date | null; availableTo: Date | null;
};

type RarityConfig = Record<string, { label: string; color: string; border: string }>;
type TypeConfig   = Record<string, { label: string; icon: string }>;

interface Props {
  items:        ShopItem[];
  rarityConfig: RarityConfig;
  typeConfig:   TypeConfig;
}

const RARITIES = ["common", "rare", "epic", "legendary"];

function toDateInput(d: Date | null): string {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 16);
}

export default function ShopAdminPanel({ items, rarityConfig, typeConfig }: Props) {
  const router = useRouter();
  const [editing, setEditing]   = useState<string | null>(null);
  const [saving,  setSaving]    = useState(false);
  const [filter,  setFilter]    = useState<"all" | "active" | "inactive">("all");
  const [search,  setSearch]    = useState("");
  const [form, setForm]         = useState<Partial<ShopItem>>({});
  const { confirm, ConfirmDialogElement } = useConfirm();

  const filtered = items.filter(i => {
    if (filter === "active"   && !i.active) return false;
    if (filter === "inactive" &&  i.active) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase()) &&
                  !i.type.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Nach Kategorie gruppieren
  const groups = filtered.reduce<Record<string, ShopItem[]>>((acc, item) => {
    const key = typeConfig[item.type]?.label ?? item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  function startEdit(item: ShopItem) {
    setEditing(item.id);
    setForm({
      name:          item.name,
      description:   item.description,
      price:         item.price,
      rarity:        item.rarity,
      active:        item.active,
      stock:         item.stock,
      availableFrom: item.availableFrom,
      availableTo:   item.availableTo,
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/shop", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Fehler"); return; }
      toast.success("Item gespeichert");
      setEditing(null);
      router.refresh();
    } catch { toast.error("Netzwerkfehler"); }
    finally  { setSaving(false); }
  }

  async function deleteItem(item: ShopItem) {
    if (!(await confirm({ title: "Item löschen", description: `"${item.name}" wirklich dauerhaft löschen? Alle Käufe werden ebenfalls gelöscht.`, variant: "danger" }))) return;
    setSaving(true);
    try {
      await fetch("/api/admin/shop", {
        method:  "DELETE",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: item.id }),
      });
      toast.success("Item gelöscht");
      router.refresh();
    } finally { setSaving(false); }
  }

  async function toggleActive(item: ShopItem) {
    setSaving(true);
    try {
      await fetch("/api/admin/shop", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id: item.id, active: !item.active }),
      });
      toast.success(item.active ? "Item deaktiviert" : "Item aktiviert");
      router.refresh();
    } finally { setSaving(false); }
  }

  return (
    <div className="space-y-6">
      {/* Filter + Suche */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Item suchen..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/40 w-56"
        />
        <div className="flex gap-1 bg-gray-900 border border-white/5 rounded-xl p-1">
          {(["all", "active", "inactive"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                filter === f ? "bg-purple-600/20 text-purple-300" : "text-gray-500 hover:text-gray-300"
              }`}>
              {f === "all" ? "Alle" : f === "active" ? "Aktiv" : "Inaktiv"}
            </button>
          ))}
        </div>
      </div>

      {/* Gruppen */}
      {Object.entries(groups).map(([groupLabel, groupItems]) => (
        <div key={groupLabel}>
          <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <span>{typeConfig[groupItems[0]?.type]?.icon ?? "📦"}</span>
            {groupLabel}
            <span className="text-gray-700 normal-case">({groupItems.length})</span>
          </h2>

          <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {groupItems.map(item => {
              const isEditing = editing === item.id;
              const rarity    = rarityConfig[item.rarity as keyof typeof rarityConfig] ?? rarityConfig.common;

              return (
                <div key={item.id} className={`transition-colors ${isEditing ? "bg-white/[0.03]" : "hover:bg-white/[0.02]"}`}>
                  {/* ── Zeile ── */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Icon */}
                    <span className="text-xl w-8 text-center shrink-0">{item.icon}</span>

                    {/* Name + Typ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium text-sm ${item.active ? "text-white" : "text-gray-600 line-through"}`}>
                          {item.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${rarity.color} ${rarity.border} bg-white/[0.03]`}>
                          {rarity.label}
                        </span>
                        {item.availableTo && new Date(item.availableTo) > new Date() && (
                          <span className="text-[10px] text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded">⏳ Saisonal</span>
                        )}
                        {!item.active && (
                          <span className="text-[10px] text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded">Inaktiv</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 truncate mt-0.5">{item.description}</p>
                    </div>

                    {/* Preis */}
                    <div className="text-right shrink-0 hidden sm:block">
                      <p className="text-sm font-bold text-amber-400">{item.price.toLocaleString("de-DE")}</p>
                      <p className="text-[10px] text-gray-600">Punkte</p>
                    </div>

                    {/* Aktionen */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => deleteItem(item)} disabled={saving}
                        title="Item löschen"
                        className="p-1.5 rounded-lg text-gray-700 hover:text-red-400 hover:bg-red-500/[0.06] transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleActive(item)} disabled={saving}
                        title={item.active ? "Deaktivieren" : "Aktivieren"}
                        className="p-1.5 rounded-lg text-gray-600 hover:text-white hover:bg-white/[0.06] transition-all">
                        {item.active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => isEditing ? setEditing(null) : startEdit(item)}
                        className={`p-1.5 rounded-lg transition-all ${
                          isEditing
                            ? "text-purple-400 bg-purple-500/10"
                            : "text-gray-600 hover:text-white hover:bg-white/[0.06]"
                        }`}>
                        {isEditing ? <ChevronUp className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* ── Edit-Formular ── */}
                  {isEditing && (
                    <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

                        {/* Name */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Name</label>
                          <input type="text" value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
                        </div>

                        {/* Preis */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Preis (Punkte)</label>
                          <input type="number" min={0} value={form.price ?? ""} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                            className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
                        </div>

                        {/* Seltenheit */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Seltenheit</label>
                          <select value={form.rarity ?? "common"} onChange={e => setForm(f => ({ ...f, rarity: e.target.value }))}
                            className="w-full text-sm bg-gray-900 border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/40">
                            {RARITIES.map(r => (
                              <option key={r} value={r}>{rarityConfig[r]?.label ?? r}</option>
                            ))}
                          </select>
                        </div>

                        {/* Stock */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Lagerbestand (leer = ∞)</label>
                          <input type="number" min={0} value={form.stock ?? ""} onChange={e => setForm(f => ({ ...f, stock: e.target.value === "" ? null : Number(e.target.value) }))}
                            placeholder="Unbegrenzt"
                            className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/40" />
                        </div>

                        {/* Verfügbar ab */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Verfügbar ab (saisonal)</label>
                          <input type="datetime-local" value={toDateInput(form.availableFrom as Date | null)}
                            onChange={e => setForm(f => ({ ...f, availableFrom: e.target.value ? new Date(e.target.value) : null }))}
                            className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
                        </div>

                        {/* Verfügbar bis */}
                        <div>
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Verfügbar bis (saisonal)</label>
                          <input type="datetime-local" value={toDateInput(form.availableTo as Date | null)}
                            onChange={e => setForm(f => ({ ...f, availableTo: e.target.value ? new Date(e.target.value) : null }))}
                            className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
                        </div>

                        {/* Beschreibung */}
                        <div className="sm:col-span-2 lg:col-span-3">
                          <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1 block">Beschreibung</label>
                          <input type="text" value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                            className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => saveEdit(item.id)} disabled={saving}
                          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50 transition-all">
                          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          Speichern
                        </button>
                        <button onClick={() => setEditing(null)}
                          className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-lg font-medium glass border border-white/[0.1] text-gray-400 hover:text-white transition-all">
                          <X className="w-3 h-3" /> Abbrechen
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {ConfirmDialogElement}
    </div>
  );
}
