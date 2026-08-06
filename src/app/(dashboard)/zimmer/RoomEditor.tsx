"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Save, X, Loader2, FlipHorizontal2, PackageOpen, Package, Lock, Paintbrush,
} from "lucide-react";
import { getRoomItem, isFixed, isSurface, ROOM_ITEMS, type RoomZone } from "@/lib/room-items";
import { legalCells, type PlacedItem, type RoomState, type StoredItem } from "@/lib/room-layout";
import type { RoomProfileCore } from "@/lib/room-profile-data";
import RoomStage from "./RoomStage";
import { RoomItemPreview } from "./RoomItemSprite";
import { cn } from "@/lib/utils";

interface Props {
  state:  RoomState;
  core:   RoomProfileCore;
  /** Besitzstand je itemKey — entscheidet, welche Tapeten/Böden wählbar sind. */
  owned:  Record<string, number>;
  onDone: () => void;
}

/** Was gerade angehoben ist: entweder aus dem Raum oder aus dem Lager. */
type Selection = { id: string; from: "placed" | "stored" } | null;

/**
 * Einrichten per Antippen: Möbelstück antippen, freie Plätze leuchten auf,
 * Zielzelle antippen. Bewusst kein Drag & Drop — Ziehen auf einer vollbreiten
 * Fläche kämpft auf dem Handy mit dem Seiten-Scroll, und Antippen funktioniert
 * auf Maus und Finger identisch.
 *
 * Alles passiert auf einem Entwurf; erst "Speichern" schickt ihn zum Server,
 * der dieselben Regeln noch einmal prüft.
 */
export default function RoomEditor({ state, core, owned, onDone }: Props) {
  const router = useRouter();

  const [placed,   setPlaced]   = useState<PlacedItem[]>(state.placed);
  const [stored,   setStored]   = useState<StoredItem[]>(state.stored);
  const [wallpaper, setWallpaper] = useState(state.wallpaperKey);
  const [floor,     setFloor]     = useState(state.floorKey);
  const [selection, setSelection] = useState<Selection>(null);
  const [saving,    setSaving]    = useState(false);
  const [showSurfaces, setShowSurfaces] = useState(false);

  const dirty =
    JSON.stringify(placed) !== JSON.stringify(state.placed) ||
    JSON.stringify(stored) !== JSON.stringify(state.stored) ||
    wallpaper !== state.wallpaperKey ||
    floor !== state.floorKey;

  /** Das angehobene Möbelstück als PlacedItem-Kandidat. */
  const candidate = useMemo<PlacedItem | null>(() => {
    if (!selection) return null;
    if (selection.from === "placed") return placed.find(p => p.id === selection.id) ?? null;
    const s = stored.find(i => i.id === selection.id);
    if (!s) return null;
    const def = getRoomItem(s.key);
    if (!def) return null;
    return { id: s.id, key: s.key, zone: def.zone, x: 0, y: 0, flipped: false, starter: false };
  }, [selection, placed, stored]);

  /** Freie Plätze — dieselbe Regel-Implementierung, die auch der Server nutzt. */
  const legal = useMemo(() => {
    if (!candidate) return [];
    const others = placed.filter(p => p.id !== candidate.id);
    return legalCells(others, candidate).map(c => ({ zone: candidate.zone, x: c.x, y: c.y }));
  }, [candidate, placed]);

  const ghost = useMemo(() => {
    if (!candidate) return null;
    const def = getRoomItem(candidate.key);
    return def ? { w: def.w, h: def.h, key: candidate.key } : null;
  }, [candidate]);

  const selectedDef = candidate ? getRoomItem(candidate.key) : null;

  function handleSelect(id: string) {
    setSelection(prev => (prev?.id === id ? null : { id, from: "placed" }));
  }

  /** Ziehen mit der Maus: wählt an, ohne je abzuwählen — anders als Antippen. */
  function handleGrab(id: string) {
    setSelection({ id, from: "placed" });
  }

  function handleDrop(zone: RoomZone, x: number, y: number) {
    if (!candidate) return;
    if (selection?.from === "stored") {
      setStored(s => s.filter(i => i.id !== candidate.id));
      setPlaced(p => [...p, { ...candidate, zone, x, y }]);
      setSelection({ id: candidate.id, from: "placed" });
    } else {
      setPlaced(p => p.map(i => (i.id === candidate.id ? { ...i, zone, x, y } : i)));
    }
  }

  function flip() {
    if (!candidate || selection?.from !== "placed") return;
    setPlaced(p => p.map(i => (i.id === candidate.id ? { ...i, flipped: !i.flipped } : i)));
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
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/room/layout", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          placed: placed.map(p => ({ id: p.id, zone: p.zone, x: p.x, y: p.y, flipped: p.flipped })),
          stored: stored.map(s => s.id),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }

      if (wallpaper !== state.wallpaperKey || floor !== state.floorKey) {
        const surf = await fetch("/api/room/surfaces", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ wallpaperKey: wallpaper, floorKey: floor }),
        });
        if (!surf.ok) {
          const d = await surf.json().catch(() => ({}));
          toast.error(d.error ?? "Tapete/Boden konnten nicht gesetzt werden");
          return;
        }
      }

      toast.success("Zimmer gespeichert");
      router.refresh();
      onDone();
    } catch {
      toast.error("Netzwerkfehler");
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    if (dirty && !confirm("Änderungen verwerfen?")) return;
    onDone();
  }

  const draftState: RoomState = { ...state, placed, stored, wallpaperKey: wallpaper, floorKey: floor };

  return (
    <div className="space-y-3">
      <RoomStage
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

      {/* ── Tapete & Boden ──────────────────────────────────────────── */}
      <div className="glass rounded-2xl px-4 py-3">
        <button
          type="button"
          onClick={() => setShowSurfaces(v => !v)}
          aria-expanded={showSurfaces}
          className="w-full flex items-center gap-2 text-left"
        >
          <Paintbrush className="w-3.5 h-3.5 text-gray-500" />
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex-1">
            Tapete &amp; Boden
          </p>
          <span className="text-[11px] text-gray-600">{showSurfaces ? "Schließen" : "Ändern"}</span>
        </button>

        {showSurfaces && (
          <div className="mt-3 space-y-3">
            <SurfaceRow
              label="Tapete" category="tapete" owned={owned}
              value={wallpaper} onChange={setWallpaper}
            />
            <SurfaceRow
              label="Boden" category="bodenbelag" owned={owned}
              value={floor} onChange={setFloor}
            />
          </div>
        )}
      </div>

      {/* ── Speichern / Abbrechen ───────────────────────────────────── */}
      <div className="sticky bottom-20 lg:bottom-4 z-30 safe-area-pb">
        <div className="glass-heavy rounded-2xl p-2 flex items-center gap-2">
          <button
            type="button" onClick={cancel} disabled={saving}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                       bg-white/[0.05] border border-white/[0.08] text-gray-300 hover:bg-white/[0.1] transition-colors disabled:opacity-50"
          >
            <X className="w-3.5 h-3.5" /> Abbrechen
          </button>
          <button
            type="button" onClick={save} disabled={saving || !dirty}
            className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold
                       bg-teal-500/20 border border-teal-500/30 text-teal-200 hover:bg-teal-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Speichert…" : dirty ? "Speichern" : "Nichts geändert"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SurfaceRow({
  label, category, owned, value, onChange,
}: {
  label: string; category: "tapete" | "bodenbelag";
  owned: Record<string, number>; value: string; onChange: (key: string) => void;
}) {
  // Grundausstattung (Preis 0) besitzt jeder, alles andere muss gekauft sein.
  const options = ROOM_ITEMS.filter(
    i => isSurface(i) && i.category === category && (i.price === 0 || (owned[i.key] ?? 0) > 0)
  );

  return (
    <div>
      <p className="text-[11px] text-gray-500 mb-1.5">{label}</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
        {options.map(def => (
          <button
            key={def.key} type="button" onClick={() => onChange(def.key)}
            aria-pressed={value === def.key}
            className={cn(
              "shrink-0 w-20 rounded-xl border p-2 flex flex-col items-center gap-1 transition-colors",
              value === def.key ? "border-teal-500/50 bg-teal-500/10" : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
            )}
          >
            <RoomItemPreview itemKey={def.key} size={38} />
            <span className="text-[9px] text-gray-400 leading-tight text-center line-clamp-2">{def.label}</span>
          </button>
        ))}
      </div>
      {options.length === 1 && (
        <p className="text-[10px] text-gray-600 mt-1">Weitere gibt es im Shop.</p>
      )}
    </div>
  );
}
