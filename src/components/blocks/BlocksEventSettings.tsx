"use client";
// ============================================
// OMA Blocks — Event-Einstellungen: Live-Turnier (Gruppen + Finale) oder Community-Challenge
// ============================================
// Gemeinsam genutzt vom Event-Assistenten und vom Event-Editor (Admin). Styles kommen vom Aufrufer,
// damit sich der Block in beide Formulare einfügt.

import type { CSSProperties } from "react";
import { ADVANCE_LIMITS, ROUND_LIMITS } from "@/lib/blocks/tournament-shared";
import type { BlocksEventConfig } from "@/lib/blocks/event-config";

export interface BlocksEventSettingsProps {
  value: BlocksEventConfig;
  onChange: (next: BlocksEventConfig) => void;
  /** Art steht fest (es gibt schon ein Turnier bzw. eine Challenge) */
  kindLocked?: boolean;
  /** Grund, warum die Werte nicht mehr änderbar sind (Turnier läuft, Challenge abgerechnet) — null = änderbar */
  lockedReason?: string | null;
  /** Check-in nur im Assistenten — im Editor gibt es dafür den Turnier-Reiter */
  checkIn?: { enabled: boolean; setEnabled: (v: boolean) => void; minutes: number; setMinutes: (v: number) => void };
  inputCls: string;
  labelCls: string;
  inputStyle?: CSSProperties;
}

export default function BlocksEventSettings({
  value: blocks, onChange, kindLocked = false, lockedReason = null, checkIn, inputCls, labelCls, inputStyle,
}: BlocksEventSettingsProps) {
  const set = (patch: Partial<BlocksEventConfig>) => onChange({ ...blocks, ...patch });
  const num = (v: string) => (v === "" ? 0 : Number(v));
  const disabled = !!lockedReason;
  const field = (label: string, key: keyof BlocksEventConfig, min: number, max?: number) => (
    <div>
      <label className={labelCls}>{label}</label>
      <input
        type="number" min={min} max={max} value={blocks[key] as number} disabled={disabled}
        onChange={(e) => set({ [key]: num(e.target.value) } as Partial<BlocksEventConfig>)}
        className={`${inputCls} disabled:opacity-50`} style={inputStyle}
      />
    </div>
  );

  return (
    <div className="rounded-xl p-3 space-y-3" style={{ background: "rgba(45,212,191,0.06)", border: "1px solid rgba(45,212,191,0.2)" }}>
      <p className="text-xs font-semibold text-teal-300">OMA Blocks Event</p>
      <div className="grid grid-cols-2 gap-2">
        {([
          ["tournament", "Live-Turnier", "Gruppen + Finale zu fester Uhrzeit"],
          ["challenge", "Community-Challenge", "Gemeinsames Ziel im Zeitraum"],
        ] as const).map(([kind, label, hint]) => (
          <button
            key={kind}
            type="button"
            disabled={kindLocked && blocks.kind !== kind}
            onClick={() => set({ kind })}
            className={`rounded-xl p-2.5 text-left border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${blocks.kind === kind ? "border-teal-500/60 bg-teal-500/10" : "border-white/8 bg-white/3 hover:border-white/15"}`}
          >
            <span className="block text-sm font-semibold text-white">{label}</span>
            <span className="block text-[11px] text-gray-500">{hint}</span>
          </button>
        ))}
      </div>
      {kindLocked && <p className="text-[11px] text-gray-500">Die Art lässt sich nach dem Anlegen nicht mehr wechseln.</p>}
      {lockedReason && <p className="text-[11px] text-amber-300">{lockedReason}</p>}

      {blocks.kind === "tournament" ? (
        <>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Zur Startzeit lost die Turnierleitung auf der Event-Seite alle angemeldeten (bzw. eingecheckten) Spieler auf
            Gruppen à max. 8 aus. Die Runden laufen im Versus-Modus automatisch, Punkte je Runde nach Platz
            (10/7/5/3/2/1). Die Besten jeder Gruppe spielen das Finale. Bei bis zu 8 Spielern gibt es direkt nur das Finale.
            Den Endstand übernimmt der normale Event-Abschluss — dort gelten die Platzierungsbelohnungen des Events.
          </p>
          <div className="grid grid-cols-3 gap-3">
            {field("Runden Vorrunde", "groupRounds", ROUND_LIMITS.min, ROUND_LIMITS.max)}
            {field("Runden Finale", "finalRounds", ROUND_LIMITS.min, ROUND_LIMITS.max)}
            {field("Ins Finale je Gruppe", "advancePerGroup", ADVANCE_LIMITS.min, ADVANCE_LIMITS.max)}
          </div>
          <p className="text-[11px] text-gray-500">Das Finale hat max. 8 Plätze — bei vielen Gruppen kommen automatisch weniger je Gruppe weiter.</p>
          {checkIn && (
            <label className="flex items-center gap-2 text-sm text-gray-200 flex-wrap">
              <input type="checkbox" checked={checkIn.enabled} onChange={(e) => checkIn.setEnabled(e.target.checked)} className="accent-teal-400" />
              Check-in vor dem Start
              {checkIn.enabled && (
                <>
                  <input type="number" min={5} max={180} value={checkIn.minutes}
                    onChange={(e) => checkIn.setMinutes(Number(e.target.value))}
                    className={`${inputCls} !w-20 !py-1`} style={inputStyle} />
                  <span className="text-gray-400 text-xs">Min. vorher — nur Eingecheckte werden ausgelost</span>
                </>
              )}
            </label>
          )}
        </>
      ) : (
        <>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            Zwischen Start und Ende zählen alle gewerteten Solo-Läufe aller Spieler auf ein gemeinsames Ziel — keine
            Anmeldung nötig. Wird das Ziel erreicht, bekommt jeder mit Mindestbeitrag die Belohnung (automatisch nach dem Ende).
            Ein Ende ist Pflicht.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Zählt</label>
              <select value={blocks.metric} disabled={disabled} onChange={(e) => set({ metric: e.target.value === "score" ? "score" : "lines" })}
                className={`${inputCls} disabled:opacity-50`} style={inputStyle}>
                <option value="lines">Linien</option>
                <option value="score">Punkte</option>
              </select>
            </div>
            {field("Ziel *", "goal", 1)}
            {field("Mindestbeitrag", "minContribution", 1)}
            {field("Belohnung Münzen", "rewardCoins", 0)}
            {field("Belohnung Rang-Punkte", "rewardRankPoints", 0)}
          </div>
        </>
      )}
    </div>
  );
}
