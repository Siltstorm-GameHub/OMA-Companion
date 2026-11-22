import { Skeleton } from "@/components/Skeleton";

/** Platzhalter im Aufbau der Rangliste: Seitenkopf · Dein Stand · Podium · Tabelle */
export default function LeaderboardLoading() {
  return (
    <div className="p-3 sm:p-6 max-w-4xl mx-auto space-y-5" aria-busy="true" aria-label="Rangliste lädt">
      <div className="space-y-2"><Skeleton className="h-9 w-40" /><Skeleton className="h-4 w-56" /></div>
      <Skeleton className="h-24 rounded-card" />
      <div className="grid grid-cols-3 items-end gap-3 rounded-card border border-line bg-surface px-4 pt-6">
        {[20, 28, 14].map((h, i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className={`${i === 1 ? "size-20" : "size-16"} rounded-full`} />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="w-full rounded-b-none" style={{ height: `${h * 0.25}rem` }} />
          </div>
        ))}
      </div>
      <div className="rounded-card border border-line bg-surface divide-y divide-line overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 px-4">
            <Skeleton className="size-7 rounded-full" /><Skeleton className="size-10 rounded-full" />
            <Skeleton className="h-4 flex-1 max-w-48" /><Skeleton className="ml-auto h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
