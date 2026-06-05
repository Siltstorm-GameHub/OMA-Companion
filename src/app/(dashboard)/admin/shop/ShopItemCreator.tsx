"use client";
import { useState } from "react";
import { Copy, Check, ChevronDown, ChevronUp, Plus } from "lucide-react";
import { toast } from "sonner";

const TYPES = [
  { value: "title",              label: "Titel",               category: "cosmetic",  valueLabel: "Titel-Text (z.B. Veteran)",                     valuePlaceholder: "Veteran",                    autoValue: undefined },
  { value: "badge",              label: "Abzeichen",           category: "cosmetic",  valueLabel: "Badge-ID (intern, z.B. shop_hero)",             valuePlaceholder: "shop_hero",                  autoValue: undefined },
  { value: "profile_theme",      label: "Profil-Theme",        category: "cosmetic",  valueLabel: "Theme-Schlüssel (z.B. cyber)",                  valuePlaceholder: "cyber",                      autoValue: undefined },
  { value: "name_color",         label: "Namens-Farbe",        category: "cosmetic",  valueLabel: "Hex-Farbe (z.B. #ff6b6b)",                     valuePlaceholder: "#ff6b6b",                    autoValue: undefined },
  { value: "discord_role",       label: "Discord-Rolle",       category: "privilege", valueLabel: "Discord Rollen-ID",                             valuePlaceholder: "1234567890123456789",         autoValue: undefined },
  { value: "xp_boost",           label: "XP-Boost",            category: "boost",     valueLabel: "Dauer in Tagen",                                valuePlaceholder: "7",                          autoValue: undefined },
  { value: "streak_shield",      label: "Streak-Schutz",       category: "boost",     valueLabel: "Automatisch (1)",                               valuePlaceholder: "1",                          autoValue: "1" },
  { value: "event_slot",         label: "Event-Slot",          category: "privilege", valueLabel: "Automatisch (1)",                               valuePlaceholder: "1",                          autoValue: "1" },
  { value: "lul_suggest",        label: "Spieltag-Vorschlag",  category: "privilege", valueLabel: "Automatisch (1)",                               valuePlaceholder: "1",                          autoValue: "1" },
  { value: "tournament_sponsor", label: "Turnier-Sponsoring",  category: "privilege", valueLabel: "Automatisch (1)",                               valuePlaceholder: "1",                          autoValue: "1" },
  { value: "status_message",     label: "Status-Nachricht",    category: "privilege", valueLabel: "Automatisch (1)",                               valuePlaceholder: "1",                          autoValue: "1" },
  { value: "bundle",             label: "Bundle",              category: "cosmetic",  valueLabel: 'Item-IDs als JSON (z.B. ["veteran","emerald"])', valuePlaceholder: '["veteran","emerald"]',       autoValue: undefined },
];
type TypeMeta = typeof TYPES[number];

const RARITIES = [
  { value: "common",    label: "Gewöhnlich" },
  { value: "rare",      label: "Selten" },
  { value: "epic",      label: "Episch" },
  { value: "legendary", label: "Legendär" },
];

function slugify(str: string) {
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function escape(str: string) {
  return str.replace(/'/g, "''");
}

export default function ShopItemCreator() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    name:        "",
    description: "",
    icon:        "🎁",
    type:        "discord_role",
    value:       "",
    rarity:      "rare",
    price:       1000,
    stock:       "",
    sortOrder:   50,
    availableFrom: "",
    availableTo:   "",
  });

  const typeMeta = TYPES.find(t => t.value === form.type) as TypeMeta;
  const category = typeMeta.category;
  const valueToUse = typeMeta.autoValue ?? form.value;
  const id = slugify(form.name) || "neues-item";

  const isValid = form.name.trim() && form.description.trim() && form.icon.trim() && valueToUse.trim();

  function buildSQL() {
    const cols = [
      '"id"', '"name"', '"description"', '"icon"', '"price"', '"type"',
      '"value"', '"category"', '"rarity"', '"active"', '"sortOrder"', '"createdAt"',
    ];
    const vals = [
      `'${escape(id)}'`,
      `'${escape(form.name)}'`,
      `'${escape(form.description)}'`,
      `'${escape(form.icon)}'`,
      String(form.price),
      `'${form.type}'`,
      `'${escape(valueToUse)}'`,
      `'${category}'`,
      `'${form.rarity}'`,
      `true`,
      String(form.sortOrder),
      `NOW()`,
    ];

    const extra: string[] = [];
    if (form.stock !== "") extra.push(`UPDATE "ShopItem" SET "stock" = ${Number(form.stock)} WHERE "id" = '${id}';`);
    if (form.availableFrom) extra.push(`UPDATE "ShopItem" SET "availableFrom" = '${new Date(form.availableFrom).toISOString()}' WHERE "id" = '${id}';`);
    if (form.availableTo)   extra.push(`UPDATE "ShopItem" SET "availableTo"   = '${new Date(form.availableTo).toISOString()}'   WHERE "id" = '${id}';`);

    return [
      `INSERT INTO "ShopItem" (${cols.join(", ")})`,
      `VALUES (${vals.join(", ")})`,
      `ON CONFLICT ("id") DO NOTHING;`,
      ...(extra.length ? ["", "-- Optionale Felder:", ...extra] : []),
    ].join("\n");
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(buildSQL());
    setCopied(true);
    toast.success("SQL kopiert!");
    setTimeout(() => setCopied(false), 2000);
  }

  function set(key: string, val: string | number) {
    setForm(f => ({ ...f, [key]: val }));
  }

  // Wenn Typ gewechselt → value zurücksetzen
  function setType(t: string) {
    const meta = TYPES.find(x => x.value === t)!;
    setForm(f => ({ ...f, type: t, value: meta.autoValue ?? "" }));
  }

  return (
    <div className="glass card-shine rounded-2xl border border-purple-500/15 overflow-hidden">
      {/* Header */}
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-white/[0.02] transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <Plus className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-white">Neues Item erstellen</p>
            <p className="text-xs text-gray-500">Formular ausfüllen → SQL kopieren → in Supabase einfügen</p>
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
      </button>

      {open && (
        <div className="border-t border-white/[0.05] p-5 space-y-5">

          {/* Formular */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Icon */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Icon (Emoji)</label>
              <input type="text" value={form.icon} onChange={e => set("icon", e.target.value)}
                className="w-full text-2xl bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/40 text-center" />
            </div>

            {/* Name */}
            <div className="sm:col-span-1 lg:col-span-2">
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Name *</label>
              <input type="text" value={form.name} onChange={e => set("name", e.target.value)}
                placeholder="z.B. VIP-Rolle"
                className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/40" />
              {form.name && <p className="text-[10px] text-gray-600 mt-1">ID: <code className="text-gray-500">{id}</code></p>}
            </div>

            {/* Beschreibung */}
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Beschreibung *</label>
              <input type="text" value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Kurze Beschreibung des Items für den Shop"
                className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/40" />
            </div>

            {/* Typ */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Typ *</label>
              <select value={form.type} onChange={e => setType(e.target.value)}
                className="w-full text-sm bg-gray-900 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/40">
                {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              <p className="text-[10px] text-gray-600 mt-1">Kategorie: <span className="text-gray-500">{category}</span></p>
            </div>

            {/* Value */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">
                {typeMeta.valueLabel}
                {form.type === "discord_role" && (
                  <span className="ml-1 text-blue-400 normal-case">
                    · Rechtsklick auf Rolle → ID kopieren
                  </span>
                )}
              </label>
              {typeMeta.autoValue ? (
                <div className="w-full text-sm bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2 text-gray-600 select-none">
                  {typeMeta.autoValue} (automatisch)
                </div>
              ) : (
                <input type="text" value={form.value} onChange={e => set("value", e.target.value)}
                  placeholder={typeMeta.valuePlaceholder}
                  className={`w-full text-sm bg-white/[0.04] border rounded-xl px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/40 ${
                    form.type === "discord_role" ? "border-blue-500/20 bg-blue-500/[0.03]" : "border-white/[0.1]"
                  }`} />
              )}
            </div>

            {/* Seltenheit */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Seltenheit</label>
              <select value={form.rarity} onChange={e => set("rarity", e.target.value)}
                className="w-full text-sm bg-gray-900 border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/40">
                {RARITIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>

            {/* Preis */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Preis (Punkte) *</label>
              <input type="number" min={0} value={form.price} onChange={e => set("price", Number(e.target.value))}
                className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
            </div>

            {/* Lagerbestand */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Lagerbestand (leer = ∞)</label>
              <input type="number" min={0} value={form.stock} onChange={e => set("stock", e.target.value)}
                placeholder="Unbegrenzt"
                className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white placeholder-gray-700 focus:outline-none focus:border-purple-500/40" />
            </div>

            {/* Sort Order */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Sortierung</label>
              <input type="number" value={form.sortOrder} onChange={e => set("sortOrder", Number(e.target.value))}
                className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
            </div>

            {/* Verfügbar ab */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Verfügbar ab (optional)</label>
              <input type="datetime-local" value={form.availableFrom} onChange={e => set("availableFrom", e.target.value)}
                className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
            </div>

            {/* Verfügbar bis */}
            <div>
              <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-1.5 block">Verfügbar bis (optional)</label>
              <input type="datetime-local" value={form.availableTo} onChange={e => set("availableTo", e.target.value)}
                className="w-full text-sm bg-white/[0.04] border border-white/[0.1] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500/40" />
            </div>
          </div>

          {/* SQL Vorschau */}
          {isValid && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-gray-500 uppercase tracking-wide">SQL-Befehl → in Supabase einfügen</p>
                <button onClick={handleCopy}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                    copied
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
                      : "bg-purple-600/20 text-purple-300 border border-purple-500/25 hover:bg-purple-600/30"
                  }`}>
                  {copied ? <><Check className="w-3 h-3" /> Kopiert!</> : <><Copy className="w-3 h-3" /> SQL kopieren</>}
                </button>
              </div>
              <pre className="text-xs text-emerald-300 bg-gray-950 border border-white/[0.06] rounded-xl p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed">
                {buildSQL()}
              </pre>
              <p className="text-[10px] text-gray-600 mt-2">
                💡 Danach die Seite neu laden — das Item erscheint sofort im Shop und in der Admin-Liste.
              </p>
            </div>
          )}

          {!isValid && (
            <p className="text-xs text-gray-600 text-center py-2">
              Fülle Name, Beschreibung, Icon und {typeMeta.autoValue ? "" : "Wert "}aus um den SQL-Befehl zu sehen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
