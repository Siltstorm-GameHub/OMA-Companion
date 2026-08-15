"use client";

import type { ReactNode } from "react";
import { Modal } from "@/components/ui";
import PokalSection from "@/components/PokalSection";
import type { RoomProfileDetails } from "@/lib/room-profile-data";

interface Props {
  open:        boolean;
  onClose:     () => void;
  displayName: string;
  readOnly:    boolean;
  details:     RoomProfileDetails;
  /** ISO-Zeitpunkt der letzten bewussten Fach-Änderung, oder `null` (nie angefasst). */
  vitrineUpdatedAt: string | null;
  /** Serverseitig gerendert (WanderpocalSection ist eine Server-Komponente). */
  trophySection: ReactNode;
}

/**
 * Die Vitrine in groß: digitale Pokale, Abzeichen und Wanderpokale.
 */
export default function VitrineModal({
  open, onClose, displayName, readOnly, details, vitrineUpdatedAt, trophySection,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title={`🏆 Vitrine von ${displayName}`}>
      <div className="space-y-6">
        {vitrineUpdatedAt && (
          <p className="text-[10px] text-gray-600 -mt-2">
            Zuletzt kuratiert am {new Date(vitrineUpdatedAt).toLocaleDateString("de-DE", {
              day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin",
            })}
          </p>
        )}

        <PokalSection pokale={details.pokale} ownerName={displayName} />

        {(details.trophies.length > 0 || details.trophyStats.length > 0) && trophySection}

        {details.pokale.length === 0 && details.trophies.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-4">
            {readOnly
              ? `${displayName} hat noch keine Pokale gewonnen.`
              : "Noch keine Pokale gewonnen."}
          </p>
        )}
      </div>
    </Modal>
  );
}
