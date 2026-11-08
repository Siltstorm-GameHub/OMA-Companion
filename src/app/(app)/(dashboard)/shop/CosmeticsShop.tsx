"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CoinIcon from "@/components/CoinIcon";
import RankRing from "@/components/RankRing";
import { Tabs } from "@/components/admin/Tabs";
import { Check, Crown, Lock, ShoppingBag, Sparkles, Undo2 } from "@/components/icons";
import { CosmeticName, CosmeticTitle } from "@/components/cosmetics/CosmeticName";
import { setCachedLook } from "@/components/cosmetics/useUserLook";
import {
  CATEGORY_META, CATEGORY_ORDER, COSMETICS, RARITY_META, getCosmetic, getCosmeticOf, resolveLook,
  type Cosmetic, type CosmeticCategory, type UserLook,
} from "@/lib/cosmetics/catalog";
import type { ShopState } from "@/lib/cosmetics/service";

const fmt = (n: number) => n.toLocaleString("de-DE");

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
function ItemPreview({ item, image, name }: { item: Cosmetic; image: string | null; name: string }) {
  switch (item.category) {
    case "frame":
      return <PreviewAvatar look={{ frame: item.id }} image={image} name={name} size={56} />;
    case "aura":
      return <PreviewAvatar look={{ aura: item.id }} image={image} name={name} size={48} />;
    case "background":
      return (
        <div className="w-full h-14 rounded-xl border border-white/10 relative overflow-hidden bg-white/[0.02]">
          <div className="absolute inset-0" style={{ background: item.css }} />
        </div>
      );
    case "title":
      return (
        <div className="h-14 flex items-center justify-center px-2 text-center">
          <CosmeticTitle title={item.id} className="text-[11px]" />
        </div>
      );
    case "nameColor":
      return (
        <div className="h-14 flex items-center justify-center px-2">
          <CosmeticName nameColor={item.id} className="text-lg font-black truncate max-w-full">{name}</CosmeticName>
        </div>
      );
  }
}

type Busy = { id: string; action: "buy" | "equip" } | null;

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
  const [confirmBuy, setConfirmBuy] = useState<string | null>(null);
  const [busy, setBusy] = useState<Busy>(null);

  const owned = useMemo(() => new Set(state.owned), [state.owned]);
  const priceOf = useMemo(() => new Map(state.items.map(i => [i.id, i])), [state.items]);

  // Vorschau = aktuelles Aussehen, in der gewählten Kategorie ggf. durch den angeklickten Artikel ersetzt
  const previewLook: UserLook = useMemo(() => {
    const base = resolveLook(state.equipped, state.reputationPeakLevel);
    const p = getCosmetic(preview);
    return p ? { ...base, [p.category]: p.id } : base;
  }, [state.equipped, state.reputationPeakLevel, preview]);
  const bg = getCosmeticOf(previewLook.background, "background");

  const items = COSMETICS.filter(c => c.category === category).filter(c => {
    // Nicht angebotene Artikel nur zeigen, wenn man sie besitzt; Freischalt-Titel immer (als Ziel)
    const p = priceOf.get(c.id);
    return owned.has(c.id) || c.defaultPrice === null || p?.enabled;
  });
  const equippedId = resolveLook(state.equipped, state.reputationPeakLevel)[category] ?? null;

  function applyEquipped(equipped: ShopState["equipped"]) {
    setState(s => ({ ...s, equipped, look: resolveLook(equipped, s.reputationPeakLevel) }));
    setCachedLook(userId, resolveLook(equipped, state.reputationPeakLevel));
  }

  async function equip(cat: CosmeticCategory, itemId: string | null) {
    setBusy({ id: itemId ?? `none:${cat}`, action: "equip" });
    try {
      const res = await fetch("/api/cosmetics/equip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: cat, itemId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Ausrüsten fehlgeschlagen"); return; }
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
    setBusy({ id: item.id, action: "buy" });
    try {
      const res = await fetch("/api/cosmetics/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }
      setState(s => ({ ...s, balance: data.balance, owned: [...s.owned, item.id] }));
      setConfirmBuy(null);
      toast.success(`${item.name} gekauft!`);
      setBusy(null);
      await equip(item.category, item.id); // direkt anlegen — dafür kauft man es ja
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
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
            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1">{preview ? "Vorschau" : "So sehen dich andere"}</p>
            <CosmeticName nameColor={previewLook.nameColor} as="p" className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {displayName}
            </CosmeticName>
            <CosmeticTitle title={previewLook.title} className="mt-1" />
            {preview && (
              <button onClick={() => setPreview(null)} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                <Undo2 className="w-3 h-3" /> Vorschau zurücksetzen
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Kategorien */}
      <div>
        <Tabs
          active={category}
          onChange={k => { setCategory(k as CosmeticCategory); setConfirmBuy(null); }}
          className="overflow-x-auto scrollbar-none whitespace-nowrap"
          tabs={CATEGORY_ORDER.map(c => ({ key: c, label: CATEGORY_META[c].plural }))}
        />
        <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
          <p className="text-xs text-gray-500">{CATEGORY_META[category].hint}</p>
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

      {/* Artikel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map(item => {
          const isOwned = owned.has(item.id);
          const isEquipped = equippedId === item.id;
          const price = priceOf.get(item.id)?.price ?? null;
          const isUnlockItem = item.defaultPrice === null;
          const rarity = RARITY_META[item.rarity];
          const affordable = price !== null && state.balance >= price;
          const isPreviewed = preview === item.id;
          const isBusy = busy?.id === item.id;

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => setPreview(isPreviewed ? null : item.id)}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setPreview(isPreviewed ? null : item.id); } }}
              className={`glass relative rounded-2xl p-3 flex flex-col gap-2 cursor-pointer transition-all border ${
                isEquipped ? "border-teal-500/50" : isPreviewed ? "border-white/25" : "border-transparent hover:border-white/10"
              }`}
              style={{ boxShadow: isPreviewed ? `0 0 18px ${rarity.color}22` : undefined }}
            >
              <div className="absolute top-0 inset-x-3 h-px pointer-events-none" style={{ background: `linear-gradient(90deg, transparent, ${rarity.color}80, transparent)` }} />
              <div className="flex items-center justify-center min-h-[72px]">
                <ItemPreview item={item} image={image} name={displayName} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: rarity.color }}>
                  {rarity.label}{isUnlockItem && " · Community-Jobs"}
                </p>
                {isUnlockItem && item.description && !isOwned && (
                  <p className="text-[10px] text-gray-500 mt-1 leading-snug">{item.description}</p>
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
                    <Lock className="w-3 h-3" /> Nicht käuflich
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
                    onClick={() => { setConfirmBuy(item.id); setPreview(item.id); }}
                    disabled={!affordable || !!busy}
                    title={affordable ? undefined : "Nicht genug Münzen"}
                    className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      affordable ? "text-amber-200 bg-amber-500/15 hover:bg-amber-500/25" : "text-gray-500 bg-white/[0.03] cursor-not-allowed"
                    }`}
                  >
                    <CoinIcon size={13} /> {price !== null ? fmt(price) : "–"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {items.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500 flex flex-col items-center gap-2">
          <Sparkles className="w-6 h-6 text-gray-600" />
          Gerade gibt es hier nichts im Angebot.
        </div>
      )}

      <p className="text-[11px] text-gray-600 flex items-center gap-1.5">
        <Crown className="w-3 h-3" /> Die Community-Job-Titel (Silber, Gold, Platin) schaltest du über die Community-Jobs frei — sie sind nicht käuflich.
      </p>
    </div>
  );
}
