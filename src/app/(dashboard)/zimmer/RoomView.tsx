"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ShoppingBag, Pencil, Briefcase } from "lucide-react";
import type { RoomState } from "@/lib/room-layout";
import type { RoomProfileCore, RoomProfileDetails } from "@/lib/room-profile-data";
import RoomStage, { type InteractTarget } from "./RoomStage";
import CrtProfileModal from "./CrtProfileModal";
import VitrineModal from "./VitrineModal";

interface Props {
  state:       RoomState;
  core:        RoomProfileCore;
  details:     RoomProfileDetails;
  readOnly:    boolean;
  trophySection:    ReactNode;
  settingsSection?: ReactNode;
}

/**
 * Klammer um die Bühne: hält offen, welches Overlay gerade sichtbar ist.
 * Bewusst dünn — die Server-Seite liefert alle Daten, hier wird nur geschaltet.
 */
export default function RoomView({
  state, core, details, readOnly, trophySection, settingsSection,
}: Props) {
  const [openTarget, setOpenTarget] = useState<InteractTarget | null>(null);

  return (
    <>
      <RoomStage
        state={state}
        ownerName={core.displayName}
        vitrine={core.vitrine}
        onInteract={setOpenTarget}
      />

      {/* ── Aktionsleiste ────────────────────────────────────────────
          Klebt auf dem Handy über der BottomNav, damit sie in
          Daumenreichweite bleibt. */}
      {!readOnly && (
        <div className="sticky bottom-20 lg:bottom-4 z-30 safe-area-pb">
          <div className="glass-heavy rounded-2xl p-2 flex items-center gap-2">
            <button
              type="button"
              disabled
              title="Kommt in der nächsten Ausbaustufe"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                         bg-white/[0.04] border border-white/[0.06] text-gray-600 cursor-not-allowed"
            >
              <Pencil className="w-3.5 h-3.5" /> Einrichten
            </button>
            <Link
              href="/shop#moebel"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                         bg-amber-500/15 border border-amber-500/25 text-amber-300 hover:bg-amber-500/25 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5" /> Möbel kaufen
            </Link>
            <button
              type="button"
              onClick={() => setOpenTarget("jobboard")}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                         bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" /> Jobbörse
            </button>
          </div>
        </div>
      )}

      <CrtProfileModal
        open={openTarget === "crt"}
        onClose={() => setOpenTarget(null)}
        displayName={core.displayName}
        readOnly={readOnly}
        details={details}
        trophySection={trophySection}
        settingsSection={readOnly ? undefined : settingsSection}
      />

      <VitrineModal
        open={openTarget === "vitrine"}
        onClose={() => setOpenTarget(null)}
        displayName={core.displayName}
        readOnly={readOnly}
        details={details}
        trophySection={trophySection}
      />

      {/* Die Jobbörse kommt in Phase 3 — bis dahin ein ehrlicher Hinweis
          statt eines toten Klicks auf dem schwarzen Brett. */}
      {openTarget === "jobboard" && (
        <JobBoardPlaceholder onClose={() => setOpenTarget(null)} />
      )}
    </>
  );
}

function JobBoardPlaceholder({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="sheet-backdrop fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="glass-heavy rounded-2xl p-6 max-w-sm text-center pointer-events-auto">
          <div className="text-3xl mb-3">📋</div>
          <p className="text-sm font-semibold text-white mb-1">Die Stellen sind noch nicht ausgeschrieben</p>
          <p className="text-xs text-gray-500 mb-4">
            Die Jobbörse öffnet, sobald die Idle-Jobs fertig sind. Bis dahin: Zimmer einrichten.
          </p>
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300"
          >
            Alles klar
          </button>
        </div>
      </div>
    </>
  );
}
