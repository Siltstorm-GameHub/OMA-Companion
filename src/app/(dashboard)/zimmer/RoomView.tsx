"use client";

import { useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ShoppingBag, Pencil, Briefcase, Lock } from "lucide-react";
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
  /** Admin-verstellbare Stufe-1/2/3-Schwellen (siehe RoomConfig.levelThresholds). */
  levelThresholds?: readonly number[];
}

/**
 * Klammer um die Bühne: hält offen, welches Overlay gerade sichtbar ist.
 * Bewusst dünn — die Server-Seite liefert alle Daten, hier wird nur geschaltet.
 */
// Grob abgestimmt auf FitCamera's Einschwingzeit in RoomStage3D.tsx
// (exponentielles Einschwingen mit speed=6 erreicht nach ~3 Zeitkonstanten,
// also ~500ms, praktisch den Zielzoom) — das Modal für Monitor/Vitrine soll
// erst erscheinen, wenn die Kamera sichtbar herangefahren ist, statt sofort
// aufzureißen und die laufende Zoom-Animation zu verdecken.
const ZOOM_REVEAL_DELAY_MS = 550;

export default function RoomView({
  state, core, details, readOnly, owned, job, trophySection, settingsSection, levelThresholds,
}: Props) {
  // Treibt die Kamera-Zoom-Animation in RoomStage3D — wird SOFORT beim Klick
  // gesetzt, damit die Kamera direkt losfährt.
  const [focusTarget, setFocusTarget] = useState<InteractTarget | null>(null);
  // Treibt die tatsächliche Sichtbarkeit der Modals — bei Monitor/Vitrine erst
  // nach ZOOM_REVEAL_DELAY_MS gesetzt (siehe closeOverlay/handleInteract),
  // damit man den Zoom tatsächlich sieht, statt dass das Modal ihn sofort
  // verdeckt. Bei der Jobbörse (kein Zoom-Effekt) sofort.
  const [openTarget, setOpenTarget] = useState<InteractTarget | null>(null);
  // Welcher Monitor-Typ das Profil-Popup geöffnet hat — bestimmt, wie dessen
  // Rahmen aussieht (Röhre/Flachbildschirm/144Hz). Nur bei target "crt" gesetzt.
  const [openMonitorKey, setOpenMonitorKey] = useState<string | undefined>(undefined);
  // Welches Vitrinen-Fach angeklickt wurde — `null` = Hintergrund der
  // Vitrine (öffnet die Gesamtübersicht statt eines einzelnen Fachs).
  const [openSlotIndex, setOpenSlotIndex] = useState<number | null>(null);
  const [editing, setEditing]       = useState(false);
  const pendingReveal = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleInteract(target: InteractTarget, itemKey?: string, slotIndex?: number) {
    // Leeres Fach in einem fremden Zimmer: nichts zum Ansehen, nichts zum
    // Bearbeiten — kein Modal aufreißen.
    if (target === "vitrine" && slotIndex != null && readOnly && !core.vitrine.slots[slotIndex]) return;

    if (pendingReveal.current) { clearTimeout(pendingReveal.current); pendingReveal.current = null; }

    setFocusTarget(target);
    setOpenMonitorKey(itemKey);
    setOpenSlotIndex(slotIndex ?? null);

    // Nur Monitor/Vitrine haben einen Zoom-Effekt (siehe FitCamera in
    // RoomStage3D.tsx) — die Jobbörse öffnet weiterhin sofort.
    if (target === "crt" || target === "vitrine") {
      pendingReveal.current = setTimeout(() => {
        setOpenTarget(target);
        pendingReveal.current = null;
      }, ZOOM_REVEAL_DELAY_MS);
    } else {
      setOpenTarget(target);
    }
  }

  function closeOverlay() {
    if (pendingReveal.current) { clearTimeout(pendingReveal.current); pendingReveal.current = null; }
    setFocusTarget(null);
    setOpenTarget(null);
  }

  // Direkter Sprung in die Jobbörse (Lohn-Widget, Aktionsleiste, Ziel-Teaser)
  // — kein Zoom-Effekt, aber ein noch laufender Reveal-Timer von einem eben
  // angeklickten Monitor/der Vitrine muss trotzdem verworfen werden, sonst
  // reißt er später das falsche Modal wieder auf.
  function openJobboard() {
    if (pendingReveal.current) { clearTimeout(pendingReveal.current); pendingReveal.current = null; }
    setFocusTarget("jobboard");
    setOpenTarget("jobboard");
  }

  // Nächstes erreichbares Ziel: der Job mit den wenigsten fehlenden Objekten,
  // dessen Rang aber schon reicht — ein greifbarer "noch 1 Objekt"-Anreiz
  // direkt auf der Bühne, statt dass man das nur in der Jobbörse sieht.
  // Rein aus dem ohnehin geladenen JobOverview berechnet, keine neuen Daten.
  const nextJob = !readOnly && job
    ? job.jobs
        .filter(j => j.rankOk && !j.unlocked)
        .map(j => ({ ...j, missing: j.requirements.filter(r => r.have < r.need) }))
        .filter(j => j.missing.length > 0)
        .sort((a, b) => a.missing.length - b.missing.length || a.coinsPerHour - b.coinsPerHour)[0]
    : undefined;

  // Im Bearbeiten-Modus übernimmt der Editor die Bühne samt eigener Leiste.
  if (editing && !readOnly) {
    return (
      <RoomEditor
        state={state}
        core={core}
        owned={owned ?? {}}
        onDone={() => setEditing(false)}
        levelThresholds={levelThresholds}
      />
    );
  }

  return (
    <>
      <div className="relative">
        <RoomStage3D
          state={state}
          ownerName={core.displayName}
          vitrine={core.vitrine}
          vitrineReadOnly={readOnly}
          onInteract={handleInteract}
          focusTarget={focusTarget}
          levelThresholds={levelThresholds}
        />

        {/* ── Aktions-Buttons direkt auf der Kachel ─────────────────────
            Einrichten/Möbel kaufen unten links, Jobbörse unten rechts —
            als Overlay statt einer separaten Leiste unter der Bühne, damit
            sie sofort als Teil des Zimmers lesbar sind. `stopPropagation`
            auf onPointerDown verhindert, dass die Dreh-Geste der Bühne
            (siehe RoomStage3D.tsx) den Klick kapert. */}
        {!readOnly && (
          <>
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5 pointer-events-none">
              <button
                type="button"
                onClick={() => setEditing(true)}
                onPointerDown={e => e.stopPropagation()}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold
                           bg-violet-500/20 border border-violet-400/40 text-violet-200 hover:bg-violet-500/30 transition-colors backdrop-blur-sm"
              >
                <Pencil className="w-3.5 h-3.5" /> Einrichten
              </button>
              <Link
                href="/shop#moebel"
                onPointerDown={e => e.stopPropagation()}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold
                           bg-amber-500/20 border border-amber-400/40 text-amber-200 hover:bg-amber-500/30 transition-colors backdrop-blur-sm"
              >
                <ShoppingBag className="w-3.5 h-3.5" /> Möbel kaufen
              </Link>
            </div>
            <div className="absolute bottom-3 right-3 pointer-events-none">
              <button
                type="button"
                onClick={openJobboard}
                onPointerDown={e => e.stopPropagation()}
                className="pointer-events-auto flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-semibold
                           bg-teal-500/20 border border-teal-400/40 text-teal-200 hover:bg-teal-500/30 transition-colors backdrop-blur-sm"
              >
                <Briefcase className="w-3.5 h-3.5" /> Jobbörse
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Lohn ─────────────────────────────────────────────────────
          Direkt unter der Bühne, damit "Lohn abholen" der erste Griff
          nach dem Reinschauen ist. */}
      {!readOnly && job?.enabled && (
        <WageWidget
          current={job.current}
          wageCapHours={job.wageCapHours}
          multiplierPct={job.wageMultiplierPct}
          onOpenBoard={openJobboard}
          onClaimed={() => { /* router.refresh() passiert im Widget */ }}
        />
      )}

      {/* ── Nächstes Ziel ────────────────────────────────────────────
          Greifbarer nächster Job, direkt auf der Bühne statt versteckt
          in der Jobbörse. */}
      {nextJob && (
        <button
          type="button"
          onClick={openJobboard}
          className="w-full glass card-shine rounded-2xl px-4 py-2.5 flex items-center gap-2.5 text-left hover:bg-white/[0.03] transition-colors"
        >
          <Lock className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <p className="flex-1 min-w-0 text-[11px] text-gray-400 truncate">
            <span className="text-white font-semibold">{nextJob.emoji} {nextJob.label}</span>
            {" "}— fehlt noch: {nextJob.missing.map(m => (m.need > 1 ? `${m.need}× ${m.label}` : m.label)).join(", ")}
          </p>
          <span className="text-[11px] text-teal-400 shrink-0">Jobbörse →</span>
        </button>
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
              onClick={openJobboard}
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
        onClose={closeOverlay}
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
        onClose={closeOverlay}
        displayName={core.displayName}
        readOnly={readOnly}
        vitrine={core.vitrine}
        onSlotClick={setOpenSlotIndex}
      />

      <VitrineSlotModal
        key={openSlotIndex ?? "none"}
        open={openTarget === "vitrine" && openSlotIndex !== null}
        onClose={closeOverlay}
        slotIndex={openSlotIndex}
        item={openSlotIndex !== null ? core.vitrine.slots[openSlotIndex] ?? null : null}
        readOnly={readOnly}
        details={details}
      />

      <JobBoardSheet
        open={openTarget === "jobboard"}
        onClose={closeOverlay}
        readOnly={readOnly}
        onChanged={() => { /* die Sheet aktualisiert sich selbst und ruft router.refresh() */ }}
      />
    </>
  );
}
