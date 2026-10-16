"use client";

// ============================================
// Karten-Detailansicht — öffnet sich beim Antippen einer Sammlungs-Kachel
// ============================================

import { Modal } from "@/components/ui/Modal";
import BattleCardView, { type BattleCardData } from "./BattleCardView";

export interface CardDetailSelection {
  card: BattleCardData;
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
        </div>
      )}
    </Modal>
  );
}
