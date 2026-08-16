"use client";

import { Modal } from "@/components/ui";
import { VitrinePanel } from "./VitrinePanel";
import type { RoomProfileCore } from "@/lib/room-profile-data";

interface Props {
  open:        boolean;
  onClose:     () => void;
  displayName: string;
  readOnly:    boolean;
  vitrine:     RoomProfileCore["vitrine"];
  /** Fach angeklickt — öffnet VitrineSlotModal (siehe RoomView.tsx). */
  onSlotClick: (slotIndex: number) => void;
}

/**
 * Die Vitrine in groß: dieselbe silberne-Sockel-Ansicht mit Fach-Auswahl, die
 * vor dem 3D-Umbau als eigenständiges Panel neben der Bühne stand
 * (VitrinePanel.tsx) — hier als Inhalt des Zoom-Modals wiederverwendet, statt
 * einer generischen Pokal-/Abzeichen-Liste. Der Klick auf die Vitrine im Raum
 * fährt die Kamera heran (siehe RoomStage3D/FitCamera) und öffnet DANN dieses
 * Modal — fühlt sich dadurch an wie ein echter Blick in die Vitrine, nicht
 * wie ein loses Popup.
 */
export default function VitrineModal({
  open, onClose, displayName, readOnly, vitrine, onSlotClick,
}: Props) {
  return (
    <Modal open={open} onClose={onClose} size="lg" title={`🏆 Vitrine von ${displayName}`}>
      <div className="space-y-3">
        {vitrine.updatedAt && (
          <p className="text-[10px] text-gray-600">
            Zuletzt kuratiert am {new Date(vitrine.updatedAt).toLocaleDateString("de-DE", {
              day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin",
            })}
          </p>
        )}
        <div className="flex justify-center">
          <VitrinePanel
            ownerName={displayName}
            vitrine={vitrine}
            readOnly={readOnly}
            onInteract={(_target, _itemKey, slotIndex) => {
              if (slotIndex != null) onSlotClick(slotIndex);
            }}
            editing={false}
            // Fester Wert statt `null`: im Modal gibt es keinen ResizeObserver-
            // Nachbarn, an dessen Höhe sich die Vitrine ausrichten könnte (das
            // war für den Side-by-side-Look neben der alten SVG-Bühne gedacht)
            // — ohne konkreten Wert würde die `h-full`-Klasse gegen einen
            // Auto-Höhen-Container ins Leere laufen und die SVG auf ihre
            // winzige Browser-Standardgröße zusammenschrumpfen lassen.
            measuredHeight={480}
          />
        </div>
      </div>
    </Modal>
  );
}
