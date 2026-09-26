"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "@/components/icons";
import BattleCardView from "./BattleCardView";
import type { BattleCardData } from "./BattleCardView";
import MobaInputBox from "./MobaInputBox";
import TeCharacterEditor from "@/components/te-character/TeCharacterEditor";
import { allowedWeapons } from "@/lib/te-character/class-weapons";
import { BG_SOURCE, ITEM_SOURCE, unlockState, type UnlockState } from "@/lib/te-character/card-catalog";
import { CARD_BGS, CARD_BG_LABEL, TE_POSES, type CardBg, type TeCharacterConfig, type TeDir, type TePose } from "@/lib/te-character";

const TITLE_MAX = 25;
const FLAVOR_MAX = 100;

export default function MyCardEditor({
  card,
  initialTeCharacter,
  hasTeCharacter,
  setup = false,
  dndClass = null,
  bgStates,
  itemStates: initialItemStates,
  coins: initialCoins = 0,
}: {
  card: BattleCardData & { id: string };
  /** Bisheriger Charakter (Card.teCharacter) bzw. die Standard-Figur zum Losgehen. */
  initialTeCharacter: TeCharacterConfig;
  /** false = noch nie gespeichert: die Karte zeigt weiter das Profilbild, bis der User den Charakter anfasst. */
  hasTeCharacter: boolean;
  /** Teil der Helden-Einrichtung: der Charakter ist Pflicht, gespeichert wird mit "Weiter". */
  setup?: boolean;
  /** OMA-Quest-Klasse: bestimmt, welche Waffen wählbar sind (Kleidung ist frei) */
  dndClass?: string | null;
  /** Freischalt-Zustand der Hintergründe (Server) */
  bgStates?: Record<CardBg, UnlockState>;
  /** Freischalt-Zustand von Waffen, Extras und Rücken-Accessoires ("Ebene:Teil") */
  itemStates?: Record<string, UnlockState>;
  coins?: number;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(card.title);
  const [flavorText, setFlavorText] = useState(card.flavorText);
  const [teCharacter, setTeCharacter] = useState(initialTeCharacter);
  const [useCharacter, setUseCharacter] = useState(hasTeCharacter || setup);
  const [saving, setSaving] = useState(false);
  const [dir, setDir] = useState<TeDir>("down");
  const [flavorFocused, setFlavorFocused] = useState(false);
  // Einrichtung eines neuen Helden: noch nichts freigeschaltet (Stufe 0), nur die freien Teile
  const [states, setStates] = useState(bgStates ?? (setup ? (Object.fromEntries(CARD_BGS.map((b) => [b, unlockState(BG_SOURCE[b], false, 0)])) as Record<CardBg, UnlockState>) : undefined));
  const [itemStates, setItemStates] = useState(initialItemStates ?? (setup ? Object.fromEntries(Object.entries(ITEM_SOURCE).map(([k, src]) => [k, unlockState(src, false, 0)])) : undefined));
  const [coins, setCoins] = useState(initialCoins);

  async function pickItem(key: string) {
    const st = itemStates?.[key];
    if (!st || st.ok) return;
    if (st.source.kind !== "coins") { toast.info(`Freigeschaltet ${st.hint.toLowerCase()} in OMA Quest.`); return; }
    if (!window.confirm(`Dieses Teil für ${st.source.price} Münzen kaufen? Du hast ${coins}.`)) return;
    const res = await fetch("/api/battle-cards/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "item", key }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }
    setCoins(data.coins);
    setItemStates((cur) => (cur ? { ...cur, [key]: { ...cur[key], ok: true, owned: true, hint: "gekauft" } } : cur));
    toast.success("Freigeschaltet!");
  }

  async function pickBg(b: CardBg) {
    const st = states?.[b];
    if (!st || st.ok) { setTeCharacter({ ...teCharacter, bg: b }); setUseCharacter(true); return; }
    if (st.source.kind !== "coins") { toast.info(`Freigeschaltet ${st.hint.toLowerCase()} in OMA Quest.`); return; }
    if (!window.confirm(`${CARD_BG_LABEL[b]} für ${st.source.price} Münzen kaufen? Du hast ${coins}.`)) return;
    const res = await fetch("/api/battle-cards/unlock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "bg", key: b }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast.error(data.error ?? "Kauf fehlgeschlagen"); return; }
    setCoins(data.coins);
    setStates((cur) => (cur ? { ...cur, [b]: { ...cur[b], ok: true, owned: true, hint: "gekauft" } } : cur));
    setTeCharacter({ ...teCharacter, bg: b });
    setUseCharacter(true);
    toast.success(`${CARD_BG_LABEL[b]} freigeschaltet!`);
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/battle-cards/my-card", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, flavorText, teCharacter: useCharacter ? teCharacter : null }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Speichern fehlgeschlagen");
        return;
      }
      toast.success(setup ? "Aussehen gespeichert!" : "Gespeichert!");
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  // Karte plus Drehregler: der Held lässt sich in alle vier Richtungen drehen, um jedes Detail zu prüfen.
  const cardPreview = (
    <div className="space-y-2 max-w-[240px]">
      <BattleCardView card={{ ...card, title, flavorText, teCharacter: useCharacter ? teCharacter : null }} characterDir={dir} />
      {useCharacter && (
        <div className="flex items-center justify-center gap-1" role="group" aria-label="Held drehen">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 mr-1">Drehen</span>
          {(["up", "left", "down", "right"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDir(d)}
              aria-pressed={dir === d}
              aria-label={{ up: "Von hinten", left: "Nach links", down: "Von vorn", right: "Nach rechts" }[d]}
              className={`w-8 h-8 rounded-lg text-sm transition-colors ${dir === d ? "bg-violet-600 text-white" : "bg-black/40 text-gray-300 hover:text-white"}`}
            >
              {{ up: "↑", left: "←", down: "↓", right: "→" }[d]}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Ein Layout für Einrichtung und Bearbeiten: die Karte ist die einzige Vorschau (klebt links), der Charakter erscheint direkt darin.
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-6 items-start">
      <div className="sm:sticky sm:top-4 self-start">{cardPreview}</div>
      <div className="space-y-5 min-w-0">
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


    <div>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="text-sm font-bold text-white">Dein Charakter</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Gestalte deine Figur — sie ist das Motiv deiner Karte und deine Spielfigur in OMA Quest.
            Die Auswahl wird beim Speichern übernommen.
          </p>
        </div>
        {useCharacter && !setup && (
          <button
            type="button"
            onClick={() => setUseCharacter(false)}
            className="shrink-0 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          >
            Zurück zum Profilbild
          </button>
        )}
      </div>
        <div className="space-y-3 mb-4">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Pose</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TE_POSES) as TePose[]).map((p) => {
                const on = (teCharacter.pose ?? "stand") === p;
                return <button key={p} type="button" aria-pressed={on} onClick={() => { setTeCharacter({ ...teCharacter, pose: p === "stand" ? undefined : p }); setUseCharacter(true); }} className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${on ? "bg-violet-600 text-white" : "bg-black/40 text-gray-300 hover:text-white"}`}>{TE_POSES[p].label}</button>;
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Hintergrund <span className="normal-case tracking-normal">· gesperrte lassen sich per Stufe oder für Münzen freischalten ({coins} Münzen)</span></p>
            <div className="flex flex-wrap gap-1.5">
              <button type="button" aria-pressed={!teCharacter.bg} onClick={() => setTeCharacter({ ...teCharacter, bg: undefined, night: undefined })} className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${!teCharacter.bg ? "bg-violet-600 text-white" : "bg-black/40 text-gray-300 hover:text-white"}`}>Klassenfarbe</button>
              {CARD_BGS.map((b: CardBg) => (
                <button key={b} type="button" aria-pressed={teCharacter.bg === b} onClick={() => void pickBg(b)} className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${teCharacter.bg === b ? "bg-violet-600 text-white" : states?.[b] && !states[b].ok ? "bg-black/30 text-gray-500 hover:text-gray-300" : "bg-black/40 text-gray-300 hover:text-white"}`}>{states?.[b] && !states[b].ok ? "🔒 " : ""}{CARD_BG_LABEL[b]}{states?.[b] && !states[b].ok ? <span className="ml-1 text-[10px] opacity-80">{states[b].hint}</span> : null}</button>
              ))}
            </div>
            {teCharacter.bg && (
              <label className="mt-2 flex items-center gap-2 text-xs text-gray-300">
                <input type="checkbox" checked={!!teCharacter.night} onChange={(e) => setTeCharacter({ ...teCharacter, night: e.target.checked || undefined })} /> Nachts
              </label>
            )}
          </div>
        </div>
        <TeCharacterEditor
        compact
        allowedWeapons={allowedWeapons(dndClass)}
        itemStates={itemStates}
        onLockedPick={(k) => void pickItem(k)}
        value={teCharacter}
        onChange={(next) => { setTeCharacter({ ...next, pose: teCharacter.pose, bg: teCharacter.bg, night: teCharacter.night }); setUseCharacter(true); }}
      />
    </div>

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
            {saving ? "Speichert…" : setup ? "Weiter: Klasse & Werte" : "Speichern"}
          </span>
        </button>
      </div>
    </div>
  );
}
