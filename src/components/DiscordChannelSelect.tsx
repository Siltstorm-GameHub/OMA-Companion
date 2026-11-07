"use client";

// Echte Kanalauswahl statt roh eingetippter Kanal-ID. Lädt die Text-/Ankündigungskanäle des
// Servers einmal pro Seitenaufruf (geteilter Promise-Cache, auch bei vielen Feldern auf einer Seite)
// und gruppiert sie nach Discord-Kategorie. Ist Discord nicht erreichbar oder nicht konfiguriert,
// fällt das Feld auf die bisherige Texteingabe zurück — eine gespeicherte ID geht nie verloren.

import { useEffect, useState } from "react";

export interface DiscordChannelOption { id: string; name: string; category: string | null }

let channelsPromise: Promise<DiscordChannelOption[]> | null = null;

function loadChannels(): Promise<DiscordChannelOption[]> {
  if (!channelsPromise) {
    channelsPromise = fetch("/api/community-jobs/discord-channels")
      .then((r) => (r.ok ? r.json() : { channels: [] }))
      .then((d: { channels?: DiscordChannelOption[] }) => d.channels ?? [])
      .catch(() => []);
    // Fehlschlag nicht dauerhaft cachen — beim nächsten Öffnen erneut versuchen
    channelsPromise.then((list) => { if (list.length === 0) channelsPromise = null; });
  }
  return channelsPromise;
}

/** Anzeigename "#kanal" zu einer ID, sobald die Kanalliste geladen ist (sonst die ID). */
export function useDiscordChannelName(id: string | null | undefined): string | null {
  const [channels, setChannels] = useState<DiscordChannelOption[]>([]);
  useEffect(() => { if (id) loadChannels().then(setChannels); }, [id]);
  if (!id) return null;
  const c = channels.find((x) => x.id === id);
  return c ? `#${c.name}` : id;
}

type Props = {
  value: string | null | undefined;
  onChange: (id: string) => void;
  /** Text der leeren Option, z.B. "Standard: News-Kanal" oder "Wie Eventreihe (#turniere)". */
  emptyLabel?: string;
  className?: string;
  disabled?: boolean;
};

export default function DiscordChannelSelect({ value, onChange, emptyLabel = "Standard", className, disabled }: Props) {
  const [channels, setChannels] = useState<DiscordChannelOption[] | null>(null);
  const [manual, setManual] = useState(false);

  useEffect(() => { loadChannels().then(setChannels); }, []);

  const current = value?.trim() ?? "";
  const baseCls = `w-full rounded-lg px-3 py-1.5 text-xs text-white bg-gray-800/80 border border-white/[0.06] focus:border-indigo-500/40 outline-none transition-colors ${className ?? ""}`;

  // Fallback: Liste (noch) nicht da, leer oder bewusst manuelle Eingabe
  if (manual || (channels !== null && channels.length === 0)) {
    return (
      <div className="flex items-center gap-2">
        <input
          value={current}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder={`${emptyLabel} — Kanal-ID eingeben`}
          disabled={disabled}
          className={`${baseCls} placeholder:text-gray-600`}
        />
        {manual && channels && channels.length > 0 && (
          <button type="button" onClick={() => setManual(false)} className="text-[10px] text-gray-500 hover:text-gray-300 shrink-0">
            Liste
          </button>
        )}
      </div>
    );
  }

  const known = channels?.some((c) => c.id === current) ?? false;
  const groups = new Map<string, DiscordChannelOption[]>();
  for (const c of channels ?? []) {
    const k = c.category ?? "Ohne Kategorie";
    groups.set(k, [...(groups.get(k) ?? []), c]);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || channels === null}
        className={`${baseCls} cursor-pointer`}
      >
        <option value="">{channels === null ? "Kanäle werden geladen…" : emptyLabel}</option>
        {current && !known && channels !== null && (
          <option value={current}>⚠️ Unbekannter Kanal ({current})</option>
        )}
        {[...groups.entries()].map(([cat, list]) => (
          <optgroup key={cat} label={cat}>
            {list.map((c) => <option key={c.id} value={c.id}>#{c.name}</option>)}
          </optgroup>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setManual(true)}
        title="Kanal-ID von Hand eingeben"
        className="text-[10px] text-gray-500 hover:text-gray-300 shrink-0"
      >
        ID
      </button>
    </div>
  );
}
