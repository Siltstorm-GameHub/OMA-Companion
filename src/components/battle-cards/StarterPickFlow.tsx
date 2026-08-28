"use client";

// ============================================
// Start-Pack — Auswahl-Flow
// ============================================
// Phase 1: je 1 Karte aus Tank/Support/Damage Dealer wählen (Pflicht).
// Phase 2 (erst danach freigeschaltet): 2 weitere Karten frei wählen —
// auch eine bereits gewählte Klasse ein zweites Mal ist erlaubt (zählt
// dann als Duplikat).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Shield, Swords, HeartPulse, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { BattleCardData } from "./BattleCardView";

const CLASS_CONFIG: Record<BattleCardData["class"], { color: string; icon: LucideIcon; label: string }> = {
  TANK: { color: "#14b8a6", icon: Shield, label: "Tank" },
  DAMAGE_DEALER: { color: "#ef4444", icon: Swords, label: "Damage Dealer" },
  SUPPORT: { color: "#8b5cf6", icon: HeartPulse, label: "Support" },
};

const CLASS_ORDER: BattleCardData["class"][] = ["TANK", "SUPPORT", "DAMAGE_DEALER"];

function PickTile({
  card,
  selected,
  disabled,
  onClick,
}: {
  card: BattleCardData & { id: string };
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const config = CLASS_CONFIG[card.class];
  const Icon = config.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="relative surface rounded-lg p-3 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        boxShadow: selected ? `0 0 0 2px ${config.color}, 0 0 16px ${config.color}55` : undefined,
      }}
    >
      {selected && (
        <span
          className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ background: config.color }}
        >
          <Check className="w-2.5 h-2.5 text-black" />
        </span>
      )}
      <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-2" style={{ background: `${config.color}22` }}>
        <Icon className="w-4 h-4" style={{ color: config.color }} />
      </div>
      <p className="text-sm font-semibold text-white truncate">{card.name}</p>
      <p className="text-[11px] text-gray-500 truncate">{card.title}</p>
    </button>
  );
}

export default function StarterPickFlow({ cards }: { cards: (BattleCardData & { id: string })[] }) {
  const router = useRouter();
  const [classPicks, setClassPicks] = useState<Partial<Record<BattleCardData["class"], string>>>({});
  const [bonusPicks, setBonusPicks] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const cardsByClass = useMemo(() => {
    const map: Record<BattleCardData["class"], (BattleCardData & { id: string })[]> = {
      TANK: [], DAMAGE_DEALER: [], SUPPORT: [],
    };
    for (const c of cards) map[c.class].push(c);
    return map;
  }, [cards]);

  const classPhaseComplete = CLASS_ORDER.every((cls) => classPicks[cls]);
  const bonusPhaseComplete = bonusPicks.length === 2;
  const canSubmit = classPhaseComplete && bonusPhaseComplete;

  function pickClass(cls: BattleCardData["class"], cardId: string) {
    setClassPicks((prev) => ({ ...prev, [cls]: cardId }));
  }

  function toggleBonus(cardId: string) {
    setBonusPicks((prev) => {
      if (prev.includes(cardId)) return prev.filter((id) => id !== cardId);
      if (prev.length >= 2) return prev;
      return [...prev, cardId];
    });
  }

  async function submit() {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const cardIds = [...CLASS_ORDER.map((cls) => classPicks[cls]!), ...bonusPicks];
      const res = await fetch("/api/battle-cards/starter-pick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Fehler beim Speichern");
        return;
      }
      toast.success("Start-Pack gewählt!");
      router.push("/battle-cards");
      router.refresh();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {CLASS_ORDER.map((cls) => {
        const config = CLASS_CONFIG[cls];
        return (
          <div key={cls} className="space-y-2">
            <p className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: config.color }}>
              {config.label} wählen {classPicks[cls] && "✓"}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {cardsByClass[cls].map((card) => (
                <PickTile
                  key={card.id}
                  card={card}
                  selected={classPicks[cls] === card.id}
                  onClick={() => pickClass(cls, card.id)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="space-y-2">
        <p className={`text-[10px] uppercase tracking-widest font-semibold ${classPhaseComplete ? "text-gray-400" : "text-gray-700"}`}>
          2 weitere Karten wählen ({bonusPicks.length}/2)
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {cards.map((card) => (
            <PickTile
              key={card.id}
              card={card}
              selected={bonusPicks.includes(card.id)}
              disabled={!classPhaseComplete || (bonusPicks.length >= 2 && !bonusPicks.includes(card.id))}
              onClick={() => toggleBonus(card.id)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || submitting}
        className="w-full py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 text-black disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start-Pack bestätigen"}
      </button>
    </div>
  );
}
