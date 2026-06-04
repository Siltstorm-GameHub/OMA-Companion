import { Skeleton } from "@/components/Skeleton";

export default function LulLoading() {
  return (
    <div className="p-5 sm:p-6 max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Punktesystem */}
      <div className="glass rounded-2xl p-5 space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Tabelle + Spieltage */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3">
          <Skeleton className="h-3 w-32 mb-3" />
          <div className="glass rounded-2xl overflow-hidden">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.04]">
                <Skeleton className="w-5 h-4 rounded" />
                <Skeleton className="w-6 h-6 rounded-full" />
                <Skeleton className="h-3.5 w-28 flex-1" />
                <Skeleton className="h-3.5 w-8" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-3 w-20 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
