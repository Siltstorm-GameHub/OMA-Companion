import { Info } from "@/components/icons";

function Meter({ label, used, max, unit }: { label: string; used: number; max: number; unit: { one: string; many: string } }) {
  const left = Math.max(0, max - used);
  const full = left === 0;
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 100;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs tabular-nums">
          <b className="text-white">{used}</b><span className="text-gray-500"> von {max}</span>
        </span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-line overflow-hidden">
        <div className={`h-full rounded-full ${full ? "bg-amber-400" : "bg-teal-400"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1 text-[11px] ${full ? "text-amber-300" : "text-gray-500"}`}>
        {full ? "Limit erreicht" : `noch ${left} ${left === 1 ? unit.one : unit.many} möglich`}
      </p>
    </div>
  );
}

/**
 * Events → Verwalten, nur für Mitglieder: wie viele Events und Reihen gerade angelegt sind und wie
 * viele noch gehen (Grenzen unter Admin → Einstellungen → Regeln & Limits). Mods/Admins haben kein Limit.
 */
export default function LimitMeter({ openEvents, maxOpenEvents, activeSeries, maxActiveSeries }: {
  openEvents: number; maxOpenEvents: number; activeSeries: number; maxActiveSeries: number;
}) {
  return (
    <section aria-label="Deine Limits" className="glass rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <Meter label="Offene Einzel-Events" used={openEvents} max={maxOpenEvents} unit={{ one: "Event", many: "Events" }} />
        <Meter label="Aktive Eventreihen" used={activeSeries} max={maxActiveSeries} unit={{ one: "Reihe", many: "Reihen" }} />
      </div>
      <p className="mt-3 flex gap-1.5 text-[11px] text-gray-500 leading-relaxed">
        <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
        <span>
          Es zählen Events, die noch nicht abgeschlossen sind (auch vorbeigegangene ohne Ergebnis), und Reihen mit
          offenen Terminen. Schließ ein Event ab, dann wird sein Platz frei. Eine Reihe zählt, bis alle ihre Termine
          abgeschlossen sind; den Saisonabschluss macht danach ein Mod. Eine Reihe ohne abgeschlossene Termine kannst du
          auch selbst löschen. Deine Events sind sofort in der App sichtbar, Discord-Ankündigung und Push gibt es nach der
          Freigabe durch einen Mod.
        </span>
      </p>
    </section>
  );
}
