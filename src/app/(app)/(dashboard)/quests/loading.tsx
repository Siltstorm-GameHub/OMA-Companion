import { Skeleton } from "@/components/Skeleton";

/** Platzhalter im Aufbau der Quests: Fortschritt · Quest-Karten */
export default function QuestsLoading() {
  return (
    <div className="px-4 pb-6 pt-0 sm:p-6 max-w-3xl mx-auto space-y-5" aria-busy="true" aria-label="Quests laden">
      <Skeleton className="h-32 rounded-card" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-48 rounded-card" />)}
      </div>
    </div>
  );
}
