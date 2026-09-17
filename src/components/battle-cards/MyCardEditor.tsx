"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2 } from "lucide-react";
import BattleCardView from "./BattleCardView";
import type { BattleCardData } from "./BattleCardView";

const TITLE_MAX = 25;
const FLAVOR_MAX = 100;

export default function MyCardEditor({ card }: { card: BattleCardData & { id: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState(card.title);
  const [flavorText, setFlavorText] = useState(card.flavorText);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/battle-cards/my-card", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, flavorText }),
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
      <BattleCardView card={{ ...card, title, flavorText }} />

      <div className="space-y-4">
        <label className="block">
          <span className="text-xs text-gray-500">Untertitel ({title.length}/{TITLE_MAX})</span>
          <input
            type="text"
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z.B. Die Wächterin"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-black/20 border border-[color:var(--moba-accent-line)] text-white text-sm focus:outline-none focus:border-[color:var(--moba-accent)]"
          />
        </label>

        <label className="block">
          <span className="text-xs text-gray-500">Beschreibung ({flavorText.length}/{FLAVOR_MAX})</span>
          <textarea
            value={flavorText}
            maxLength={FLAVOR_MAX}
            onChange={(e) => setFlavorText(e.target.value)}
            rows={4}
            placeholder="Kurzer Flavor-Text für deine Karte…"
            className="mt-1 w-full px-3 py-2 rounded-lg bg-black/20 border border-[color:var(--moba-accent-line)] text-white text-sm focus:outline-none focus:border-[color:var(--moba-accent)] resize-none"
          />
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
    </div>
  );
}
