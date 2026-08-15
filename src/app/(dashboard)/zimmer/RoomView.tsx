"use client";

import { useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ShoppingBag, Pencil, Briefcase } from "lucide-react";
import type { RoomState } from "@/lib/room-layout";
import type { RoomProfileCore, RoomProfileDetails } from "@/lib/room-profile-data";
import type { JobOverview } from "@/lib/job-service";
import { type InteractTarget } from "./RoomStage3D";
import RoomEditor from "./RoomEditor";
import CrtProfileModal from "./CrtProfileModal";
import VitrineModal from "./VitrineModal";
import VitrineSlotModal from "./VitrineSlotModal";
import JobBoardSheet from "./JobBoardSheet";
import WageWidget from "./WageWidget";

// Three.js/R3F laufen ausschließlich im Browser (WebGL-Kontext) — per
// dynamic(ssr:false) geladen, damit weder das SSR-HTML noch der initiale
// Server-Bundle-Anteil das Three.js-Gewicht (~500KB+) tragen müssen.
const RoomStage3D = dynamic(() => import("./RoomStage3D"), {
  ssr: false,
  loading: () => <div className="w-full aspect-[6/5] rounded-2xl bg-[#141018] animate-pulse" />,
});

interface Props {
  state:       RoomState;
  core:        RoomProfileCore;
  details:     RoomProfileDetails;
  readOnly:    boolean;
  /** Besitzstand je itemKey — der Editor braucht ihn für Tapeten und Böden. */
  owned?:      Record<string, number>;
  /** Nur im eigenen Zimmer: aktueller Job für den Lohn-Ticker. */
  job?:        JobOverview | null;
  trophySection:    ReactNode;
  settingsSection?: ReactNode;
}

/**
 * Klammer um die Bühne: hält offen, welches Overlay gerade sichtbar ist.
 * Bewusst dünn — die Server-Seite liefert alle Daten, hier wird nur geschaltet.
 */
export default function RoomView({
  state, core, details, readOnly, owned, job, trophySection, settingsSection,
}: Props) {
  const [openTarget, setOpenTarget] = useState<InteractTarget | null>(null);
  // Welcher Monitor-Typ das Profil-Popup geöffnet hat — bestimmt, wie dessen
  // Rahmen aussieht (Röhre/Flachbildschirm/144Hz). Nur bei target "crt" gesetzt.
  const [openMonitorKey, setOpenMonitorKey] = useState<string | undefined>(undefined);
  // Welches Vitrinen-Fach angeklickt wurde — `null` = Hintergrund der
  // Vitrine (öffnet die Gesamtübersicht statt eines einzelnen Fachs).
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);
  const [editing, setEditing]       = useState(false);

  function handleInteract(target: InteractTarget, itemKey?: string, slotIndex?: number) {
    // Leeres Fach in einem fremden Zimmer: nichts zum Ansehen, nichts zum
    // Bearbeiten — kein Modal aufreißen.
    if (target === "vitrine" && slotIndex != null && readOnly && !core.vitrine.slots[slotIndex]) return;
    setOpenTarget(target);
    setOpenMonitorKey(itemKey);
    setOpenSlotIndex(slotIndex ?? null);
  }

  // Im Bearbeiten-Modus übernimmt der Editor die Bühne samt eigener Leiste.
  if (editing && !readOnly) {
    return (
      <RoomEditor
        state={state}
        core={core}
        owned={owned ?? {}}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <>
      <RoomStage3D
        state={state}
        ownerName={core.displayName}
        vitrine={core.vitrine}
        vitrineReadOnly={readOnly}
        onInteract={handleInteract}
      />

      {/* ── Lohn ─────────────────────────────────────────────────────
          Direkt unter der Bühne, damit "Lohn abholen" der erste Griff
          nach dem Reinschauen ist. */}
      {!readOnly && job?.enabled && (
        <WageWidget
          current={job.current}
          wageCapHours={job.wageCapHours}
          multiplierPct={job.wageMultiplierPct}
          onOpenBoard={() => setOpenTarget("jobboard")}
          onClaimed={() => { /* router.refresh() passiert im Widget */ }}
        />
      )}

      {/* ── Aktionsleiste ────────────────────────────────────────────
          Klebt auf dem Handy über der BottomNav, damit sie in
          Daumenreichweite bleibt. */}
      {!readOnly && (
        <div className="sticky bottom-20 lg:bottom-4 z-30 safe-area-pb">
          <div className="glass-heavy rounded-2xl p-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                         bg-violet-500/15 border border-violet-500/25 text-violet-300 hover:bg-violet-500/25 transition-colors"
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
        monitorKey={openMonitorKey}
        displayName={core.displayName}
        readOnly={readOnly}
        details={details}
        core={readOnly ? undefined : core}
        trophySection={trophySection}
        settingsSection={readOnly ? undefined : settingsSection}
      />

      <VitrineModal
        open={openTarget === "vitrine" && openSlotIndex === null}
        onClose={() => setOpenTarget(null)}
        displayName={core.displayName}
        readOnly={readOnly}
        details={details}
        trophySection={trophySection}
      />

      <VitrineSlotModal
        key={openSlotIndex ?? "none"}
        open={openTarget === "vitrine" && openSlotIndex !== null}
        onClose={() => setOpenTarget(null)}
        slotIndex={openSlotIndex}
        item={openSlotIndex !== null ? core.vitrine.slots[openSlotIndex] ?? null : null}
        readOnly={readOnly}
        details={details}
      />

      <JobBoardSheet
        open={openTarget === "jobboard"}
        onClose={() => setOpenTarget(null)}
        readOnly={readOnly}
        onChanged={() => { /* die Sheet aktualisiert sich selbst und ruft router.refresh() */ }}
      />
    </>
  );
}
