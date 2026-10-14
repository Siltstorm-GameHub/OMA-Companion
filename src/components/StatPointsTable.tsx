"use client";

/**
 * Übersichtliche Zuordnung "Statistik → Punkte pro Einheit". Gemeinsam genutzt vom Event-Wizard und
 * vom Event-Editor, damit auf einen Blick erkennbar ist, welche Stat wie viele Punkte gibt.
 */
export default function StatPointsTable({
  fields,
  values,
  onChange,
}: {
  fields: string[];
  values: Record<string, number>;
  onChange: (field: string, points: number) => void;
}) {
  if (fields.length === 0) {
    return <p className="text-[11px] text-gray-600">Lege zuerst Statistik-Felder an, dann kannst du hier die Punkte festlegen.</p>;
  }
  return (
    <div className="rounded-lg border border-gray-700 overflow-hidden">
      <div className="grid grid-cols-[1fr_auto] gap-3 px-3 py-1.5 bg-gray-800/80 text-[10px] uppercase tracking-wide text-gray-500">
        <span>Statistik</span>
        <span className="w-28 text-center">Punkte je Einheit</span>
      </div>
      <div className="divide-y divide-gray-800">
        {fields.map((f) => {
          const pts = values[f] ?? 0;
          return (
            <div key={f} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-gray-200 truncate">{f}</p>
                <p className={`text-[11px] ${pts === 0 ? "text-gray-600" : "text-teal-400"}`}>
                  {pts === 0 ? "zählt nicht für Punkte" : `1 ${f} = ${pts} Pkt.`}
                </p>
              </div>
              <div className="relative w-28">
                <input
                  type="number"
                  step="0.1"
                  value={pts}
                  onChange={(e) => onChange(f, Number(e.target.value))}
                  className="w-full rounded-lg pl-3 pr-9 py-1.5 text-sm text-white text-center outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 pointer-events-none">Pkt.</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
