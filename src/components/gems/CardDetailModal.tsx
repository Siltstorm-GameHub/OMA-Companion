"use client";

// ============================================
// Karten-Detailansicht — öffnet sich beim Antippen einer Sammlungs-Kachel
// ============================================

import { Modal } from "@/components/ui/Modal";
import BattleCardView, { type BattleCardData } from "./BattleCardView";
import { RankProgress } from "./CardRank";

export interface CardDetailSelection {
  card: BattleCardData;
  /** Rang-Punkte — nur bei eigenen Karten, zeigt Rang und Fortschritt. */
  winsInLineup?: number;
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
          {selection.winsInLineup != null && <RankProgress wins={selection.winsInLineup} baseHp={selection.card.baseHp} baseAttack={selection.card.baseAttack} />}
        </div>
      )}
    </Modal>
  );
}
