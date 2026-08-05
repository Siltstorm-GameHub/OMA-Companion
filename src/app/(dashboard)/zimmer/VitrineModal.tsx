"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui";
import CollectiblesShowcase from "@/app/(dashboard)/profile/CollectiblesShowcase";
import { MAX_SHOWCASE } from "@/lib/collectibles";
import type { RoomProfileDetails } from "@/lib/room-profile-data";

interface Props {
  open:        boolean;
  onClose:     () => void;
  displayName: string;
  readOnly:    boolean;
  details:     RoomProfileDetails;
  /** Serverseitig gerendert (WanderpocalSection ist eine Server-Komponente). */
  trophySection: ReactNode;
}

/**
 * Die Vitrine in groß: Sammlerstücke, Abzeichen und Wanderpokale.
 * Im eigenen Zimmer lässt sich hier auch bestimmen, was in der Vitrine steht —
 * dafür wird die bestehende CollectiblesShowcase-Komponente unverändert genutzt.
 */
export default function VitrineModal({
  open, onClose, displayName, readOnly, details, trophySection,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title={`🏆 Vitrine von ${displayName}`}>
      <div className="space-y-6">
        <CollectiblesShowcase
          showcaseItems={details.showcaseCollectibles}
          allOwned={details.ownedCollectibles}
          maxSlots={MAX_SHOWCASE}
          readOnly={readOnly}
        />

        {(details.trophies.length > 0 || details.trophyStats.length > 0) && trophySection}

        {details.showcaseCollectibles.length === 0 && details.trophies.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">
            {readOnly
              ? `${displayName} hat noch nichts in die Vitrine gestellt.`
              : "Deine Vitrine ist noch leer. Im Shop gibt es Sammlerstücke."}
          </p>
        )}
      </div>
    </Modal>
  );
}
