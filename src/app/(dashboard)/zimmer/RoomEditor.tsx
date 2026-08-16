"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, FlipHorizontal2, RotateCw, PackageOpen, Package, Lock, Check,
} from "lucide-react";
import { getRoomItem, isFixed } from "@/lib/room-items";
import { legalCells, type PlacedItem, type RoomState, type RoomSurface, type StoredItem } from "@/lib/room-layout";
import type { RoomProfileCore } from "@/lib/room-profile-data";
import { RoomItemPreview } from "./RoomItemSprite";
import { cn } from "@/lib/utils";

// Three.js/R3F laufen ausschließlich im Browser (WebGL-Kontext) — per
// dynamic(ssr:false) geladen, siehe RoomView.tsx.
const RoomStage3D = dynamic(() => import("./RoomStage3D"), {
  ssr: false,
  loading: () => <div className="w-full aspect-[6/5] rounded-2xl bg-[#141018] animate-pulse" />,
});

interface Props {
  state:  RoomState;
  core:   RoomProfileCore;
  /** Nicht mehr genutzt (Tapete/Boden werden jetzt automatisch mit der
   *  Zimmerstufe hochgestuft, keine Kauf-/Auswahl-UI mehr) — Typ bleibt, damit
   *  bestehende Aufrufer (RoomView.tsx) ohne Anpassung weiter kompilieren. */
  owned?: Record<string, number>;
  onDone: () => void;
}

/** Was gerade angehoben ist: entweder aus dem Raum oder aus dem Lager. */
type Selection = { id: string; from: "placed" | "stored" } | null;

/** Debounce, bevor eine Änderung tatsächlich zum Server geschickt wird —
 *  fasst mehrere schnelle Taps (z.B. Platzieren + direkt danach Drehen) in
 *  einem Request zusammen, statt bei jedem einzelnen Klick zu speichern. */
const AUTOSAVE_DEBOUNCE_MS = 600;

/**
 * Einrichten per Antippen: Möbelstück antippen, freie Plätze leuchten auf,
 * Zielzelle antippen. Bewusst kein Drag & Drop — Ziehen auf einer vollbreiten
 * Fläche kämpft auf dem Handy mit dem Seiten-Scroll, und Antippen funktioniert
 * auf Maus und Finger identisch.
 *
 * Jede Änderung landet SOFORT (debounced) auf dem Server — kein separater
 * Speichern-/Verwerfen-Schritt mehr. Ein aufgestelltes Objekt bleibt danach
 * nicht "in der Hand": wer es weiter verschieben will, tippt es erneut an.
 */
export default function RoomEditor({ state, core, onDone }: Props) {
  const router = useRouter();

  const [placed,   setPlaced]   = useState<PlacedItem[]>(state.placed);
  const [stored,   setStored]   = useState<StoredItem[]>(state.stored);
  const [selection, setSelection] = useState<Selection>(null);
  const [saving,    setSaving]    = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest    = useRef({ placed, stored });
  useEffect(() => { latest.current = { placed, stored }; }, [placed, stored]);

  /** Das angehobene Möbelstück als PlacedItem-Kandidat. */
  const candidate = useMemo<PlacedItem | null>(() => {
    if (!selection) return null;
    if (selection.from === "placed") return placed.find(p => p.id === selection.id) ?? null;
    const s = stored.find(i => i.id === selection.id);
    if (!s) return null;
    const def = getRoomItem(s.key);
    if (!def) return null;
    // Platzhalter-Fläche fürs erste Aufheben aus dem Lager — legalCells()
    // gleich danach berechnet ohnehin BEIDE Wände für Wand-Items, diese
    // Startfläche ist nur der Ausgangspunkt vor dem ersten echten Tap.
    const zone: RoomSurface = def.zone === "floor" ? "floor" : "wall_back";
    return { id: s.id, key: s.key, zone, x: 0, y: 0, flipped: false, rotation: 0, starter: false };
  }, [selection, placed, stored]);

  /** Freie Plätze — dieselbe Regel-Implementierung, die auch der Server nutzt. */
  const legal = useMemo(() => {
    if (!candidate) return [];
    const others = placed.filter(p => p.id !== candidate.id);
    // legalCells() liefert die Fläche pro Zelle selbst mit — bei Wand-Items
    // deckt das jetzt BEIDE Wände ab, nicht mehr nur `candidate.zone`.
    return legalCells(others, candidate);
  }, [candidate, placed]);

  const ghost = useMemo(() => {
    if (!candidate) return null;
    const def = getRoomItem(candidate.key);
    return def ? { w: def.w, h: def.h, key: candidate.key } : null;
  }, [candidate]);

  const selectedDef = candidate ? getRoomItem(candidate.key) : null;

  /** Schickt den aktuellen Stand debounced zum Server — bei jeder Änderung
   *  aufgerufen, kein manueller Speichern-Button mehr nötig. */
  function scheduleSave() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      saveTimer.current = null;
      setSaving(true);
      try {
        const { placed: p, stored: s } = latest.current;
        const res = await fetch("/api/room/layout", {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            placed: p.map(item => ({
              id: item.id, zone: item.zone, x: item.x, y: item.y,
              flipped: item.flipped, rotation: item.rotation,
            })),
            stored: s.map(i => i.id),
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
        router.refresh();
      } catch {
        toast.error("Netzwerkfehler — Änderung konnte nicht gespeichert werden");
      } finally {
        setSaving(false);
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }

  // Beim Verlassen der Seite mitten im Debounce-Fenster nicht die letzte
  // Änderung verlieren — sofort flushen statt auf den Timer zu warten.
  useEffect(() => () => {
    if (saveTimer.current) { clearTimeout(saveTimer.current); saveTimer.current = null; }
  }, []);

  function handleSelect(id: string) {
    setSelection(prev => (prev?.id === id ? null : { id, from: "placed" }));
  }

  /** Ziehen mit der Maus: wählt an, ohne je abzuwählen — anders als Antippen. */
  function handleGrab(id: string) {
    setSelection({ id, from: "placed" });
  }

  function handleDrop(zone: RoomSurface, x: number, y: number) {
    if (!candidate) return;
    if (selection?.from === "stored") {
      setStored(s => s.filter(i => i.id !== candidate.id));
      setPlaced(p => [...p, { ...candidate, zone, x, y }]);
    } else {
      // Kein automatisches Mitspiegeln beim Wandwechsel mehr: das war eine
      // Eigenheit der alten 2D-Foto-Sprite-Bühne (room-iso.ts, längst entfernt)
      // — echte 3D-Objekte richten sich über surfaceRotationY() an jeder der
      // vier Wände korrekt aus, ganz ohne Spiegelung. Die "Spiegeln"-Taste
      // (siehe flip() unten) bleibt als rein manuelle Fein-Justierung erhalten.
      setPlaced(p => p.map(i => (i.id === candidate.id ? { ...i, zone, x, y } : i)));
    }
    // Nach dem Platzieren nicht "in der Hand" behalten — wer weiter
    // verschieben will, tippt das Objekt erneut an.
    setSelection(null);
    scheduleSave();
  }

  function flip() {
    if (!candidate || selection?.from !== "placed") return;
    setPlaced(p => p.map(i => (i.id === candidate.id ? { ...i, flipped: !i.flipped } : i)));
    scheduleSave();
  }

  /** Nur für Boden-Objekte — Wand-Objekte richten sich schon automatisch an
   *  ihrer Wand aus (surfaceRotationY), eine Zusatzdrehung würde sie aus der
   *  Wandebene herausklappen. */
  function rotate() {
    if (!candidate || selection?.from !== "placed" || candidate.zone !== "floor") return;
    setPlaced(p => p.map(i => (i.id === candidate.id ? { ...i, rotation: (i.rotation + 1) % 4 } : i)));
    scheduleSave();
  }

  function toStorage() {
    if (!candidate || !selectedDef) return;
    if (isFixed(selectedDef)) {
      toast.error(`${selectedDef.label} kann nicht eingelagert werden`);
      return;
    }
    setPlaced(p => p.filter(i => i.id !== candidate.id));
    setStored(s => [...s, { id: candidate.id, key: candidate.key }]);
    setSelection(null);
    scheduleSave();
  }

  const draftState: RoomState = { ...state, placed, stored };

  return (
    <div className="space-y-3">
      <RoomStage3D
        state={draftState}
        ownerName={core.displayName}
        vitrine={core.vitrine}
        onInteract={() => { /* im Bearbeiten-Modus öffnet nichts */ }}
        edit={{
          selectedId: candidate?.id ?? null, legal, ghost,
          onSelect: handleSelect, onGrab: handleGrab, onDrop: handleDrop,
        }}
      />

      {/* ── Hinweiszeile / Aktionen zum angehobenen Stück ───────────── */}
      <div className="glass rounded-2xl px-4 py-3 flex items-center gap-3 flex-wrap min-h-[3.25rem]">
        {selectedDef ? (
          <>
            <div className="w-8 h-8 flex items-center justify-center shrink-0">
              <RoomItemPreview itemKey={selectedDef.key} size={30} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{selectedDef.label}</p>
              <p className="text-[11px] text-gray-500">
                {legal.length > 0
                  ? `${legal.length} freie Plätze — leuchtendes Feld antippen`
                  : "Kein freier Platz — erst etwas anderes wegräumen"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selection?.from === "placed" && (
                <>
                  {candidate?.zone === "floor" && (
                    <button type="button" onClick={rotate}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.1] transition-colors">
                      <RotateCw className="w-3.5 h-3.5" /> Drehen
                    </button>
                  )}
                  <button type="button" onClick={flip}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.1] transition-colors">
                    <FlipHorizontal2 className="w-3.5 h-3.5" /> Spiegeln
                  </button>
                  <button type="button" onClick={toStorage} disabled={isFixed(selectedDef)}
                    title={isFixed(selectedDef) ? "Fest eingebaut — wird für Profil, Sammlung oder Jobbörse gebraucht" : undefined}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.1] transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    {isFixed(selectedDef) ? <Lock className="w-3.5 h-3.5" /> : <PackageOpen className="w-3.5 h-3.5" />} Ins Lager
                  </button>
                </>
              )}
              <button type="button" onClick={() => setSelection(null)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-gray-300 transition-colors">
                Abwählen
              </button>
            </div>
          </>
        ) : (
          <p className="text-[11px] text-gray-500">
            Möbelstück antippen, um es anzuheben — oder unten eins aus dem Lager holen.
          </p>
        )}
      </div>

      {/* ── Lager ───────────────────────────────────────────────────── */}
      <div className="glass rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-3.5 h-3.5 text-gray-500" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
            Lager ({stored.length})
          </p>
        </div>
        {stored.length === 0 ? (
          <p className="text-[11px] text-gray-600">
            Leer. Gekaufte Möbel landen hier, bis du sie aufstellst.
          </p>
        ) : (
          <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
            {stored.map(item => {
              const def = getRoomItem(item.key);
              if (!def) return null;
              const active = selection?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelection(active ? null : { id: item.id, from: "stored" })}
                  aria-pressed={active}
                  className={cn(
                    "shrink-0 w-20 rounded-xl border p-2 flex flex-col items-center gap-1 transition-colors",
                    active ? "border-teal-500/50 bg-teal-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                  )}
                >
                  <RoomItemPreview itemKey={item.key} size={40} />
                  <span className="text-[9px] text-gray-400 leading-tight text-center line-clamp-2">{def.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Fertig ──────────────────────────────────────────────────── */}
      <div className="sticky bottom-20 lg:bottom-4 z-30 safe-area-pb">
        <div className="glass-heavy rounded-2xl p-2">
          <button
            type="button" onClick={onDone}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                       bg-teal-500/20 border border-teal-500/30 text-teal-200 hover:bg-teal-500/30 transition-colors"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Speichert…" : "Fertig"}
          </button>
        </div>
      </div>
    </div>
  );
}
