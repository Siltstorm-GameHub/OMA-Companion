import { Skeleton } from "@/components/Skeleton";

/** Platzhalter im Aufbau der Übersicht: Begrüßung · Aufgaben · Bühne + Seitenspalte · kommende Events */
export default function DashboardLoading() {
  return (
    <div className="px-4 sm:px-6 pb-6 max-w-7xl mx-auto space-y-6" aria-busy="true" aria-label="Übersicht lädt">
      <Skeleton className="h-9 w-56" />
      <div className="flex gap-2.5 overflow-hidden">
        {[0, 1, 2].map(i => <Skeleton key={i} className="h-16 w-64 shrink-0 rounded-card lg:flex-1" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-card border border-line bg-surface overflow-hidden lg:flex">
            <Skeleton className="aspect-video lg:aspect-auto lg:min-h-[19rem] lg:w-1/2 rounded-none" />
            <div className="flex-1 p-5 space-y-3">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full rounded-control" />
              <Skeleton className="h-10 w-full rounded-control" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[0, 1].map(i => <Skeleton key={i} className="h-48 rounded-card" />)}
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40 rounded-card" />
          <Skeleton className="h-72 rounded-card" />
        </div>
      </div>
    </div>
  );
}
