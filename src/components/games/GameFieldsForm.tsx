"use client";

import type { ReactNode } from "react";
import { NumberInput } from "@/components/ui/NumberInput";
import type { FieldSources, GameFields } from "@/lib/games/draft";
import {
  GAME_GENRES, GAME_MODES, GAME_PLATFORMS, GAME_TAGS, MAX_GAME_DESCRIPTION_LENGTH, MAX_PLAYERS_LIMIT, SESSION_LENGTHS,
} from "@/lib/games/options";

export function Chip({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
        active
          ? "bg-teal-500/20 border-teal-400/60 text-teal-100"
          : "border-white/[0.08] text-gray-300 hover:border-teal-500/40 hover:bg-teal-500/10"
      }`}
    >
      {children}
    </button>
  );
}

function SourceBadge({ source }: { source?: "steam" | "user" }) {
  if (source !== "steam") return null;
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
      von Steam
    </span>
  );
}

function Section({ label, hint, source, children }: { label: string; hint?: string; source?: "steam" | "user"; children: ReactNode }) {
  return (
    <fieldset className="space-y-2">
      <legend className="flex items-center gap-2 text-xs font-semibold text-gray-300 mb-2">
        {label}
        <SourceBadge source={source} />
        {hint && <span className="font-normal text-gray-600">{hint}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

function toggle<T extends string>(list: T[], key: T, order: readonly string[]): T[] {
  const next = list.includes(key) ? list.filter(k => k !== key) : [...list, key];
  return next.sort((a, b) => order.indexOf(a) - order.indexOf(b));
}

function MultiChips<T extends string>({ options, value, onChange }: {
  options: Record<T, string>; value: T[]; onChange: (v: T[]) => void;
}) {
  const keys = Object.keys(options) as T[];
  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map(k => (
        <Chip key={k} active={value.includes(k)} onClick={() => onChange(toggle(value, k, keys))}>{options[k]}</Chip>
      ))}
    </div>
  );
}

const parseCount = (v: string): number | null => {
  if (v.trim() === "") return null;
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? Math.min(n, MAX_PLAYERS_LIMIT) : null;
};

/**
 * Angaben eines Spiels als antippbare Chips statt Textfelder. Alles ist optional — "weiß ich nicht"
 * heißt einfach: nichts auswählen. `sources` markiert Werte, die Steam vorausgefüllt hat.
 */
export default function GameFieldsForm({
  value, onChange, sources = {}, showDescription = false,
}: {
  value: GameFields;
  onChange: (next: GameFields) => void;
  sources?: FieldSources;
  showDescription?: boolean;
}) {
  const set = <K extends keyof GameFields>(key: K, v: GameFields[K]) => onChange({ ...value, [key]: v });
  const inputClass = "w-20 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";

  return (
    <div className="space-y-5">
      <Section label="Spielmodus" source={sources.modes}>
        <MultiChips options={GAME_MODES} value={value.modes} onChange={v => set("modes", v)} />
      </Section>

      <Section label="Spieleranzahl" hint="leer lassen, wenn unbekannt" source={sources.minPlayers ?? sources.maxPlayers}>
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <label className="flex items-center gap-2">
            von
            <NumberInput
              min={1} max={MAX_PLAYERS_LIMIT} inputMode="numeric" placeholder="?" aria-label="Mindestens Spieler"
              value={value.minPlayers?.toString() ?? ""} onChange={e => set("minPlayers", parseCount(e.target.value))} className={inputClass}
            />
          </label>
          <label className="flex items-center gap-2">
            bis
            <NumberInput
              min={1} max={MAX_PLAYERS_LIMIT} inputMode="numeric" placeholder="?" aria-label="Höchstens Spieler"
              value={value.maxPlayers?.toString() ?? ""} onChange={e => set("maxPlayers", parseCount(e.target.value))} className={inputClass}
            />
          </label>
          <span>Spieler</span>
        </div>
      </Section>

      <Section label="Plattformen" source={sources.platforms}>
        <MultiChips options={GAME_PLATFORMS} value={value.platforms} onChange={v => set("platforms", v)} />
        <label className="flex items-center gap-2 text-xs text-gray-300 pt-1 cursor-pointer w-fit">
          <input type="checkbox" checked={value.crossplay} onChange={e => set("crossplay", e.target.checked)} className="accent-teal-500 w-4 h-4" />
          Crossplay (plattformübergreifend)
          <SourceBadge source={sources.crossplay} />
        </label>
      </Section>

      <Section label="Kosten" source={sources.isFree}>
        <div className="flex flex-wrap gap-1.5">
          <Chip active={value.isFree === true} onClick={() => set("isFree", value.isFree === true ? null : true)}>Kostenlos</Chip>
          <Chip active={value.isFree === false} onClick={() => set("isFree", value.isFree === false ? null : false)}>Kostenpflichtig</Chip>
        </div>
      </Section>

      <Section label="Genre" source={sources.genres}>
        <MultiChips options={GAME_GENRES} value={value.genres} onChange={v => set("genres", v)} />
      </Section>

      <Section label="Rundenlänge" source={sources.sessionLength}>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(SESSION_LENGTHS) as (keyof typeof SESSION_LENGTHS)[]).map(k => (
            <Chip key={k} active={value.sessionLength === k} onClick={() => set("sessionLength", value.sessionLength === k ? null : k)}>
              {SESSION_LENGTHS[k]}
            </Chip>
          ))}
        </div>
      </Section>

      <Section label="Passt gut für …" source={sources.tags}>
        <MultiChips options={GAME_TAGS} value={value.tags} onChange={v => set("tags", v)} />
      </Section>

      {showDescription && (
        <Section label="Kurzbeschreibung" source={sources.description}>
          <textarea
            value={value.description ?? ""}
            onChange={e => set("description", e.target.value.slice(0, MAX_GAME_DESCRIPTION_LENGTH) || null)}
            rows={3}
            placeholder="Worum geht's? (optional)"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40"
          />
        </Section>
      )}
    </div>
  );
}
