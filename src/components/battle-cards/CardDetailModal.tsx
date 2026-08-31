"use client";

// ============================================
// Karten-Detailansicht — öffnet sich beim Antippen einer Sammlungs-Kachel
// ============================================

import { Modal } from "@/components/ui/Modal";
import BattleCardView, { type BattleCardData } from "./BattleCardView";
import DuplicateProgress from "./DuplicateProgress";
import type { UpgradeTable } from "@/lib/battle-cards/upgrade-config";

export interface CardDetailSelection {
  card: BattleCardData;
  /** Nur bei eigenen Karten gesetzt — steuert, ob der Upgrade-Bereich angezeigt wird. */
  owned?: {
    userCardId: string;
    duplicates: number;
    coins: number;
    duplicateThresholds: UpgradeTable;
    upgradeCosts: UpgradeTable;
    onUpgraded: (fromLevel: number, newLevel: number, newCoins: number) => void;
  };
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
          {selection.owned && (
            <div className="w-full max-w-[240px]">
              <DuplicateProgress
                userCardId={selection.owned.userCardId}
                rarity={selection.card.rarity}
                level={selection.card.level ?? 1}
                duplicates={selection.owned.duplicates}
                coins={selection.owned.coins}
                duplicateThresholds={selection.owned.duplicateThresholds}
                upgradeCosts={selection.owned.upgradeCosts}
                onUpgraded={selection.owned.onUpgraded}
              />
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
