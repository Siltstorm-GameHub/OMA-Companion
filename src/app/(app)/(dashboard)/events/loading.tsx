import { Skeleton } from "@/components/Skeleton";

/** Platzhalter im Aufbau der Events-Seite: Seitenkopf · nächstes Event · Filter · Karten-Raster */
export default function EventsLoading() {
  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-6xl mx-auto space-y-6" aria-busy="true" aria-label="Events laden">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2"><Skeleton className="h-9 w-32" /><Skeleton className="h-4 w-64" /></div>
        <Skeleton className="h-10 w-36 rounded-control" />
      </div>
      <Skeleton className="h-64 rounded-card" />
      <div className="flex gap-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-24 rounded-full" />)}</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card border border-line bg-surface overflow-hidden">
            <Skeleton className="aspect-[2/1] sm:aspect-video rounded-none" />
            <div className="p-3 space-y-2"><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
