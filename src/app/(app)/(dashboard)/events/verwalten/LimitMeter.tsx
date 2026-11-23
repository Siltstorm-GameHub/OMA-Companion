import { ChevronDown, Info } from "@/components/icons";
import { Card } from "@/components/ui/Card";

function Meter({ label, used, max, unit, fullHint }: { label: string; used: number; max: number; unit: { one: string; many: string }; fullHint: string }) {
  const left = Math.max(0, max - used);
  const full = left === 0;
  const pct = max > 0 ? Math.min(100, Math.round((used / max) * 100)) : 100;
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-fg">{label}</span>
        <span className="text-sm tabular-nums">
          <b className="text-fg">{used}</b><span className="text-subtle"> / {max}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-surface-3 overflow-hidden">
        <div className={`h-full rounded-full ${full ? "bg-warning" : "bg-primary"}`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`mt-1 text-xs ${full ? "font-semibold text-warning" : "text-subtle"}`}>
        {full ? `Limit erreicht — ${fullHint}` : `noch ${left} ${left === 1 ? unit.one : unit.many} möglich`}
      </p>
    </div>
  );
}

/**
 * Events → Verwalten, nur für Mitglieder: wie viele Events und Reihen gerade angelegt sind und wie
 * viele noch gehen (Grenzen unter Admin → Einstellungen → Regeln & Limits). Mods/Admins haben kein Limit.
 * Die Erklärung steht aufklappbar darunter (ein title-Tooltip erschiene auf dem Handy nicht).
 */
export default function LimitMeter({ openEvents, maxOpenEvents, activeSeries, maxActiveSeries }: {
  openEvents: number; maxOpenEvents: number; activeSeries: number; maxActiveSeries: number;
}) {
  return (
    <Card aria-label="Deine Limits" className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
        <Meter label="Offene Events" used={openEvents} max={maxOpenEvents} unit={{ one: "Event", many: "Events" }} fullHint="schließ erst ein Event ab" />
        <Meter label="Aktive Eventreihen" used={activeSeries} max={maxActiveSeries} unit={{ one: "Reihe", many: "Reihen" }} fullHint="frei, sobald alle Termine einer Reihe abgeschlossen sind" />
      </div>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-xs font-semibold text-primary-fg hover:text-fg [&::-webkit-details-marker]:hidden">
          <Info className="size-3.5" /> Wie funktionieren die Limits?
          <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-muted">
          <li>Es zählen Events, die noch nicht abgeschlossen sind — auch vorbeigegangene ohne Ergebnis. Schließ ein Event ab, dann wird sein Platz frei.</li>
          <li>Eine Reihe zählt, bis alle ihre Termine abgeschlossen sind; den Saisonabschluss macht danach ein Mod. Eine Reihe ohne abgeschlossene Termine kannst du selbst löschen.</li>
          <li>Deine Events sind sofort in der App sichtbar. Discord-Ankündigung und Push gibt es nach der Freigabe durch einen Mod.</li>
        </ul>
      </details>
    </Card>
  );
}
