"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CoinIcon from "@/components/CoinIcon";
import RankRing from "@/components/RankRing";
import { Tabs } from "@/components/admin/Tabs";
import { Check, Clock, Crown, Lock, ShoppingBag, Sparkles, Undo2 } from "@/components/icons";
import { CosmeticName, CosmeticTitle } from "@/components/cosmetics/CosmeticName";
import { setCachedLook } from "@/components/cosmetics/useUserLook";
import {
  CATEGORY_META, CATEGORY_ORDER, COSMETICS, COSMETIC_SETS, RARITY_META, SEASONS, getCosmetic, getCosmeticOf,
  resolveLook, unlockLabel, unlockRequirement,
  type Cosmetic, type CosmeticCategory, type SeasonKey, type UserLook,
} from "@/lib/cosmetics/catalog";
import type { ItemAvailability } from "@/lib/cosmetics/availability";
import type { ShopState } from "@/lib/cosmetics/service";

const fmt = (n: number) => n.toLocaleString("de-DE");

/** "noch 3 Tage" / "noch 5 Std." bis zum Zeitpunkt */
function timeLeft(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "endet gleich";
  const h = Math.ceil(ms / 3_600_000);
  if (h < 48) return `noch ${h} Std.`;
  return `noch ${Math.ceil(h / 24)} Tage`;
}

/** Günstig → teuer nach aktuellem Preis; nicht käufliche Artikel ans Ende. */
function byPrice(avail: Map<string, ItemAvailability>) {
  return (a: Cosmetic, b: Cosmetic) => {
    const pa = avail.get(a.id)?.price ?? Number.POSITIVE_INFINITY;
    const pb = avail.get(b.id)?.price ?? Number.POSITIVE_INFINITY;
    return pa - pb || a.name.localeCompare(b.name, "de");
  };
}

/** Avatar mit beliebigem Aussehen (Vorschau, ohne Abruf). */
function PreviewAvatar({ look, image, name, size }: { look: UserLook; image: string | null; name: string; size: number }) {
  const ring = Math.max(2, Math.round(size * 0.06)) + 1;
  return (
    <RankRing look={look} width={ring} rounded="rounded-full" faceClassName="w-full h-full"
      className="shrink-0" style={{ width: size, height: size, boxSizing: "border-box" }}>
      {image ? (
        <Image src={image} alt={name} width={size} height={size} className="rounded-full object-cover w-full h-full" unoptimized />
      ) : (
        <div className="rounded-full w-full h-full flex items-center justify-center font-bold bg-zinc-800 text-zinc-400"
          style={{ fontSize: Math.round(size * 0.38) }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </RankRing>
  );
}

/** Kleine Vorschau eines Artikels in seiner Karte. */
function ItemPreview({ item, image, name, size = 1 }: { item: Cosmetic; image: string | null; name: string; size?: number }) {
  switch (item.category) {
    case "frame":
      return <PreviewAvatar look={{ frame: item.id }} image={image} name={name} size={Math.round(56 * size)} />;
    case "aura":
      return <PreviewAvatar look={{ aura: item.id }} image={image} name={name} size={Math.round(48 * size)} />;
    case "background":
      return (
        <div className="w-full rounded-xl border border-white/10 relative overflow-hidden bg-white/[0.02]" style={{ height: Math.round(56 * size) }}>
          <div className="absolute inset-0" style={{ background: item.css }} />
        </div>
      );
    case "title":
      return (
        <div className="flex items-center justify-center px-2 text-center" style={{ minHeight: Math.round(56 * size) }}>
          <CosmeticTitle title={item.id} className="text-[11px]" />
        </div>
      );
    case "nameColor":
      return (
        <div className="flex items-center justify-center px-2" style={{ minHeight: Math.round(56 * size) }}>
          <CosmeticName nameColor={item.id} className="text-lg font-black truncate max-w-full">{name}</CosmeticName>
        </div>
      );
  }
}

function PriceTag({ a }: { a: ItemAvailability }) {
  if (a.price === null) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <CoinIcon size={13} /> {fmt(a.price)}
      {a.discountPct && a.basePrice !== null && <span className="text-[10px] line-through opacity-60">{fmt(a.basePrice)}</span>}
    </span>
  );
}

function TagBadge({ a, item }: { a: ItemAvailability; item: Cosmetic }) {
  const base = "absolute top-2 right-2 z-10 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md";
  if (a.tag === "offer" && a.discountPct) return <span className={`${base} bg-rose-500 text-white`}>−{a.discountPct} %</span>;
  if (a.tag === "exclusive") return <span className={`${base} bg-fuchsia-500/90 text-white`}>Exklusiv</span>;
  if (a.tag === "season" && item.season) return <span className={`${base} bg-orange-500/90 text-white`}>{SEASONS[item.season].emoji} Saison</span>;
  return null;
}

type Busy = { id: string } | null;

export default function CosmeticsShop({ userId, displayName, image, initial }: {
  userId: string;
  displayName: string;
  image: string | null;
  initial: ShopState;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [category, setCategory] = useState<CosmeticCategory>("frame");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewSet, setPreviewSet] = useState<string | null>(null);
  const [confirmBuy, setConfirmBuy] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const owned = useMemo(() => new Set(state.owned), [state.owned]);
  const avail = useMemo(() => new Map(state.items.map(i => [i.id, i])), [state.items]);
  const sortByPrice = useMemo(() => byPrice(avail), [avail]);
  const currentLook = useMemo(() => resolveLook(state.equipped, state.reputationPeakLevel), [state.equipped, state.reputationPeakLevel]);

  // Vorschau = aktuelles Aussehen, ersetzt durch den angeklickten Artikel bzw. das ganze Set
  const previewLook: UserLook = useMemo(() => {
    const look: UserLook = { ...currentLook };
    const set = COSMETIC_SETS.find(s => s.id === previewSet);
    for (const id of set?.items ?? []) {
      const c = getCosmetic(id);
      if (c) look[c.category] = c.id;
    }
    const p = getCosmetic(preview);
    if (p) look[p.category] = p.id;
    return look;
  }, [currentLook, preview, previewSet]);
  const bg = getCosmeticOf(previewLook.background, "background");

  const visible = (c: Cosmetic) => owned.has(c.id) || !!avail.get(c.id)?.visible;
  const items = COSMETICS.filter(c => c.category === category && visible(c)).sort(sortByPrice);
  const offers = COSMETICS.filter(c => { const t = avail.get(c.id)?.tag; return (t === "offer" || t === "exclusive") && avail.get(c.id)?.buyable; }).sort(sortByPrice);
  const seasonItems = COSMETICS.filter(c => avail.get(c.id)?.tag === "season" && avail.get(c.id)?.buyable).sort(sortByPrice);
  const activeSeasons = [...new Set(seasonItems.map(c => c.season!))] as SeasonKey[];
  const seasonUntil = seasonItems.map(c => avail.get(c.id)?.until).filter(Boolean).sort()[0];
  const sets = [...state.sets]
    .filter(s => s.buyable || s.missing.length === 0)
    .sort((a, b) => (a.missing.length === 0 ? 1 : 0) - (b.missing.length === 0 ? 1 : 0) || a.price - b.price);
  const equippedId = currentLook[category] ?? null;

  async function reload() {
    try {
      const res = await fetch("/api/cosmetics", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch { /* Anzeige bleibt beim letzten Stand */ }
  }

  function applyEquipped(equipped: ShopState["equipped"]) {
    const look = resolveLook(equipped, state.reputationPeakLevel);
    setState(s => ({ ...s, equipped, look }));
    setCachedLook(userId, look);
  }

  async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  }

  async function equip(cat: CosmeticCategory, itemId: string | null) {
    setBusy({ id: itemId ?? `none:${cat}` });
    try {
      const { ok, data } = await post("/api/cosmetics/equip", { category: cat, itemId });
      if (!ok) { toast.error(data.error ?? "Ausrüsten fehlgeschlagen"); return; }
      applyEquipped(data.equipped);
      setPreview(null);
      toast.success(itemId ? `${getCosmetic(itemId)?.name} ausgerüstet` : `${CATEGORY_META[cat].label} abgelegt`);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  async function buy(item: Cosmetic) {
    setBusy({ id: item.id });
    try {
      const { ok, data } = await post("/api/cosmetics/purchase", { itemId: item.id });
      if (!ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }
      setConfirmBuy(null);
      toast.success(`${item.name} gekauft!`);
      setBusy(null);
      await equip(item.category, item.id); // direkt anlegen — dafür kauft man es ja
      await reload(); // Set-Preise und Besitz neu berechnen
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  async function buySet(setId: string) {
    setBusy({ id: setId });
    try {
      const { ok, data } = await post("/api/cosmetics/purchase-set", { setId });
      if (!ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }
      applyEquipped(data.equipped);
      setConfirmBuy(null);
      setPreviewSet(null);
      toast.success(`${COSMETIC_SETS.find(s => s.id === setId)?.name} gekauft und angelegt!`);
      await reload();
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  // Bewusst als Render-Funktion statt eigener Komponente: greift auf den Shop-State zu, ohne bei jedem Render neu gemountet zu werden
  function renderItem(item: Cosmetic, compact = false) {
    const a = avail.get(item.id) ?? { id: item.id, basePrice: null, price: null, buyable: false, visible: false };
    const isOwned = owned.has(item.id);
    const isEquipped = currentLook[item.category] === item.id;
    const isUnlockItem = item.defaultPrice === null;
    const rarity = RARITY_META[item.rarity];
    const affordable = a.price !== null && state.balance >= a.price;
    const isPreviewed = preview === item.id;
    const isBusy = busy?.id === item.id;
    const requirement = unlockRequirement(item);
    const togglePreview = () => { setPreviewSet(null); setPreview(isPreviewed ? null : item.id); };

    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={togglePreview}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); togglePreview(); } }}
        className={`glass relative rounded-2xl p-3 flex flex-col gap-2 cursor-pointer transition-all border ${
          isEquipped ? "border-teal-500/50" : isPreviewed ? "border-white/25" : "border-transparent hover:border-white/10"
        } ${isUnlockItem && !isOwned ? "opacity-80" : ""}`}
        style={{ boxShadow: isPreviewed ? `0 0 18px ${rarity.color}22` : undefined }}
      >
        <div className="absolute top-0 inset-x-3 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${rarity.color}80, transparent)` }} />
        {!isOwned && <TagBadge a={a} item={item} />}
        <div className={`flex items-center justify-center ${compact ? "min-h-[60px]" : "min-h-[72px]"}`}>
          <ItemPreview item={item} image={image} name={displayName} size={compact ? 0.85 : 1} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{item.name}</p>
          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: rarity.color }}>
            {compact ? CATEGORY_META[item.category].label : rarity.label}
            {isUnlockItem && ` · ${unlockLabel(item)}`}
          </p>
          {isUnlockItem && requirement && !isOwned && (
            <p className="text-[10px] text-gray-500 mt-1 leading-snug">{requirement}</p>
          )}
        </div>

        <div className="mt-auto" onClick={e => e.stopPropagation()}>
          {isEquipped ? (
            <div className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-teal-300 bg-teal-500/10">
              <Check className="w-3.5 h-3.5" /> Ausgerüstet
            </div>
          ) : isOwned ? (
            <button onClick={() => equip(item.category, item.id)} disabled={!!busy}
              className="w-full py-1.5 rounded-lg text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 transition-colors disabled:opacity-50">
              {isBusy ? "…" : "Ausrüsten"}
            </button>
          ) : isUnlockItem ? (
            <div className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-gray-500 bg-white/[0.03]">
              <Lock className="w-3 h-3" /> Freischalten
            </div>
          ) : !a.buyable ? (
            <div className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs text-gray-500 bg-white/[0.03]">
              Nicht im Angebot
            </div>
          ) : confirmBuy === item.id ? (
            <div className="flex gap-1.5">
              <button onClick={() => buy(item)} disabled={!!busy}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50">
                {isBusy ? "…" : "Kaufen!"}
              </button>
              <button onClick={() => setConfirmBuy(null)} disabled={!!busy}
                className="px-2 py-1.5 rounded-lg text-xs text-gray-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
                Nein
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setConfirmBuy(item.id); setPreviewSet(null); setPreview(item.id); }}
              disabled={!affordable || !!busy}
              title={affordable ? undefined : "Nicht genug Münzen"}
              className={`w-full flex items-center justify-center py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                affordable ? "text-amber-200 bg-amber-500/15 hover:bg-amber-500/25" : "text-gray-500 bg-white/[0.03] cursor-not-allowed"
              }`}
            >
              <PriceTag a={a} />
            </button>
          )}
        </div>
      </div>
    );
  }

  const sectionH = "text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-2";

  return (
    <div className="space-y-6">
      {/* Kopf */}
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.25)", boxShadow: "0 0 20px rgba(245,158,11,0.10)" }}>
              <ShoppingBag className="w-4.5 h-4.5 text-amber-400" />
            </div>
            <h1 className="font-display text-2xl font-black text-white tracking-tight">Shop</h1>
          </div>
          <p className="text-xs text-gray-500 ml-11">Gib deine Münzen für Rahmen, Auren, Hintergründe, Titel und Namensfarben aus</p>
        </div>
        <div className="glass rounded-xl px-4 py-2 flex items-center gap-2">
          <CoinIcon size={18} />
          <span className="text-lg font-black text-amber-300 tabular-nums">{fmt(state.balance)}</span>
          <span className="text-xs text-gray-500">Münzen</span>
        </div>
      </div>

      {/* Vorschau */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-5 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-teal-900/10 pointer-events-none" />
        {bg && <div className="absolute inset-0 pointer-events-none" style={{ background: bg.css }} />}
        <div className="relative flex items-center gap-5">
          <div className="p-3">
            <PreviewAvatar look={previewLook} image={image} name={displayName} size={80} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{preview || previewSet ? "Vorschau" : "So sehen dich andere"}</p>
            <CosmeticName nameColor={previewLook.nameColor} as="p" className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {displayName}
            </CosmeticName>
            <CosmeticTitle title={previewLook.title} className="mt-1" />
            {(preview || previewSet) && (
              <button onClick={() => { setPreview(null); setPreviewSet(null); }} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                <Undo2 className="w-3 h-3" /> Vorschau zurücksetzen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Angebote der Woche */}
      {offers.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className={sectionH}><Sparkles className="w-3.5 h-3.5 text-rose-400" /> Angebote der Woche</h2>
            {state.weekEndsAt && (
              <span className="text-[11px] text-gray-500 flex items-center gap-1" suppressHydrationWarning>
                <Clock className="w-3 h-3" /> Wechsel montags · {timeLeft(state.weekEndsAt)}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {offers.map(item => renderItem(item, true))}
          </div>
        </section>
      )}

      {/* Saison */}
      {seasonItems.length > 0 && (
        <section className="space-y-3 rounded-2xl p-4 border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.07] to-transparent">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className={sectionH}>
              <span className="text-sm">{activeSeasons.map(s => SEASONS[s].emoji).join(" ")}</span>
              Saison: {activeSeasons.map(s => SEASONS[s].name).join(" & ")}
            </h2>
            <span className="text-[11px] text-orange-300/80 flex items-center gap-1" suppressHydrationWarning>
              <Clock className="w-3 h-3" /> nur für kurze Zeit · {timeLeft(seasonUntil)}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {seasonItems.map(item => renderItem(item, true))}
          </div>
        </section>
      )}

      {/* Sets */}
      {sets.length > 0 && (
        <section className="space-y-3">
          <h2 className={sectionH}><ShoppingBag className="w-3.5 h-3.5 text-amber-400" /> Sets · zusammen günstiger</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {sets.map(s => {
              const set = COSMETIC_SETS.find(x => x.id === s.id)!;
              const complete = s.missing.length === 0;
              const affordable = state.balance >= s.price;
              const isPreviewed = previewSet === s.id;
              const confirmKey = `set:${s.id}`;
              const discount = s.missing.length > 1 ? set.discountPct : 0;
              return (
                <div key={s.id}
                  role="button" tabIndex={0}
                  onClick={() => { setPreview(null); setPreviewSet(isPreviewed ? null : s.id); }}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPreview(null); setPreviewSet(isPreviewed ? null : s.id); } }}
                  className={`glass rounded-2xl p-3 flex flex-col gap-3 cursor-pointer border transition-all ${isPreviewed ? "border-white/25" : "border-transparent hover:border-white/10"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{set.name}</p>
                      <p className="text-[11px] text-gray-500">{set.description}</p>
                    </div>
                    {!complete && discount > 0 && <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500 text-black">−{discount} %</span>}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {set.items.map(id => {
                      const c = getCosmetic(id);
                      if (!c) return null;
                      const have = owned.has(id);
                      return (
                        <span key={id} className={`text-[10px] px-2 py-0.5 rounded-full border ${have ? "border-teal-500/40 text-teal-300 bg-teal-500/10" : "border-white/10 text-gray-300 bg-white/[0.03]"}`}>
                          {have && "✓ "}{CATEGORY_META[c.category].label}: {c.name}
                        </span>
                      );
                    })}
                  </div>
                  <div className="mt-auto" onClick={e => e.stopPropagation()}>
                    {complete ? (
                      <div className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-semibold text-teal-300 bg-teal-500/10">
                        <Check className="w-3.5 h-3.5" /> Komplett
                      </div>
                    ) : confirmBuy === confirmKey ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => buySet(s.id)} disabled={!!busy}
                          className="flex-1 py-1.5 rounded-lg text-xs font-semibold text-black bg-amber-400 hover:bg-amber-300 transition-colors disabled:opacity-50">
                          {busy?.id === s.id ? "…" : `${s.missing.length} Artikel kaufen!`}
                        </button>
                        <button onClick={() => setConfirmBuy(null)} disabled={!!busy}
                          className="px-2 py-1.5 rounded-lg text-xs text-gray-400 bg-white/[0.05] hover:bg-white/[0.1] transition-colors">
                          Nein
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setConfirmBuy(confirmKey); setPreview(null); setPreviewSet(s.id); }}
                        disabled={!affordable || !!busy}
                        title={affordable ? undefined : "Nicht genug Münzen"}
                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          affordable ? "text-amber-200 bg-amber-500/15 hover:bg-amber-500/25" : "text-gray-500 bg-white/[0.03] cursor-not-allowed"
                        }`}
                      >
                        <CoinIcon size={13} /> {fmt(s.price)}
                        {s.price < s.fullPrice && <span className="text-[10px] line-through opacity-60">{fmt(s.fullPrice)}</span>}
                        {s.missing.length < set.items.length && <span className="text-[10px] opacity-70">· {s.missing.length} fehlen</span>}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Kategorien */}
      <section className="space-y-3">
        <div>
          <Tabs
            active={category}
            onChange={k => { setCategory(k as CosmeticCategory); setConfirmBuy(null); }}
            className="overflow-x-auto scrollbar-none whitespace-nowrap"
            tabs={CATEGORY_ORDER.map(c => ({ key: c, label: CATEGORY_META[c].plural }))}
          />
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <p className="text-xs text-gray-500">{CATEGORY_META[category].hint} · sortiert nach Preis</p>
            {equippedId && (
              <button
                onClick={() => equip(category, null)}
                disabled={!!busy}
                className="text-xs text-gray-400 hover:text-white px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              >
                {CATEGORY_META[category].label} ablegen
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map(item => renderItem(item))}
        </div>

        {items.length === 0 && (
          <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
            <Sparkles className="w-6 h-6 text-gray-600" />
            Gerade gibt es hier nichts im Angebot.
          </div>
        )}
      </section>

      <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
        <Crown className="w-3 h-3" /> Belohnungs-Artikel (Turniersieg, Clip des Monats/Jahres, Veteran, Spende) und die Community-Job-Titel sind nicht käuflich — du schaltest sie frei.
      </p>
    </div>
  );
}
