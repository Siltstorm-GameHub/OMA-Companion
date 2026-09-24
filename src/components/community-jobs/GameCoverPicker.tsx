"use client";
import { useEffect, useRef, useState } from "react";
import GameNameInput from "@/components/GameNameInput";
import { getGameCoverUrl, normalizeForCoverCache, pickedCoverCache } from "@/lib/game-cover";
import { isGameCoverUrl } from "@/lib/game-cover-url";

/**
 * Spiel-Cover statt eigenem Bild: Spiel per Name suchen (Steam-Suche wie überall in der App), das Cover erscheint als
 * Vorschau. `onChange` liefert Name + Cover-URL, solange ein Cover gefunden wurde — sonst null.
 */

export interface PickedGameCover { name: string; url: string }

export default function GameCoverPicker({ value, onChange }: { value: PickedGameCover | null; onChange: (v: PickedGameCover | null) => void }) {
  const [name, setName] = useState(value?.name ?? "");
  const [resolving, setResolving] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) { onChangeRef.current(null); setResolving(false); return; }
    if (value && value.name === name) return; // schon aufgelöst
    let cancelled = false;
    setResolving(true);
    const handle = setTimeout(async () => {
      // Exakt gewähltes Cover (Dropdown) hat Vorrang vor dem statischen Namens-Match und der Live-Suche.
      let url: string | null = pickedCoverCache.get(normalizeForCoverCache(trimmed)) ?? getGameCoverUrl(trimmed);
      if (!url) {
        try {
          const res = await fetch(`/api/game-cover?name=${encodeURIComponent(trimmed)}`);
          url = ((await res.json()) as { url: string | null }).url;
        } catch { url = null; }
      }
      if (cancelled) return;
      setResolving(false);
      onChangeRef.current(url && isGameCoverUrl(url) ? { name: trimmed, url } : null);
    }, 500);
    return () => { cancelled = true; clearTimeout(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur auf den eingegebenen Namen reagieren
  }, [name]);

  return (
    <div className="space-y-2">
      <GameNameInput value={name} onChange={setName}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      {value ? (
        <div className="rounded-lg overflow-hidden border border-white/10 bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element -- Cover von Steam/Xbox/… (bekannte Hosts) */}
          <img src={value.url} alt={`Cover: ${value.name}`} className="w-full max-h-52 object-cover" />
        </div>
      ) : name.trim().length >= 2 && !resolving ? (
        <p className="text-[11px] text-gray-500">Für dieses Spiel wurde kein Cover gefunden — bitte einen Treffer aus der Liste wählen.</p>
      ) : null}
    </div>
  );
}
