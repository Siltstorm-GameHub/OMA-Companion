"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "@/components/icons";
import BattleCardView from "./BattleCardView";
import type { BattleCardData } from "./BattleCardView";
import MobaInputBox from "./MobaInputBox";
import PixelCharacterEditor from "@/components/pixel-character/PixelCharacterEditor";
import type { PixelCharacterConfig } from "@/lib/pixel-character";

const TITLE_MAX = 25;
const FLAVOR_MAX = 100;

export default function MyCardEditor({
  card,
  initialPixelCharacter,
  hasPixelCharacter,
}: {
  card: BattleCardData & { id: string };
  /** Bisheriger Pixel-Charakter (Card.pixelCharacter) bzw. die Standard-Figur zum Losgehen. */
  initialPixelCharacter: PixelCharacterConfig;
  /** false = noch nie gespeichert: die Karte zeigt weiter das Profilbild, bis der User den Charakter anfasst. */
  hasPixelCharacter: boolean;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(card.title);
  const [flavorText, setFlavorText] = useState(card.flavorText);
  const [pixelCharacter, setPixelCharacter] = useState(initialPixelCharacter);
  const [usePixel, setUsePixel] = useState(hasPixelCharacter);
  const [saving, setSaving] = useState(false);
  const [flavorFocused, setFlavorFocused] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/battle-cards/my-card", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, flavorText, pixelCharacter: usePixel ? pixelCharacter : null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      toast.success("Gespeichert!");
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-6 items-start">
      <BattleCardView card={{ ...card, title, flavorText, pixelCharacter: usePixel ? pixelCharacter : null }} />

      <div className="space-y-4">
        <label className="block">
          <span className="text-xs text-gray-500">Untertitel ({title.length}/{TITLE_MAX})</span>
          <MobaInputBox
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Die Wächterin"
            className="mt-1 w-full px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Beschreibung ({flavorText.length}/{FLAVOR_MAX})</span>
          {/* MobaInputBox ist auf <input> zugeschnitten -- hier dieselben zwei
              Ebenen (box1-normal/-highlighted) direkt um das <textarea>, da es
              die einzige mehrzeilige Stelle im Projekt ist (kein eigenes
              Bauteil nötig). */}
          <div className="relative mt-1">
            <img
              src="/battle-cards/moba/input-box/box1-normal.png"
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full transition-opacity"
              style={{ objectFit: "fill", opacity: flavorFocused ? 0 : 1 }}
            />
            <img
              src="/battle-cards/moba/input-box/box1-highlighted.png"
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full transition-opacity"
              style={{ objectFit: "fill", opacity: flavorFocused ? 1 : 0 }}
            />
            <textarea
              value={flavorText}
              maxLength={FLAVOR_MAX}
              onChange={(e) => setFlavorText(e.target.value)}
              onFocus={() => setFlavorFocused(true)}
              onBlur={() => setFlavorFocused(false)}
              rows={4}
              placeholder="Kurzer Flavor-Text für deine Karte…"
              className="relative z-10 w-full px-3 py-2 bg-transparent text-white text-sm placeholder:text-slate-500 focus:outline-none resize-none"
            />
          </div>
        </label>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="moba-button flex items-center gap-2 px-4 py-2 rounded-xl text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/battle-cards/moba/buttons/btn8_normal.png" alt="" aria-hidden className="moba-img-fill" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/battle-cards/moba/buttons/btn8_hovered.png" alt="" aria-hidden className="moba-img-fill moba-img-fill-hover" />
          <span className="moba-button-label relative flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Speichert…" : "Speichern"}
          </span>
        </button>
      </div>

      <div className="sm:col-span-2 pt-2 border-t border-white/10">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-bold text-white">Pixel-Charakter</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Gestalte deine Figur — sie ist das Motiv deiner Karte und deine Spielfigur in OMA Quest.
              Die Auswahl wird beim Speichern übernommen.
            </p>
          </div>
          {usePixel && (
            <button
              type="button"
              onClick={() => setUsePixel(false)}
              className="shrink-0 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Zurück zum Profilbild
            </button>
          )}
        </div>
        <PixelCharacterEditor
          value={pixelCharacter}
          onChange={(next) => { setPixelCharacter(next); setUsePixel(true); }}
        />
      </div>
    </div>
  );
}
