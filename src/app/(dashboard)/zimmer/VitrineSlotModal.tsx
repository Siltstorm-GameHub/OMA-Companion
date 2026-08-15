"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Wand2 } from "lucide-react";
import { Modal } from "@/components/ui";
import { getPokalCategoryLabel } from "@/lib/pokal";
import { getScopeTitle } from "@/lib/wanderpocal";
import { encodePokalValue, encodeTrophyValue, encodeBadgeValue, type VitrineItem } from "@/lib/room-vitrine";
import type { RoomProfileDetails } from "@/lib/room-profile-data";

interface Props {
  open:        boolean;
  onClose:     () => void;
  slotIndex:   number | null;
  item:        VitrineItem | null;
  readOnly:    boolean;
  details:     RoomProfileDetails;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" });

/**
 * Ein Vitrinen-Fach im Detail: zeigt, was dort steht (woher, wann, wieso),
 * und lässt den Besitzer (readOnly=false) auswählen, was stattdessen dort
 * ausgestellt werden soll — ein beliebiger digitaler Pokal, Wanderpokal oder
 * Abzeichen, unabhängig von der Reihe, in der das Fach steht.
 */
export default function VitrineSlotModal({ open, onClose, slotIndex, item, readOnly, details }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"detail" | "pick">(item ? "detail" : "pick");
  const [saving, setSaving] = useState(false);

  if (slotIndex === null) return null;

  async function apply(body: { mode: "set"; value: string } | { mode: "clear" } | { mode: "auto" }) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/vitrine-slots", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ slot: slotIndex, ...body }),
      });
      if (res.ok) {
        router.refresh();
        onClose();
      } else {
        toast.error((await res.json()).error ?? "Fehler");
      }
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "pick" ? "Fach belegen" : itemTitle(item);

  return (
    <Modal open={open} onClose={onClose} size="sm" title={title}>
      {mode === "detail" && item ? (
        <div className="space-y-4">
          <ItemDetail item={item} />
          {!readOnly && (
            <div className="flex gap-2 justify-end pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => apply({ mode: "clear" })}
                disabled={saving}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-300 disabled:opacity-50 px-3 py-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Fach leeren
              </button>
              <button
                onClick={() => setMode("pick")}
                disabled={saving}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-medium px-4 py-1.5 rounded-xl transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Ändern
              </button>
            </div>
          )}
        </div>
      ) : (
        <SlotPicker
          details={details}
          saving={saving}
          onPick={value => apply({ mode: "set", value })}
          onAuto={() => apply({ mode: "auto" })}
          onClear={() => apply({ mode: "clear" })}
        />
      )}
    </Modal>
  );
}

function itemTitle(item: VitrineItem | null): string {
  if (!item) return "Fach";
  if (item.kind === "pokal") return `🏆 ${item.title}`;
  if (item.kind === "trophy") return `🏆 ${getScopeTitle(item.scopeType, item.scopeValue)}`;
  return `${item.icon} ${item.name}`;
}

function ItemDetail({ item }: { item: VitrineItem }) {
  if (item.kind === "pokal") {
    return (
      <dl className="space-y-2 text-sm">
        <Row label="Kategorie" value={getPokalCategoryLabel(item.category as Parameters<typeof getPokalCategoryLabel>[0])} />
        <Row label="Art" value={item.isSeries ? "Eventreihen-Pokal" : "Einzel-Event-Pokal"} />
        <Row label="Verliehen am" value={fmtDate(item.awardedAt)} />
        <p className="text-xs text-gray-500 pt-1">
          Verliehen für die Teilnahme/den Sieg bei „{item.title}“.
        </p>
      </dl>
    );
  }
  if (item.kind === "trophy") {
    return (
      <dl className="space-y-2 text-sm">
        <Row label="Kategorie" value={getScopeTitle(item.scopeType, item.scopeValue)} />
        <Row label="Gehalten seit" value={fmtDate(item.heldSince)} />
        <Row label="Siege in Folge" value={String(item.winCount)} />
        <p className="text-xs text-gray-500 pt-1">
          Wanderpokal — wandert zum jeweils aktuellen Bestplatzierten dieser Kategorie/dieses Genres weiter.
        </p>
      </dl>
    );
  }
  return (
    <dl className="space-y-2 text-sm">
      <Row label="Beschreibung" value={item.desc || "—"} />
      {item.earnedAt && <Row label="Verdient am" value={fmtDate(item.earnedAt)} />}
      <Row label="Typ" value={item.custom ? "Besondere Leistung" : "System-Abzeichen"} />
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-gray-200 text-right">{value}</dd>
    </div>
  );
}

function SlotPicker({
  details, saving, onPick, onAuto, onClear,
}: {
  details: RoomProfileDetails;
  saving:  boolean;
  onPick:  (value: string) => void;
  onAuto:  () => void;
  onClear: () => void;
}) {
  const earnedSystemBadges = details.badges.filter(b => b.earned);

  return (
    <div className="space-y-5 max-h-[60vh] overflow-y-auto">
      <div className="flex gap-2">
        <button onClick={onAuto} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 rounded-xl px-3 py-2 disabled:opacity-50">
          <Wand2 className="w-3.5 h-3.5" /> Automatisch
        </button>
        <button onClick={onClear} disabled={saving}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-white border border-white/10 rounded-xl px-3 py-2 disabled:opacity-50">
          <Trash2 className="w-3.5 h-3.5" /> Leer lassen
        </button>
      </div>

      {details.pokale.length > 0 && (
        <PickerSection title="Pokale">
          {details.pokale.map(p => (
            <PickerOption key={p.id} icon="🏆" label={p.title}
              onClick={() => onPick(encodePokalValue(p.id))} disabled={saving} />
          ))}
        </PickerSection>
      )}

      {details.trophies.length > 0 && (
        <PickerSection title="Wanderpokale">
          {details.trophies.map(t => (
            <PickerOption key={`${t.scopeType}:${t.scopeValue}`} icon="🏆"
              label={getScopeTitle(t.scopeType, t.scopeValue)}
              onClick={() => onPick(encodeTrophyValue(t.scopeType, t.scopeValue))} disabled={saving} />
          ))}
        </PickerSection>
      )}

      {(earnedSystemBadges.length > 0 || details.customBadges.length > 0) && (
        <PickerSection title="Abzeichen">
          {earnedSystemBadges.map(b => (
            <PickerOption key={b.id} icon={b.icon} label={b.name}
              onClick={() => onPick(encodeBadgeValue(b.id))} disabled={saving} />
          ))}
          {details.customBadges.map(b => (
            <PickerOption key={b.id} icon={b.icon} label={b.name}
              onClick={() => onPick(encodeBadgeValue(`custom:${b.id}`))} disabled={saving} />
          ))}
        </PickerSection>
      )}

      {details.pokale.length === 0 && details.trophies.length === 0 &&
        earnedSystemBadges.length === 0 && details.customBadges.length === 0 && (
        <p className="text-xs text-gray-500 text-center py-4">
          Noch nichts zum Ausstellen vorhanden.
        </p>
      )}
    </div>
  );
}

function PickerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] text-gray-600 uppercase tracking-widest">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PickerOption({
  icon, label, onClick, disabled,
}: {
  icon: string; label: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium border-white/10 bg-white/[0.02] text-gray-300 hover:border-purple-500/40 hover:text-purple-300 transition-all disabled:opacity-50"
    >
      <span>{icon}</span> {label}
    </button>
  );
}
