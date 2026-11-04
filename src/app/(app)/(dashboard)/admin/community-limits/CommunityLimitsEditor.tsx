"use client";
import { useState } from "react";
import type { CommunityLimitsConfig, SeasonRewardLimits } from "@/lib/community-event-limits";
import type { RewardLimits } from "@/lib/captain-reward-limits";
import { Save } from "@/components/icons";

type ScalarKey = Exclude<keyof RewardLimits, "placementCoins" | "placementRankPoints">;

const SCALAR_FIELDS: { key: ScalarKey; label: string }[] = [
  { key: "participationCoins",     label: "Teilnahme-Münzen" },
  { key: "participationRankPts",   label: "Teilnahme-Rang-Punkte" },
  { key: "placementCoinsOther",    label: "Münzen ab Platz 4" },
  { key: "spectatorCoins",         label: "Zuschauer-Münzen" },
  { key: "spectatorRankPoints",    label: "Zuschauer-Rang-Punkte" },
  { key: "pollParticipationCoins", label: "Umfrage: Münzen fürs Abstimmen" },
  { key: "pollWinnerCoins",        label: "Umfrage: Münzen für Gewinner" },
  { key: "pollWinnerRankPoints",   label: "Umfrage: Rang-Punkte für Gewinner" },
  { key: "matchWinCoins",          label: "Liga: Münzen je Sieg" },
  { key: "matchDrawCoins",         label: "Liga: Münzen je Unentschieden" },
  { key: "goalRewardCoins",        label: "Community-Ziel: Münzen je Mitwirkendem" },
];

const inputCls = "w-full bg-gray-900 border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white tabular-nums focus:outline-none focus:border-teal-500/50 disabled:opacity-60";

function NumberField({ label, value, onChange, disabled, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void; disabled: boolean; step?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] text-gray-400 mb-1">{label}</span>
      <input type="number" min={0} step={step} value={value} disabled={disabled}
        onChange={e => onChange(Number(e.target.value))} className={inputCls} />
    </label>
  );
}

function PlacesRow({ label, values, onChange, disabled }: {
  label: string; values: number[]; onChange: (v: number[]) => void; disabled: boolean;
}) {
  return (
    <div>
      <span className="block text-[11px] text-gray-400 mb-1">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <label key={i} className="block">
            <span className="block text-[10px] text-gray-600 mb-0.5">Platz {i + 1}</span>
            <input type="number" min={0} value={values[i] ?? 0} disabled={disabled}
              onChange={e => { const next = [...values]; next[i] = Number(e.target.value); onChange(next); }}
              className={inputCls} />
          </label>
        ))}
      </div>
    </div>
  );
}

function RewardLimitsCard({ title, hint, value, onChange, disabled }: {
  title: string; hint: string; value: RewardLimits; onChange: (v: RewardLimits) => void; disabled: boolean;
}) {
  return (
    <section className="glass rounded-2xl p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="text-xs text-gray-500">{hint}</p>
      </div>
      <PlacesRow label="Höchste Münzen je Platz" values={value.placementCoins} disabled={disabled}
        onChange={v => onChange({ ...value, placementCoins: v })} />
      <PlacesRow label="Höchste Rang-Punkte je Platz" values={value.placementRankPoints} disabled={disabled}
        onChange={v => onChange({ ...value, placementRankPoints: v })} />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SCALAR_FIELDS.map(f => (
          <NumberField key={f.key} label={f.label} value={value[f.key]} disabled={disabled}
            onChange={v => onChange({ ...value, [f.key]: v })} />
        ))}
      </div>
    </section>
  );
}

function SeasonCard({ value, onChange, disabled }: {
  value: SeasonRewardLimits; onChange: (v: SeasonRewardLimits) => void; disabled: boolean;
}) {
  const example = (count: number) => {
    const f = Math.min(value.maxFactor, Math.max(value.minFactor, count / Math.max(1, value.referenceEventCount)));
    return `${count} Termine → ×${f.toLocaleString("de-DE", { maximumFractionDigits: 2 })} (Platz 1: ${Math.floor((value.placementCoins[0] ?? 0) * f)} Münzen, ${Math.floor((value.placementRankPoints[0] ?? 0) * f)} Rang-Punkte)`;
  };
  return (
    <section className="glass rounded-2xl p-4 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-white">Eventreihe · Endwertung (Saisonabschluss)</h2>
        <p className="text-xs text-gray-500">
          Grundwerte bei Faktor 1. Der Faktor ist Termine ÷ Referenz-Termine, begrenzt auf Min/Max —
          Reihen mit mehr Terminen dürfen mehr ausschütten, Reihen mit wenigen weniger.
        </p>
      </div>
      <PlacesRow label="Münzen je Platz (Faktor 1)" values={value.placementCoins} disabled={disabled}
        onChange={v => onChange({ ...value, placementCoins: v })} />
      <PlacesRow label="Rang-Punkte je Platz (Faktor 1)" values={value.placementRankPoints} disabled={disabled}
        onChange={v => onChange({ ...value, placementRankPoints: v })} />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <NumberField label="Münzen ab Platz 4" value={value.placementCoinsOther} disabled={disabled}
          onChange={v => onChange({ ...value, placementCoinsOther: v })} />
        <NumberField label="Referenz-Termine (= ×1)" value={value.referenceEventCount} disabled={disabled}
          onChange={v => onChange({ ...value, referenceEventCount: v })} />
        <NumberField label="Min. Faktor" step={0.1} value={value.minFactor} disabled={disabled}
          onChange={v => onChange({ ...value, minFactor: v })} />
        <NumberField label="Max. Faktor" step={0.1} value={value.maxFactor} disabled={disabled}
          onChange={v => onChange({ ...value, maxFactor: v })} />
      </div>
      <ul className="text-[11px] text-gray-500 space-y-0.5">
        {[2, value.referenceEventCount, 10].map(n => <li key={n}>{example(n)}</li>)}
      </ul>
    </section>
  );
}

export default function CommunityLimitsEditor({ initial, canEdit }: { initial: CommunityLimitsConfig; canEdit: boolean }) {
  const [cfg, setCfg] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const disabled = !canEdit || saving;

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/community-limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cfg),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Speichern fehlgeschlagen");
      setCfg(data as CommunityLimitsConfig);
      setMessage({ ok: true, text: "Gespeichert" });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass rounded-2xl p-4">
        <h2 className="text-sm font-semibold text-white">Community-Events</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Obergrenzen für Belohnungen, die normale User (ohne Mod-Rolle) bei ihren eigenen Events und Reihen
          vergeben dürfen. Höhere Werte werden beim Speichern und beim Abschluss still gekappt.
          Mods und Admins sind nicht betroffen.
        </p>
        {!canEdit && <p className="text-xs text-amber-400 mt-2">Nur Admins können die Werte ändern.</p>}
      </div>

      <section className="glass rounded-2xl p-4 space-y-3">
        <h2 className="text-sm font-semibold text-white">Mengenlimits je User</h2>
        <div className="grid grid-cols-2 gap-2 max-w-md">
          <NumberField label="Offene Einzel-Events" value={cfg.maxOpenEvents} disabled={disabled}
            onChange={v => setCfg({ ...cfg, maxOpenEvents: v })} />
          <NumberField label="Aktive Eventreihen" value={cfg.maxActiveSeries} disabled={disabled}
            onChange={v => setCfg({ ...cfg, maxActiveSeries: v })} />
        </div>
      </section>

      <RewardLimitsCard title="Einzel-Event" hint="Gilt für Events ohne Eventreihe."
        value={cfg.standalone} disabled={disabled} onChange={v => setCfg({ ...cfg, standalone: v })} />
      <RewardLimitsCard title="Eventreihe · je Termin" hint="Gilt für jeden einzelnen Termin einer Eventreihe."
        value={cfg.seriesEvent} disabled={disabled} onChange={v => setCfg({ ...cfg, seriesEvent: v })} />
      <SeasonCard value={cfg.season} disabled={disabled} onChange={v => setCfg({ ...cfg, season: v })} />

      {canEdit && (
        <div className="flex items-center gap-3 justify-end">
          {message && <span className={`text-xs ${message.ok ? "text-emerald-400" : "text-rose-400"}`}>{message.text}</span>}
          <button type="button" onClick={save} disabled={saving}
            className="flex items-center gap-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-500 transition-colors px-3 py-1.5 rounded-lg disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Speichert…" : "Speichern"}
          </button>
        </div>
      )}
    </div>
  );
}
