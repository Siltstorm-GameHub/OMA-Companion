"use client";

// ============================================
// OMA Gems — „Mein Held“: Editor für die eigene Community-Karte
// ============================================
// Live-Vorschau oben, darunter je Slot die Auswahl. Formen (Grundfigur, Gesicht, Frisur, Ausrüstung,
// Pose) zeigen eine kleine Vorschau des eigenen Helden mit genau diesem Teil, Farben ein Farbfeld.
// Gesperrte Teile zeigen, wie man sie bekommt (cosmetics.ts); gespeichert wird serverseitig geprüft.

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Check, Dices, Lock, RotateCcw } from "@/components/icons";
import HeroFigure from "./HeroFigure";
import ErrorNotice from "./ErrorNotice";
import { getClassConfig } from "./BattleCardView";
import {
  HERO_ACCESSORIES,
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
import { isAvailable, unlockFor, unlockLabel, type CosmeticSlot } from "@/lib/gems/hero/cosmetics";

type ShapeSlot = "base" | "face" | "hair" | "emblem" | "headgear" | "accessory" | "pose";

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
}: {
  name: string;
  heroClass: HeroClass;
  initialLook: HeroLook;
  /** Freigeschaltete Kosmetik-Teile ("scheme:gold" …). */
  owned: string[];
}) {
  const router = useRouter();
  const [look, setLook] = useState<HeroLook>(initialLook);
  const [saved, setSaved] = useState<HeroLook>(initialLook);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const ownedSet = useMemo(() => new Set(owned), [owned]);
  const changed = JSON.stringify(look) !== JSON.stringify(saved);
  const classColor = getClassConfig(heroClass).color;

  const available = (slot: string, id: string) =>
    slot === "scheme" || slot === "emblem" || slot === "headgear" || slot === "accessory" || slot === "pose"
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
    });
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
        ? "bg-teal-500/15 ring-2 ring-teal-400 text-white"
        : enabled
          ? "glass hover:bg-white/[0.06] text-gray-300"
          : "glass opacity-50 cursor-not-allowed text-gray-500"
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
            disabled={!it.enabled}
            title={it.enabled ? it.label : `${it.label} — ${it.lock}`}
            aria-label={it.enabled ? it.label : `${it.label}, gesperrt: ${it.lock}`}
            aria-pressed={it.selected}
            className={`relative w-11 h-11 rounded-full border-[3px] transition-transform ${
              it.selected ? "border-white scale-110" : "border-[#1b1326]"
            } ${it.enabled ? "hover:scale-105" : "opacity-40 cursor-not-allowed"}`}
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
          <div className="w-28 h-32 md:w-auto md:h-72 shrink-0 px-2 pt-2 md:px-6 md:pt-4">
            <HeroFigure look={look} title={name} idle className="w-full h-full" />
          </div>
          <div className="px-3 py-2 md:px-4 md:pb-4 md:pt-1 min-w-0">
            <p className="font-display text-lg md:text-xl font-bold text-white truncate">{name}</p>
            <p className="text-xs text-gray-400">Deine Community-Karte · {getClassConfig(heroClass).label}</p>
          </div>
        </div>
        {error && <ErrorNotice message={error} />}
        {notice && <p className="text-xs text-teal-300">{notice}</p>}
        <div className="flex gap-2">
          <Button onClick={save} disabled={!changed} loading={saving} className="flex-1">
            Speichern
          </Button>
          <Button variant="ghost" onClick={randomize} icon={<Dices className="w-4 h-4" />} aria-label="Zufällig">
            Zufall
          </Button>
          <Button variant="ghost" onClick={() => set(saved)} disabled={!changed} icon={<RotateCcw className="w-4 h-4" />} aria-label="Zurücksetzen">
            Zurück
          </Button>
        </div>
        <p className="hidden md:block text-[11px] text-gray-500">
          Gesperrte Teile bekommst du über Münzen, Karten-Ränge, Turmwächter und die Turm-Saison. Kosmetik verändert keine
          Kampfwerte.
        </p>
      </div>

      <div className="space-y-6">
        <p className="md:hidden text-[11px] text-gray-500">
          Gesperrte Teile bekommst du über Münzen, Karten-Ränge, Turmwächter und die Turm-Saison. Kosmetik verändert keine
          Kampfwerte.
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
                    disabled={!enabled}
                    onClick={() => set({ [section.slot]: o.id } as Partial<HeroLook>)}
                    aria-pressed={selected}
                    className={optionButton(selected, enabled)}
                  >
                    <span className="w-full h-16 block">
                      <HeroFigure look={preview} className="w-full h-full" />
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

