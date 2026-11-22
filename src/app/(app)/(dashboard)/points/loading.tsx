import { Skeleton } from "@/components/Skeleton";

/** Platzhalter im Aufbau des Münzen-Verlaufs: Kontostand mit Diagramm · Quellen · Verlauf */
export default function PointsLoading() {
  return (
    <div className="px-4 pb-8 pt-0 sm:p-6 max-w-6xl mx-auto space-y-4" aria-busy="true" aria-label="Münzen laden">
      <Skeleton className="h-56 rounded-card" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-96 rounded-card" />
        <Skeleton className="h-96 rounded-card" />
      </div>
    </div>
  );
}
