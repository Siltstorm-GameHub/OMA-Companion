import { Skeleton } from "@/components/Skeleton";

export default function PointsLoading() {
  return (
    <div className="px-4 pb-8 pt-0 sm:p-6 max-w-6xl mx-auto space-y-4 animate-fade-in">
      {/* Kontostand */}
      <Skeleton className="h-36 lg:h-24 rounded-2xl" />

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-4">
        {/* Quellen */}
        <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
          <Skeleton className="h-4 w-44" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-56" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>

        {/* Verlauf */}
        <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <Skeleton className="h-3.5 w-48" />
              <Skeleton className="h-3.5 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
