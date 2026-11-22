"use client";
import { useMemo, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CoinIcon from "@/components/CoinIcon";
import Shortfall from "@/components/shop/Shortfall";
import { Tabs } from "@/components/admin/Tabs";
import { Check, ChevronRight, Clock, Crown, Lock, Sparkles, Undo2 } from "@/components/icons";
import { CosmeticName, CosmeticTitle } from "@/components/cosmetics/CosmeticName";
import LookPreview, { PreviewAvatar, lookOfSet } from "@/components/cosmetics/LookPreview";
import { setCachedLook } from "@/components/cosmetics/useUserLook";
import {
  CATEGORY_META, CATEGORY_ORDER, COSMETICS, COSMETIC_SETS, RARITY_META, SEASONS, getCosmetic,
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

/** Kleine Vorschau eines Artikels in seiner Karte. */
function ItemPreview({ item, image, name }: { item: Cosmetic; image: string | null; name: string }) {
  switch (item.category) {
    case "frame":
      return <PreviewAvatar look={{ frame: item.id }} image={image} name={name} size={68} />;
    case "aura":
      return <PreviewAvatar look={{ aura: item.id }} image={image} name={name} size={60} />;
    case "background":
      return (
        <div className="w-full h-20 rounded-control border border-line relative overflow-hidden bg-surface-2">
          <div className="absolute inset-0" style={{ background: item.css }} />
        </div>
      );
    case "title":
      return <div className="h-20 flex items-center justify-center px-1 text-center"><CosmeticTitle title={item.id} className="text-sm" /></div>;
    case "nameColor":
      return (
        <div className="h-20 flex items-center justify-center px-2 max-w-full">
          <CosmeticName nameColor={item.id} className="text-lg font-extrabold truncate max-w-full">{name}</CosmeticName>
        </div>
      );
  }
}

function TagBadge({ a, item }: { a: ItemAvailability; item: Cosmetic }) {
  const base = "absolute top-2.5 right-2.5 z-10 text-xs font-extrabold px-2 py-0.5 rounded-full";
  if (a.tag === "offer" && a.discountPct) return <span className={`${base} bg-rose-500 text-white`}>−{a.discountPct} %</span>;
  if (a.tag === "exclusive") return <span className={`${base} bg-fuchsia-500/90 text-white`}>Exklusiv</span>;
  if (a.tag === "season" && item.season) return <span className={`${base} bg-orange-500/90 text-white`}>{SEASONS[item.season].emoji}</span>;
  return null;
}

/** Abschnittskopf mit optionaler Info rechts. */
function SectionHead({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
      <h2 className="text-base font-extrabold text-fg flex items-center gap-2">{icon} {title}</h2>
      {right}
    </div>
  );
}

const GRID = "grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3";

type MainTab = "highlights" | "sets" | "all" | "owned";

export default function CosmeticsShop({ userId, displayName, image, initial }: {
  userId: string;
  displayName: string;
  image: string | null;
  initial: ShopState;
}) {
  const router = useRouter();
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<MainTab>("highlights");
  const [category, setCategory] = useState<CosmeticCategory>("frame");
  const [preview, setPreview] = useState<string | null>(null);
  const [previewSet, setPreviewSet] = useState<string | null>(null);
  const [confirmBuy, setConfirmBuy] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const owned = useMemo(() => new Set(state.owned), [state.owned]);
  const avail = useMemo(() => new Map(state.items.map(i => [i.id, i])), [state.items]);
  const sortByPrice = useMemo(() => byPrice(avail), [avail]);
  const currentLook = useMemo(() => resolveLook(state.equipped, state.reputationPeakLevel), [state.equipped, state.reputationPeakLevel]);

  // Vorschau = aktuelles Aussehen, ersetzt durch das angeklickte Set bzw. den angeklickten Artikel
  const previewLook: UserLook = useMemo(() => {
    const set = COSMETIC_SETS.find(s => s.id === previewSet);
    const look: UserLook = { ...currentLook, ...(set ? lookOfSet(set) : {}) };
    const p = getCosmetic(preview);
    if (p) look[p.category] = p.id;
    return look;
  }, [currentLook, preview, previewSet]);

  const visible = (c: Cosmetic) => owned.has(c.id) || !!avail.get(c.id)?.visible;
  const offers = COSMETICS.filter(c => { const a = avail.get(c.id); return (a?.tag === "offer" || a?.tag === "exclusive") && a.buyable; }).sort(sortByPrice);
  const seasonItems = COSMETICS.filter(c => { const a = avail.get(c.id); return a?.tag === "season" && a.buyable; }).sort(sortByPrice);
  const activeSeasons = [...new Set(seasonItems.map(c => c.season!))] as SeasonKey[];
  const seasonUntil = seasonItems.map(c => avail.get(c.id)?.until).filter(Boolean).sort()[0];
  const sets = state.sets
    .filter(s => s.enabled && (s.buyable || s.missing.length === 0))
    .sort((a, b) => Number(a.missing.length === 0) - Number(b.missing.length === 0) || a.price - b.price);
  const categoryItems = COSMETICS.filter(c => c.category === category && visible(c)).sort(sortByPrice);
  const ownedItems = COSMETICS.filter(c => owned.has(c.id));
  const hasPreview = !!(preview || previewSet);

  // ── Aktionen ────────────────────────────────────────────────────────────
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
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function equip(cat: CosmeticCategory, itemId: string | null) {
    setBusy(itemId ?? `none:${cat}`);
    try {
      const { ok, data } = await post("/api/cosmetics/equip", { category: cat, itemId });
      if (!ok) { toast.error(data.error ?? "Ausrüsten fehlgeschlagen"); return; }
      applyEquipped(data.equipped);
      setPreview(null);
      toast.success(itemId ? `${getCosmetic(itemId)?.name} angelegt` : `${CATEGORY_META[cat].label} abgelegt`);
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setBusy(null);
    }
  }

  async function buy(item: Cosmetic) {
    setBusy(item.id);
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
    setBusy(setId);
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

  function showItem(id: string) {
    setPreviewSet(null);
    setPreview(p => (p === id ? null : id));
  }

  function showSet(id: string) {
    setPreview(null);
    setPreviewSet(p => (p === id ? null : id));
  }

  // ── Artikel-Karte ───────────────────────────────────────────────────────
  // Bewusst als Render-Funktion statt eigener Komponente: greift auf den Shop-State zu, ohne bei jedem Render neu gemountet zu werden
  function renderItem(item: Cosmetic) {
    const a = avail.get(item.id) ?? { id: item.id, basePrice: null, price: null, buyable: false, visible: false };
    const isOwned = owned.has(item.id);
    const isEquipped = currentLook[item.category] === item.id;
    const isUnlockItem = item.defaultPrice === null;
    const rarity = RARITY_META[item.rarity];
    const affordable = a.price !== null && state.balance >= a.price;
    const isPreviewed = preview === item.id;
    const isBusy = busy === item.id;
    const requirement = unlockRequirement(item);

    let action: ReactNode;
    if (isEquipped) {
      action = <span className="flex min-h-10 items-center justify-center gap-1 text-sm font-semibold text-primary-fg"><Check className="w-4 h-4" /> Angelegt</span>;
    } else if (isOwned) {
      action = (
        <button onClick={() => equip(item.category, item.id)} disabled={!!busy}
          className="w-full min-h-10 rounded-control text-sm font-bold text-primary-ink bg-primary hover:bg-primary-hover transition-colors disabled:opacity-50">
          {isBusy ? "…" : "Anlegen"}
        </button>
      );
    } else if (isUnlockItem) {
      action = <span className="flex min-h-10 items-center justify-center gap-1 text-sm text-subtle"><Lock className="w-3.5 h-3.5" /> {unlockLabel(item)}</span>;
    } else if (!a.buyable) {
      action = <span className="flex min-h-10 items-center justify-center text-sm text-subtle">Nicht im Angebot</span>;
    } else if (confirmBuy === item.id) {
      action = (
        <div className="flex gap-1.5">
          <button onClick={() => buy(item)} disabled={!!busy}
            className="flex-1 min-h-10 rounded-control text-sm font-bold text-canvas bg-coin hover:bg-amber-300 transition-colors disabled:opacity-50">
            {isBusy ? "…" : "Kaufen!"}
          </button>
          <button onClick={() => setConfirmBuy(null)} disabled={!!busy} aria-label="Abbrechen"
            className="min-h-10 px-3 rounded-control text-muted bg-surface-2 hover:bg-surface-3 transition-colors">✕</button>
        </div>
      );
    } else if (!affordable && a.price !== null) {
      action = <Shortfall price={a.price} balance={state.balance} basePrice={a.discountPct ? a.basePrice : null} />;
    } else {
      action = (
        <button
          onClick={() => { setConfirmBuy(item.id); setPreviewSet(null); setPreview(item.id); }}
          disabled={!!busy}
          className="w-full flex min-h-10 items-center justify-center gap-1.5 rounded-control text-sm font-bold transition-colors text-coin bg-coin-soft border border-coin/25 hover:bg-coin/20"
        >
          <CoinIcon size={13} /> {fmt(a.price ?? 0)}
          {a.discountPct && a.basePrice !== null && <span className="text-xs line-through opacity-60">{fmt(a.basePrice)}</span>}
        </button>
      );
    }

    return (
      <div
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => showItem(item.id)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showItem(item.id); } }}
        className={`relative rounded-card bg-surface p-3 flex flex-col gap-2.5 cursor-pointer transition-colors border ${
          isEquipped ? "border-primary/60" : isPreviewed ? "border-fg/40" : "border-line hover:border-line-strong"
        }`}
        title={isUnlockItem && !isOwned && requirement ? requirement : undefined}
      >
        <div className="absolute top-0 inset-x-6 h-0.5 rounded-b-full pointer-events-none" style={{ background: rarity.color }} />
        {!isOwned && <TagBadge a={a} item={item} />}
        <div className="flex items-center justify-center min-h-[6.5rem] rounded-control bg-surface-2">
          <ItemPreview item={item} image={image} name={displayName} />
        </div>
        <div className="min-w-0 px-0.5">
          <p className="text-sm font-bold text-fg truncate leading-tight">{item.name}</p>
          <p className="text-xs font-medium" style={{ color: rarity.color }}>{rarity.label}</p>
        </div>
        <div className="mt-auto" onClick={e => e.stopPropagation()}>{action}</div>
      </div>
    );
  }

  // ── Set-Karte mit Vorschau ──────────────────────────────────────────────
  function renderSet(s: ShopState["sets"][number]) {
    const set = COSMETIC_SETS.find(x => x.id === s.id)!;
    const complete = s.missing.length === 0;
    const affordable = state.balance >= s.price;
    const isPreviewed = previewSet === s.id;
    const confirmKey = `set:${s.id}`;
    return (
      <div key={s.id}
        role="button" tabIndex={0}
        onClick={() => showSet(s.id)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showSet(s.id); } }}
        className={`glass rounded-2xl p-3 flex flex-col gap-3 cursor-pointer border transition-all ${isPreviewed ? "border-white/30" : "border-transparent hover:border-line-strong"}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">{set.name}</p>
            <p className="text-xs text-gray-500">{set.description}</p>
          </div>
          {!complete && s.discountPct > 0 && <span className="shrink-0 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-amber-500 text-black">−{s.discountPct} %</span>}
        </div>

        <LookPreview look={lookOfSet(set)} image={image} name={displayName} size={40} />

        <div className="flex flex-wrap gap-1">
          {set.items.map(id => {
            const c = getCosmetic(id);
            if (!c) return null;
            const have = owned.has(id);
            return (
              <span key={id} className={`text-xs px-1.5 py-0.5 rounded-full border ${have ? "border-teal-500/40 text-teal-300 bg-teal-500/10" : "border-line-strong text-gray-400"}`}>
                {have && "✓ "}{c.name}
              </span>
            );
          })}
        </div>

        <div className="mt-auto text-xs" onClick={e => e.stopPropagation()}>
          {complete ? (
            <span className="flex items-center justify-center gap-1 py-1.5 text-teal-300"><Check className="w-3.5 h-3.5" /> Komplett</span>
          ) : confirmBuy === confirmKey ? (
            <div className="flex gap-1.5">
              <button onClick={() => buySet(s.id)} disabled={!!busy}
                className="flex-1 min-h-10 rounded-control text-sm font-bold text-canvas bg-coin hover:bg-amber-300 transition-colors disabled:opacity-50">
                {busy === s.id ? "…" : `${s.missing.length} Artikel kaufen!`}
              </button>
              <button onClick={() => setConfirmBuy(null)} disabled={!!busy} aria-label="Abbrechen"
                className="min-h-10 px-3 rounded-control text-muted bg-surface-2 hover:bg-surface-3 transition-colors">✕</button>
            </div>
          ) : !affordable ? (
            <Shortfall price={s.price} balance={state.balance} basePrice={s.price < s.fullPrice ? s.fullPrice : null} />
          ) : (
            <button
              onClick={() => { setConfirmBuy(confirmKey); setPreview(null); setPreviewSet(s.id); }}
              disabled={!!busy}
              className="w-full flex min-h-10 items-center justify-center gap-1.5 rounded-control text-sm font-bold transition-colors text-coin bg-coin-soft border border-coin/25 hover:bg-coin/20"
            >
              <CoinIcon size={13} /> {fmt(s.price)}
              {s.price < s.fullPrice && <span className="text-xs line-through opacity-60">{fmt(s.fullPrice)}</span>}
              {s.missing.length < set.items.length && <span className="text-xs opacity-70">· {s.missing.length} fehlen</span>}
            </button>
          )}
        </div>
      </div>
    );
  }

  const highlightCount = offers.length + seasonItems.length;
  const tabs: { key: MainTab; label: string }[] = [
    { key: "highlights", label: highlightCount ? `Highlights (${highlightCount})` : "Highlights" },
    { key: "sets", label: `Sets (${sets.length})` },
    { key: "all", label: "Alle Artikel" },
    { key: "owned", label: `Sammlung (${ownedItems.length})` },
  ];

  return (
    <div className="space-y-5">
      {/* Kopf */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <PageHeader title="Shop" description="Rahmen, Auren, Hintergründe, Titel und Namensfarben" />
        <Link href="/points" title="Woher kommen Münzen?"
          className="group glass rounded-card px-4 py-2 flex items-center gap-2 hover:bg-line transition-colors">
          <CoinIcon size={18} />
          <span className="text-lg font-black text-amber-300 tabular-nums">{fmt(state.balance)}</span>
          <span className="flex items-center gap-0.5 border-l border-line-strong pl-2 text-xs font-semibold text-amber-200/80 group-hover:text-amber-200">
            Münzen verdienen <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[17rem_1fr] gap-5 items-start">
        {/* ── Vorschau (Desktop: bleibt beim Scrollen stehen) ── */}
        <aside className="lg:sticky lg:top-[5.5rem] space-y-3">
          <div className={`relative rounded-2xl border transition-colors ${hasPreview ? "border-amber-400/40" : "border-line-strong"}`}>
            <LookPreview look={previewLook} image={image} name={displayName} size={72} className="!rounded-2xl !border-0 min-h-[7rem]" />
            <span className={`absolute top-2 right-2 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${hasPreview ? "bg-amber-400 text-black" : "bg-line text-gray-300"}`}>
              {hasPreview ? "Vorschau" : "Aktuell"}
            </span>
          </div>
          {hasPreview ? (
            <button onClick={() => { setPreview(null); setPreviewSet(null); }}
              className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-white py-1.5 rounded-lg bg-line transition-colors">
              <Undo2 className="w-3 h-3" /> Vorschau zurücksetzen
            </button>
          ) : (
            <p className="text-xs text-gray-600 text-center">Tippe auf einen Artikel oder ein Set für die Vorschau.</p>
          )}

          {/* Aktuell angelegt — schnell ablegen */}
          <div className="glass rounded-2xl divide-y divide-line hidden lg:block">
            {CATEGORY_ORDER.map(cat => {
              const item = getCosmetic(currentLook[cat]);
              return (
                <div key={cat} className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs text-gray-500">{CATEGORY_META[cat].label}</p>
                    <p className={`text-xs truncate ${item ? "text-white" : "text-gray-600"}`}>{item?.name ?? "—"}</p>
                  </div>
                  {item && (
                    <button onClick={() => equip(cat, null)} disabled={!!busy}
                      className="text-xs text-gray-500 hover:text-white transition-colors disabled:opacity-50">
                      ablegen
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* ── Inhalt ── */}
        <div className="min-w-0 space-y-4">
          <Tabs
            active={tab}
            onChange={k => { setTab(k as MainTab); setConfirmBuy(null); }}
            className="overflow-x-auto scrollbar-none whitespace-nowrap"
            tabs={tabs}
          />

          {tab === "highlights" && (
            <div className="space-y-6">
              {offers.length > 0 && (
                <section>
                  <SectionHead
                    icon={<Sparkles className="w-3.5 h-3.5 text-rose-400" />}
                    title="Angebote der Woche"
                    right={state.weekEndsAt && (
                      <span className="text-xs text-gray-500 flex items-center gap-1" suppressHydrationWarning>
                        <Clock className="w-3 h-3" /> neu am Montag · {timeLeft(state.weekEndsAt)}
                      </span>
                    )}
                  />
                  <div className={GRID}>{offers.map(renderItem)}</div>
                </section>
              )}

              {seasonItems.length > 0 && (
                <section className="rounded-2xl p-3 border border-orange-500/20 bg-gradient-to-br from-orange-500/[0.06] to-transparent">
                  <SectionHead
                    icon={<span>{activeSeasons.map(s => SEASONS[s].emoji).join(" ")}</span>}
                    title={`Saison: ${activeSeasons.map(s => SEASONS[s].name).join(" & ")}`}
                    right={(
                      <span className="text-xs text-orange-300/80 flex items-center gap-1" suppressHydrationWarning>
                        <Clock className="w-3 h-3" /> {timeLeft(seasonUntil)}
                      </span>
                    )}
                  />
                  <div className={GRID}>{seasonItems.map(renderItem)}</div>
                </section>
              )}

              {highlightCount === 0 && (
                <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500">Gerade gibt es keine Angebote — schau am Montag wieder vorbei.</div>
              )}

              {sets.length > 0 && (
                <button onClick={() => setTab("sets")}
                  className="w-full glass rounded-2xl px-4 py-3 flex items-center justify-between text-sm text-gray-300 hover:text-white hover:bg-line transition-colors">
                  <span>🎁 {sets.length} Sets — zusammen günstiger</span>
                  <span className="text-xs text-amber-300">Ansehen →</span>
                </button>
              )}
            </div>
          )}

          {tab === "sets" && (
            sets.length > 0
              ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{sets.map(renderSet)}</div>
              : <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500">Gerade sind keine Sets im Angebot.</div>
          )}

          {tab === "all" && (
            <div className="space-y-3">
              <div className="flex gap-1 flex-wrap">
                {CATEGORY_ORDER.map(c => (
                  <button key={c} onClick={() => { setCategory(c); setConfirmBuy(null); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      c === category ? "bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25" : "text-gray-500 hover:text-gray-300 hover:bg-line"
                    }`}>
                    {CATEGORY_META[c].plural}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">{CATEGORY_META[category].hint} Günstigste zuerst.</p>
              {categoryItems.length > 0
                ? <div className={GRID}>{categoryItems.map(renderItem)}</div>
                : <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500">Gerade gibt es hier nichts im Angebot.</div>}
            </div>
          )}

          {tab === "owned" && (
            ownedItems.length > 0 ? (
              <div className="space-y-5">
                {CATEGORY_ORDER.map(cat => {
                  const list = ownedItems.filter(c => c.category === cat).sort((a, b) => a.name.localeCompare(b.name, "de"));
                  if (list.length === 0) return null;
                  return (
                    <section key={cat}>
                      <SectionHead icon={null} title={`${CATEGORY_META[cat].plural} (${list.length})`} />
                      <div className={GRID}>{list.map(renderItem)}</div>
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="glass rounded-2xl p-8 text-center text-sm text-gray-500">Du besitzt noch keine Artikel — stöbere in den Highlights.</div>
            )
          )}

          <p className="text-xs text-gray-600 flex items-start gap-1.5 pt-2">
            <Crown className="w-3 h-3 mt-0.5 shrink-0" />
            Belohnungs-Artikel (Turniersieg, Clip des Monats/Jahres, Veteran, Spende) und die Community-Job-Titel sind nicht käuflich —
            du findest sie unter „Alle Artikel“ und schaltest sie frei.
          </p>
        </div>
      </div>
    </div>
  );
}
