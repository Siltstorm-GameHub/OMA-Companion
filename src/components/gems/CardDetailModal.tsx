"use client";

// ============================================
// Karten-Detailansicht — öffnet sich beim Antippen einer Sammlungs-Kachel
// ============================================

import { Modal } from "@/components/ui/Modal";
import BattleCardView, { type BattleCardData } from "./BattleCardView";
import { RankProgress } from "./CardRank";

export interface CardDetailSelection {
  card: BattleCardData;
  /** XP — nur bei eigenen Karten, zeigt Rang und Fortschritt. */
  xp?: number;
}

export default function CardDetailModal({
  selection,
  onClose,
}: {
  selection: CardDetailSelection | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!selection} onClose={onClose} title={selection?.card.name} size="sm">
      {selection && (
        <div className="flex flex-col items-center gap-4">
          <BattleCardView card={selection.card} />
          {selection.xp != null && <RankProgress xp={selection.xp} baseHp={selection.card.baseHp} baseAttack={selection.card.baseAttack} />}
        </div>
      )}
    </Modal>
  );
}
