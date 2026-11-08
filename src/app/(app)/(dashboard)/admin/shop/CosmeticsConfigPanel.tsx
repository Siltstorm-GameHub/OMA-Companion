"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Save, Undo2 } from "@/components/icons";
import { NumberInput } from "@/components/ui/NumberInput";
import { CosmeticName, CosmeticTitle } from "@/components/cosmetics/CosmeticName";
import LookPreview, { lookOfSet } from "@/components/cosmetics/LookPreview";
import { AuraLayer } from "@/components/RankRing";
import { getFrameRing } from "@/lib/cosmetics/frame-style";
import {
  CATEGORY_META, CATEGORY_ORDER, COSMETICS, COSMETIC_SETS, RARITY_META, SEASONS, SEASON_ORDER, formatMmdd,
  getCosmetic, isValidMmdd, unlockLabel,
  type Cosmetic, type CosmeticCategory, type CosmeticSet, type SeasonKey,
} from "@/lib/cosmetics/catalog";
import {
  computeAvailability, isSeasonEnabled, isSeasonRunning, isSetEnabled, seasonWindow, setDiscountPct,
  type CosmeticsConfig, type ShopSettings,
} from "@/lib/cosmetics/availability";
import "@/components/RankRing.css";

/** Mini-Vorschau ohne Avatarbild (Admin-Liste). */
function Swatch({ item }: { item: Cosmetic }) {
  switch (item.category) {
    case "frame": {
      const ring = getFrameRing(item);
      return (
        <div className={`${ring.className} rounded-full w-8 h-8`} style={{ ...ring.style, padding: 3 }}>
          <span className="rr-ring-layer" aria-hidden="true" />
          <div className="rr-face rounded-full w-full h-full bg-zinc-800" />
        </div>
      );
    }
    case "aura":
      return (
        <div className="rank-ring rr-t1 rounded-full w-7 h-7" style={{ padding: 2 }}>
          <AuraLayer aura={item} />
          <span className="rr-ring-layer" aria-hidden="true" />
          <div className="rr-face rounded-full w-full h-full bg-zinc-800" />
        </div>
      );
    case "background":
      return <div className="w-10 h-7 rounded-md border border-white/10" style={{ background: item.css }} />;
    case "title":
      return <CosmeticTitle title={item.id} className="text-[9px]" />;
    case "nameColor":
      return <CosmeticName nameColor={item.id} className="text-sm font-black">Name</CosmeticName>;
  }
}

function availabilityNote(item: Cosmetic, settings: ShopSettings): string | null {
  if (item.season) {
    const s = SEASONS[item.season];
    const w = seasonWindow(item.season, settings);
    return `${s.emoji} ${s.name} (${formatMmdd(w.from)}–${formatMmdd(w.to)})`;
  }
  if (item.rotationOnly) return "✨ Wochen-Exklusiv";
  return null;
}

/** "TT.MM." ↔ "MM-DD". Übernimmt den Wert erst, wenn das Datum gültig ist. */
function toMmdd(text: string): string | null {
  const m = text.trim().match(/^(\d{1,2})\.(\d{1,2})\.?$/);
  if (!m) return null;
  const v = `${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return isValidMmdd(v) ? v : null;
}

function DateField({ value, onChange, label }: { value: string; onChange: (mmdd: string) => void; label: string }) {
  const [text, setText] = useState(formatMmdd(value));
  const [lastValue, setLastValue] = useState(value);
  // Externe Änderung (z.B. „Verwerfen“, „Standard“) übernehmen
  if (value !== lastValue) {
    setLastValue(value);
    setText(formatMmdd(value));
  }
  const valid = toMmdd(text) !== null;
  return (
    <label className="flex items-center gap-1.5 text-[10px] text-gray-400">
      {label}
      <input
        value={text}
        inputMode="numeric"
        placeholder="TT.MM."
        aria-invalid={!valid}
        onChange={e => {
          setText(e.target.value);
          const v = toMmdd(e.target.value);
          if (v) onChange(v);
        }}
        onBlur={() => setText(formatMmdd(value))}
        className={`w-20 px-2 py-1.5 rounded-lg bg-white/[0.04] border text-white text-sm text-center tabular-nums focus:outline-none ${
          valid ? "border-white/10 focus:border-teal-500/50" : "border-rose-500/60"
        }`}
      />
    </label>
  );
}

type View = CosmeticCategory | "season" | "exclusive" | "sets";

const VIEWS: { key: View; label: string }[] = [
  ...CATEGORY_ORDER.map(c => ({ key: c as View, label: CATEGORY_META[c].plural })),
  { key: "season", label: "🍂 Saison" },
  { key: "exclusive", label: "✨ Exklusiv" },
  { key: "sets", label: "🎁 Sets" },
];

const inputCls = "px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm text-right tabular-nums focus:outline-none focus:border-teal-500/50";

export function CosmeticsConfigPanel({ initial, initialSettings, ownerCounts }: {
  initial: CosmeticsConfig;
  initialSettings: ShopSettings;
  /** Wie viele User den Artikel besitzen */
  ownerCounts: Record<string, number>;
}) {
  const [config, setConfig] = useState<CosmeticsConfig>(initial);
  const [settings, setSettings] = useState<ShopSettings>(initialSettings);
  const [saved, setSaved] = useState({ config: initial, settings: initialSettings });
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<View>("frame");

  const dirty = useMemo(
    () => JSON.stringify({ config, settings }) !== JSON.stringify(saved),
    [config, settings, saved],
  );
  // Live-Vorschau der aktuellen Woche mit den (noch ungespeicherten) Werten
  const avail = useMemo(() => computeAvailability(config, settings, new Date()), [config, settings]);
  const weekly = COSMETICS.filter(c => { const t = avail.get(c.id)?.tag; return (t === "offer" || t === "exclusive") && avail.get(c.id)?.buyable; });

  // Günstig → teuer nach aktuellem (Admin-)Preis, Freischalt-Artikel ans Ende
  const priceOf = (c: Cosmetic) => (c.defaultPrice === null ? Number.POSITIVE_INFINITY : config[c.id]?.price ?? c.defaultPrice);
  const items = (view === "sets" ? [] : COSMETICS.filter(c =>
    view === "season" ? !!c.season : view === "exclusive" ? !!c.rotationOnly : c.category === view,
  )).sort((a, b) => priceOf(a) - priceOf(b) || a.name.localeCompare(b.name, "de"));

  function patch(id: string, p: { price?: number; enabled?: boolean }) {
    setConfig(prev => {
      const next = { ...prev, [id]: { ...prev[id], ...p } };
      // Werte, die dem Standard entsprechen, nicht speichern — so greifen spätere Katalog-Änderungen
      const item = COSMETICS.find(c => c.id === id);
      const o = next[id];
      if (item && o.price === item.defaultPrice) delete o.price;
      if (o.enabled === true) delete o.enabled;
      if (o.price === undefined && o.enabled === undefined) delete next[id];
      return next;
    });
  }

  function patchSet(set: CosmeticSet, p: { discountPct?: number; enabled?: boolean }) {
    setSettings(prev => {
      const o = { ...prev.sets[set.id], ...p };
      if (o.discountPct === set.discountPct) delete o.discountPct;
      if (o.enabled === true) delete o.enabled;
      const sets = { ...prev.sets };
      if (o.discountPct === undefined && o.enabled === undefined) delete sets[set.id];
      else sets[set.id] = o;
      return { ...prev, sets };
    });
  }

  function patchSeason(season: SeasonKey, p: { from?: string; to?: string; enabled?: boolean } | null) {
    setSettings(prev => {
      const seasons = { ...prev.seasons };
      if (p === null) { delete seasons[season]; return { ...prev, seasons }; } // zurück auf Standard
      const o = { ...seasons[season], ...p };
      if (o.from === SEASONS[season].from) delete o.from;
      if (o.to === SEASONS[season].to) delete o.to;
      if (o.enabled === true) delete o.enabled;
      if (o.from === undefined && o.to === undefined && o.enabled === undefined) delete seasons[season];
      else seasons[season] = o;
      return { ...prev, seasons };
    });
  }

  function renderSeasonRow(season: SeasonKey) {
    const s = SEASONS[season];
    const w = seasonWindow(season, settings);
    const enabled = isSeasonEnabled(season, settings);
    const running = isSeasonRunning(season, settings, new Date());
    const customized = !!settings.seasons[season];
    const count = COSMETICS.filter(c => c.season === season).length;
    return (
      <div key={season} className={`flex items-center gap-3 px-4 py-2.5 flex-wrap ${!enabled ? "opacity-50" : ""}`}>
        <div className="flex-1 min-w-[9rem]">
          <p className="text-sm text-white font-medium">
            {s.emoji} {s.name}
            {running && <span className="ml-1.5 text-[9px] font-bold text-emerald-300">läuft gerade</span>}
          </p>
          <p className="text-[10px] text-gray-500">
            {count} Artikel{customized && <> · Standard {formatMmdd(s.from)}–{formatMmdd(s.to)}</>}
          </p>
        </div>
        <DateField label="von" value={w.from} onChange={from => patchSeason(season, { from })} />
        <DateField label="bis" value={w.to} onChange={to => patchSeason(season, { to })} />
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={e => patchSeason(season, { enabled: e.target.checked })}
            className="w-4 h-4 accent-teal-500" />
          <span className="text-[10px] text-gray-400 w-8">{enabled ? "An" : "Aus"}</span>
        </label>
        <button onClick={() => patchSeason(season, null)} disabled={!customized}
          className="text-[10px] text-gray-500 hover:text-white disabled:opacity-30 disabled:hover:text-gray-500 transition-colors">
          Standard
        </button>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/cosmetics", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, settings }),
      });
      if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return; }
      const data = await res.json();
      setConfig(data.config);
      setSettings(data.settings);
      setSaved({ config: data.config, settings: data.settings });
      toast.success("Shop-Einstellungen gespeichert");
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  function renderItemRow(item: Cosmetic) {
    const o = config[item.id] ?? {};
    const unlockOnly = item.defaultPrice === null;
    const enabled = o.enabled ?? true;
    const price = o.price ?? item.defaultPrice ?? 0;
    const rarity = RARITY_META[item.rarity];
    const note = view === "season" ? null : availabilityNote(item, settings);
    const a = avail.get(item.id);
    return (
      <div key={item.id} className={`flex items-center gap-3 px-4 py-3 ${!unlockOnly && !enabled ? "opacity-50" : ""}`}>
        <div className="w-12 flex items-center justify-center shrink-0"><Swatch item={item} /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white font-medium truncate">
            {item.name}
            {a?.tag === "offer" && <span className="ml-1.5 text-[9px] font-bold text-rose-300">−{a.discountPct} % diese Woche</span>}
            {a?.tag === "exclusive" && a.buyable && <span className="ml-1.5 text-[9px] font-bold text-fuchsia-300">diese Woche kaufbar</span>}
            {a?.tag === "season" && a.buyable && <span className="ml-1.5 text-[9px] font-bold text-orange-300">gerade kaufbar</span>}
          </p>
          <p className="text-[10px] text-gray-500">
            <span style={{ color: rarity.color }}>{rarity.label}</span>
            {(view === "season" || view === "exclusive") && <> · {CATEGORY_META[item.category].label}</>}
            {!unlockOnly && <> · {ownerCounts[item.id] ?? 0}× verkauft</>}
            {!unlockOnly && o.price !== undefined && <> · Standard {item.defaultPrice}</>}
            {note && <> · {note}</>}
          </p>
        </div>
        {unlockOnly ? (
          <span className="text-[10px] text-gray-500 px-2 py-0.5 rounded-full bg-white/[0.04]">Freischaltung: {unlockLabel(item)}</span>
        ) : (
          <>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">Preis</span>
              <NumberInput min={0} value={price} className={`w-24 ${inputCls}`}
                onChange={e => patch(item.id, { price: Math.max(0, parseInt(e.target.value, 10) || 0) })} />
              <span className="text-[10px] text-gray-500">Münzen</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={e => patch(item.id, { enabled: e.target.checked })}
                className="w-4 h-4 accent-teal-500" />
              <span className="text-[10px] text-gray-400 w-14">{enabled ? "Im Shop" : "Aus"}</span>
            </label>
          </>
        )}
      </div>
    );
  }

  function renderSetRow(set: CosmeticSet) {
    const enabled = isSetEnabled(set, settings);
    const pct = setDiscountPct(set, settings);
    // Preis für jemanden, der noch keinen Artikel besitzt (mit aktuellen Artikelpreisen inkl. Wochenrabatt)
    const full = set.items.reduce((s, id) => s + (avail.get(id)?.price ?? 0), 0);
    const price = Math.round(full * (100 - pct) / 100);
    const blocked = set.items.filter(id => !avail.get(id)?.buyable);
    return (
      <div key={set.id} className={`px-4 py-3 space-y-2.5 ${!enabled ? "opacity-50" : ""}`}>
        <div className="flex items-start gap-3 flex-wrap">
          <LookPreview look={lookOfSet(set)} name="Vorschau" size={36} className="w-48 shrink-0" />
          <div className="flex-1 min-w-[10rem]">
            <p className="text-sm text-white font-medium">{set.name}</p>
            <p className="text-[10px] text-gray-500">{set.description}</p>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {set.items.map(id => {
                const c = getCosmetic(id);
                return c ? (
                  <span key={id} className={`text-[10px] px-1.5 py-0.5 rounded-full border ${blocked.includes(id) ? "border-rose-500/40 text-rose-300" : "border-white/10 text-gray-300"}`}>
                    {CATEGORY_META[c.category].label}: {c.name}
                  </span>
                ) : null;
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-end">
          <span className="text-[11px] text-gray-400 mr-auto">
            Komplett: <span className="text-white font-semibold">{price.toLocaleString("de-DE")}</span>
            <span className="line-through opacity-60 ml-1">{full.toLocaleString("de-DE")}</span> Münzen
            {blocked.length > 0 && <span className="text-rose-300"> · gerade nicht kaufbar ({blocked.length} Artikel aus)</span>}
          </span>
          <label className="flex items-center gap-1.5 text-[10px] text-gray-400">
            Rabatt
            <NumberInput min={0} max={90} value={pct} className={`w-16 ${inputCls}`}
              onChange={e => patchSet(set, { discountPct: Math.min(90, Math.max(0, parseInt(e.target.value, 10) || 0)) })} />
            %
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={enabled} onChange={e => patchSet(set, { enabled: e.target.checked })}
              className="w-4 h-4 accent-teal-500" />
            <span className="text-[10px] text-gray-400 w-14">{enabled ? "Im Shop" : "Aus"}</span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Wochenangebot */}
      <div className="glass rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-white font-medium">Angebote der Woche</p>
          <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400">
            <input type="checkbox" checked={settings.weeklyEnabled} onChange={e => setSettings(s => ({ ...s, weeklyEnabled: e.target.checked }))}
              className="w-4 h-4 accent-teal-500" />
            Rabatte aktiv
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="flex items-center justify-between gap-2 text-xs text-gray-400">
            Artikel mit Rabatt
            <NumberInput min={0} max={12} value={settings.weeklyCount} className={`w-16 ${inputCls}`}
              onChange={e => setSettings(s => ({ ...s, weeklyCount: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
          </label>
          <label className="flex items-center justify-between gap-2 text-xs text-gray-400">
            Rabatt in %
            <NumberInput min={0} max={90} value={settings.weeklyDiscountPct} className={`w-16 ${inputCls}`}
              onChange={e => setSettings(s => ({ ...s, weeklyDiscountPct: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
          </label>
          <label className="flex items-center justify-between gap-2 text-xs text-gray-400">
            Exklusiv-Artikel
            <NumberInput min={0} max={5} value={settings.exclusiveCount} className={`w-16 ${inputCls}`}
              onChange={e => setSettings(s => ({ ...s, exclusiveCount: Math.max(0, parseInt(e.target.value, 10) || 0) }))} />
          </label>
        </div>
        <div className="text-[11px] text-gray-500 leading-relaxed">
          Wechselt jeden Montag automatisch (für alle gleich). Diese Woche:{" "}
          {weekly.length === 0 ? "keine Angebote." : weekly.map((c, i) => {
            const a = avail.get(c.id)!;
            return (
              <span key={c.id} className="text-gray-300">
                {i > 0 && ", "}{c.name} ({CATEGORY_META[c.category].label}{a.tag === "exclusive" ? ", exklusiv" : `, ${a.price} statt ${a.basePrice}`})
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {VIEWS.map(v => (
          <button key={v.key} onClick={() => setView(v.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              v.key === view ? "bg-teal-600/20 text-teal-300 ring-1 ring-teal-500/20" : "text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]"
            }`}>
            {v.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">
        {view === "sets"
          ? "Set-Preis = Summe der noch fehlenden Artikel (aktuelle Preise inkl. Wochenrabatt) minus Set-Rabatt. Ein Set ist nur kaufbar, wenn alle fehlenden Artikel gerade kaufbar sind."
          : view === "season"
            ? "Lege fest, wann welche Saison läuft (TT.MM., jedes Jahr gleich; das Ende darf im Folgejahr liegen, z.B. 27.12.–06.01.). Saison-Artikel sind nur in diesem Zeitraum kaufbar — darunter stellst du ihre Preise ein."
            : view === "exclusive"
              ? "Pro Woche ist eine zufällige Auswahl dieser Artikel kaufbar (Anzahl oben unter „Exklusiv-Artikel“)."
              : "Preise und Angebot (sortiert nach Preis). Deaktivierte Artikel verschwinden aus dem Shop, bleiben bei Käufern aber erhalten. Belohnungs- und Community-Job-Artikel sind nicht käuflich."}
      </p>

      {view === "season" ? (
        <div className="space-y-4">
          <div className="glass rounded-2xl divide-y divide-white/5">
            <p className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Zeiträume</p>
            {SEASON_ORDER.map(renderSeasonRow)}
          </div>
          {SEASON_ORDER.map(season => {
            const list = items.filter(c => c.season === season);
            if (list.length === 0) return null;
            const w = seasonWindow(season, settings);
            return (
              <div key={season} className="glass rounded-2xl divide-y divide-white/5">
                <p className="px-4 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
                  {SEASONS[season].emoji} {SEASONS[season].name} · {formatMmdd(w.from)}–{formatMmdd(w.to)}
                </p>
                {list.map(renderItemRow)}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="glass rounded-2xl divide-y divide-white/5">
          {view === "sets"
            ? [...COSMETIC_SETS].sort((a, b) => a.name.localeCompare(b.name, "de")).map(renderSetRow)
            : items.map(renderItemRow)}
        </div>
      )}

      <div className="flex items-center gap-2 sticky bottom-3">
        <button
          onClick={save}
          disabled={saving || !dirty}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-medium transition-colors disabled:opacity-50 shadow-lg"
        >
          <Save className="w-4 h-4" />
          {saving ? "Speichert…" : dirty ? "Änderungen speichern" : "Gespeichert"}
        </button>
        {dirty && (
          <button onClick={() => { setConfig(saved.config); setSettings(saved.settings); }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-gray-400 hover:text-white bg-white/[0.04] transition-colors">
            <Undo2 className="w-4 h-4" /> Verwerfen
          </button>
        )}
      </div>
    </div>
  );
}
