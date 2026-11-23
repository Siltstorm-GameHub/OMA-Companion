import { Card } from "@/components/ui/Card";
import { Glyph } from "@/components/ui/Glyph";

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="min-w-0 flex-1 rounded-control bg-surface-2 px-3 py-2.5 text-center">
      <p className={`text-2xl font-extrabold leading-none tabular-nums ${tone}`}>{value}</p>
      <p className="mt-1 text-xs font-semibold text-subtle">{label}</p>
    </div>
  );
}

/** Reiter "Vorhersagen": Serie (aktuell / beste) und offene Tipps auf einen Blick. */
export default function PredictionStreakCard({ current, best, pendingCount }: {
  current: number;
  best: number;
  pendingCount: number;
}) {
  return (
    <Card aria-label="Deine Vorhersage-Serie" className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-control bg-primary-soft text-primary-fg"><Glyph name="fire" className="size-5" /></span>
        <div className="min-w-0">
          <p className="text-base font-extrabold text-fg">Deine Serie</p>
          <p className="text-xs text-subtle">
            {current > 0 ? `${current} richtige Tipps in Folge` : "Tipp richtig, dann wächst deine Serie"}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Stat label="Aktuell" value={current} tone="text-primary-fg" />
        <Stat label="Beste" value={best} tone="text-fg" />
        <Stat label="Offen" value={pendingCount} tone={pendingCount > 0 ? "text-warning" : "text-subtle"} />
      </div>
    </Card>
  );
}
