"use client";

// ============================================
// OMA Gems — „Mein Held“: Editor für die eigene Community-Karte
// ============================================
// Live-Vorschau oben, darunter je Slot die Auswahl. Formen (Grundfigur, Gesicht, Frisur, Ausrüstung,
// Pose) zeigen eine kleine Vorschau des eigenen Helden mit genau diesem Teil, Farben ein Farbfeld.
// Gesperrte Teile lassen sich anprobieren und zeigen, wie man sie bekommt (cosmetics.ts). Fehlen nur
// kaufbare Teile, wird „Kaufen & speichern“ angeboten; erspielbare Teile (Rang, Wächter, Saison) muss
// man erst erreichen. Kauf und Speichern prüft der Server.

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check, Dices, Lock, RotateCcw } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import CoinIcon from "@/components/CoinIcon";
import HeroFigure from "./HeroFigure";
import HeroBackdrop from "./HeroBackdrop";
import ErrorNotice from "./ErrorNotice";
import { getClassConfig } from "./BattleCardView";
import {
  HERO_ACCESSORIES,
  HERO_BACKDROPS,
  HERO_BASES,
  HERO_EMBLEMS,
  HERO_FACES,
  HERO_HAIR_COLORS,
  HERO_HAIRS,
  HERO_HEADGEAR,
  HERO_POSES,
  HERO_SCHEMES,
  HERO_SKINS,
  type HeroClass,
  type HeroLook,
} from "@/lib/gems/hero/look";
import {
  coinPrice,
  cosmeticLabel,
  isAvailable,
  unavailableParts,
  unlockFor,
  unlockLabel,
  type CosmeticSlot,
} from "@/lib/gems/hero/cosmetics";

type ShapeSlot = "base" | "face" | "hair" | "emblem" | "headgear" | "accessory" | "pose" | "backdrop";

interface ShapeSection {
  slot: ShapeSlot;
  title: string;
  options: { id: string; label: string }[];
}

export default function HeroEditor({
  name,
  heroClass,
  initialLook,
  owned,
  coins: initialCoins,
}: {
  name: string;
  heroClass: HeroClass;
  initialLook: HeroLook;
  /** Freigeschaltete Kosmetik-Teile ("scheme:gold" …): gekauft oder erspielt. */
  owned: string[];
  /** Münz-Guthaben zum Kaufen. */
  coins: number;
}) {
  const router = useRouter();
  const [look, setLook] = useState<HeroLook>(initialLook);
  const [saved, setSaved] = useState<HeroLook>(initialLook);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ownedList, setOwnedList] = useState<string[]>(owned);
  const [coins, setCoins] = useState(initialCoins);
  const [confirmBuy, setConfirmBuy] = useState(false);
  const ownedSet = useMemo(() => new Set(ownedList), [ownedList]);
  // Was am angezogenen Look noch fehlt: kaufbar (Münzen) oder nur erspielbar (Rang, Wächter, Saison).
  const missing = unavailableParts(look, heroClass, ownedSet).filter((id) => !id.startsWith("base:"));
  const toBuy = missing.filter((id) => coinPrice(id) !== null);
  const notBuyable = missing.filter((id) => coinPrice(id) === null);
  const buyTotal = toBuy.reduce((sum, id) => sum + (coinPrice(id) ?? 0), 0);
  const partLabel = (itemId: string) => {
    const [slot, id] = itemId.split(":");
    return cosmeticLabel(slot as CosmeticSlot, id);
  };
  const changed = JSON.stringify(look) !== JSON.stringify(saved);
  const classColor = getClassConfig(heroClass).color;

  const available = (slot: string, id: string) =>
    slot === "scheme" || slot === "emblem" || slot === "headgear" || slot === "accessory" || slot === "pose" || slot === "backdrop"
      ? isAvailable(slot as CosmeticSlot, id, heroClass, ownedSet)
      : true;
  const lockText = (slot: string, id: string) => unlockLabel(unlockFor(slot as CosmeticSlot, id, heroClass));
  const set = (patch: Partial<HeroLook>) => {
    setLook((cur) => ({ ...cur, ...patch }));
    setNotice(null);
  };

  const shapeSections: ShapeSection[] = [
    { slot: "base", title: "Grundfigur", options: HERO_BASES.filter((b) => b.cls === heroClass) },
    { slot: "face", title: "Gesicht", options: HERO_FACES },
    { slot: "hair", title: "Frisur", options: HERO_HAIRS },
    { slot: "headgear", title: "Kopfbedeckung", options: HERO_HEADGEAR },
    { slot: "accessory", title: "Accessoire", options: HERO_ACCESSORIES },
    { slot: "emblem", title: "Emblem", options: HERO_EMBLEMS },
    { slot: "pose", title: "Pose", options: HERO_POSES },
    { slot: "backdrop", title: "Kartenhintergrund", options: HERO_BACKDROPS },
  ];

  function randomize() {
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
    const pickAvailable = (slot: CosmeticSlot, items: { id: string }[]) => pick(items.filter((o) => available(slot, o.id))).id;
    set({
      base: pick(HERO_BASES.filter((b) => b.cls === heroClass)).id,
      face: pick(HERO_FACES).id,
      skin: Math.floor(Math.random() * HERO_SKINS.length),
      hair: pick(HERO_HAIRS).id,
      hairColor: Math.floor(Math.random() * HERO_HAIR_COLORS.length),
      scheme: pickAvailable("scheme", HERO_SCHEMES),
      emblem: pickAvailable("emblem", HERO_EMBLEMS),
      headgear: pickAvailable("headgear", HERO_HEADGEAR),
      accessory: pickAvailable("accessory", HERO_ACCESSORIES),
      pose: pickAvailable("pose", HERO_POSES),
      backdrop: pickAvailable("backdrop", HERO_BACKDROPS),
    });
  }

  async function buyAndSave() {
    setConfirmBuy(false);
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/gems/cosmetics/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds: toBuy }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Kauf fehlgeschlagen.");
      setOwnedList((cur) => [...cur, ...toBuy]);
      setCoins(data.points);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
      setSaving(false);
      return;
    }
    await save();
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/gems/hero-look", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ look }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Speichern fehlgeschlagen.");
      setSaved(data.look);
      setLook(data.look);
      setNotice("Gespeichert — so sehen alle deinen Helden.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unbekannter Fehler.");
    } finally {
      setSaving(false);
    }
  }

  const optionButton = (selected: boolean, enabled: boolean) =>
    `relative flex flex-col items-center gap-1 rounded-xl p-1.5 text-[11px] font-semibold transition-colors min-h-[44px] ${
      selected
        ? enabled
          ? "bg-teal-500/15 ring-2 ring-teal-400 text-white"
          : "bg-amber-500/10 ring-2 ring-amber-400 text-white"
        : enabled
          ? "glass hover:bg-white/[0.06] text-gray-300"
          : "glass hover:bg-white/[0.06] text-gray-500"
    }`;

  const swatchRow = (
    title: string,
    items: { key: string | number; color: string; label: string; selected: boolean; enabled: boolean; lock?: string; onPick: () => void }[]
  ) => (
    <section className="space-y-2">
      <h2 className="font-display text-sm font-bold text-white">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={it.onPick}
            title={it.enabled ? it.label : `${it.label} — ${it.lock}`}
            aria-label={it.enabled ? it.label : `${it.label}, gesperrt: ${it.lock} (anprobieren)`}
            aria-pressed={it.selected}
            className={`relative w-11 h-11 rounded-full border-[3px] transition-transform ${
              it.selected ? "border-white scale-110" : "border-[#1b1326]"
            } ${it.enabled ? "hover:scale-105" : "opacity-60 hover:opacity-90"}`}
            style={{ background: it.color }}
          >
            {!it.enabled && <Lock className="w-3.5 h-3.5 absolute inset-0 m-auto text-white" />}
            {it.selected && <Check className="w-3.5 h-3.5 absolute -bottom-1 -right-1 bg-white text-black rounded-full p-0.5" />}
          </button>
        ))}
      </div>
    </section>
  );

  return (
    // Handy: Flex-Spalte statt Grid — im Grid bliebe die mitlaufende Vorschau in ihrer Zelle gefangen.
    <div className="flex flex-col md:grid md:grid-cols-[300px_minmax(0,1fr)] gap-6 md:items-start">
      {/* Handy: kompakte Vorschau läuft beim Scrollen oben mit, damit man jede Auswahl sofort sieht. */}
      <div className="sticky top-20 md:top-24 z-10 space-y-3 -mx-3 px-3 py-2 md:m-0 md:p-0 bg-[#0d0d0f]/95 md:bg-transparent backdrop-blur md:backdrop-blur-none">
        <div
          className="rounded-2xl overflow-hidden flex flex-row md:flex-col items-center md:items-stretch"
          style={{ border: `2px solid ${classColor}`, background: `linear-gradient(165deg, ${classColor}44 0%, #101016 72%)` }}
        >
          <div className="relative w-28 h-32 md:w-auto md:h-72 shrink-0 overflow-hidden">
            <HeroBackdrop id={look.backdrop} />
            <div className="absolute inset-0 px-2 pt-2 md:px-6 md:pt-4">
              <HeroFigure look={look} title={name} idle className="w-full h-full" />
            </div>
          </div>
          <div className="px-3 py-2 md:px-4 md:pb-4 md:pt-1 min-w-0">
            <p className="font-display text-lg md:text-xl font-bold text-white truncate">{name}</p>
            <p className="text-xs text-gray-400">Deine Community-Karte · {getClassConfig(heroClass).label}</p>
          </div>
        </div>
        {error && <ErrorNotice message={error} />}
        {notice && <p className="text-xs text-teal-300">{notice}</p>}
        {notBuyable.length > 0 && (
          <p className="text-xs text-amber-300">
            Nur anprobiert: {notBuyable.map((id) => `${partLabel(id)} (${lockText(id.split(":")[0], id.split(":")[1])})`).join(", ")}.
          </p>
        )}
        {toBuy.length > 0 && notBuyable.length === 0 && coins < buyTotal && (
          <p className="text-xs text-amber-300">Dafür fehlen dir {buyTotal - coins} Münzen.</p>
        )}
        <p className="flex items-center gap-1 text-[11px] text-gray-500">
          <CoinIcon size={11} /> {coins} Münzen
        </p>
        <div className="flex gap-2">
          {toBuy.length > 0 && notBuyable.length === 0 ? (
            <Button
              onClick={() => setConfirmBuy(true)}
              disabled={coins < buyTotal}
              loading={saving}
              icon={<CoinIcon size={14} />}
              className="flex-1"
            >
              Kaufen & speichern · {buyTotal}
            </Button>
          ) : (
            <Button onClick={save} disabled={!changed || missing.length > 0} loading={saving} className="flex-1">
              Speichern
            </Button>
          )}
          <Button variant="ghost" onClick={randomize} icon={<Dices className="w-4 h-4" />} aria-label="Zufällig">
            Zufall
          </Button>
          <Button variant="ghost" onClick={() => set(saved)} disabled={!changed} icon={<RotateCcw className="w-4 h-4" />} aria-label="Zurücksetzen">
            Zurück
          </Button>
        </div>
        <p className="hidden md:block text-[11px] text-gray-500">
          Gesperrte Teile kannst du anprobieren. Du bekommst sie über Münzen, Karten-Ränge, Wächter und die Aufstiegs-Saison.
          Kosmetik verändert keine Kampfwerte.
        </p>
      </div>

      <Modal open={confirmBuy} onClose={() => setConfirmBuy(false)} title="Kosmetik kaufen?" size="sm">
        <div className="space-y-4">
          <ul className="space-y-1.5 text-sm">
            {toBuy.map((id) => (
              <li key={id} className="flex items-center justify-between gap-3">
                <span className="text-gray-200">{partLabel(id)}</span>
                <span className="flex items-center gap-1 text-amber-300 tabular-nums">
                  {coinPrice(id)} <CoinIcon size={13} />
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400">
            Zusammen {buyTotal} Münzen, danach hast du noch {coins - buyTotal}. Gekaufte Teile behältst du dauerhaft.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setConfirmBuy(false)}>
              Abbrechen
            </Button>
            <Button onClick={buyAndSave}>Kaufen & speichern</Button>
          </div>
        </div>
      </Modal>

      <div className="space-y-6">
        <p className="md:hidden text-[11px] text-gray-500">
          Gesperrte Teile kannst du anprobieren. Du bekommst sie über Münzen, Karten-Ränge, Wächter und die Aufstiegs-Saison.
          Kosmetik verändert keine Kampfwerte.
        </p>
        {swatchRow(
          "Hautton",
          HERO_SKINS.map((s, i) => ({ key: i, color: s.base, label: `Hautton ${i + 1}`, selected: look.skin === i, enabled: true, onPick: () => set({ skin: i }) }))
        )}
        {swatchRow(
          "Haarfarbe",
          HERO_HAIR_COLORS.map((c, i) => ({ key: i, color: c.base, label: c.label, selected: look.hairColor === i, enabled: true, onPick: () => set({ hairColor: i }) }))
        )}
        {swatchRow(
          "Farbschema der Ausrüstung",
          HERO_SCHEMES.map((s) => ({
            key: s.id,
            color: s.main,
            label: s.label,
            selected: look.scheme === s.id,
            enabled: available("scheme", s.id),
            lock: lockText("scheme", s.id),
            onPick: () => set({ scheme: s.id }),
          }))
        )}

        {shapeSections.map((section) => (
          <section key={section.slot} className="space-y-2">
            <h2 className="font-display text-sm font-bold text-white">{section.title}</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
              {section.options.map((o) => {
                const enabled = available(section.slot, o.id);
                const selected = look[section.slot] === o.id;
                const preview = { ...look, [section.slot]: o.id } as HeroLook;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => set({ [section.slot]: o.id } as Partial<HeroLook>)}
                    aria-pressed={selected}
                    className={optionButton(selected, enabled)}
                  >
                    <span className="relative w-full h-16 block rounded-lg overflow-hidden">
                      {section.slot === "backdrop" && <HeroBackdrop id={o.id} />}
                      <HeroFigure look={preview} className="relative w-full h-full" />
                    </span>
                    <span className="truncate max-w-full">{o.label}</span>
                    {!enabled && (
                      <span className="flex items-center gap-0.5 text-[10px] font-normal text-amber-300">
                        <Lock className="w-2.5 h-2.5" /> {lockText(section.slot, o.id)}
                      </span>
                    )}
                    {selected && <Check className="w-3.5 h-3.5 absolute top-1 right-1 text-teal-300" />}
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

