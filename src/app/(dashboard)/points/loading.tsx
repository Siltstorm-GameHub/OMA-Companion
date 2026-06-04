import { Skeleton } from "@/components/Skeleton";

export default function PointsLoading() {
  return (
    <div className="p-5 sm:p-6 max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-7 w-36" />
        </div>
        <Skeleton className="h-4 w-56 ml-10" />
      </div>

      {/* Stats Hero */}
      <div className="glass rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-2 w-full max-w-sm" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="w-16 h-16 rounded-xl" />
            <Skeleton className="w-16 h-16 rounded-xl" />
          </div>
        </div>
      </div>

      {/* Regeln Grid */}
      <div>
        <Skeleton className="h-3 w-40 mb-3" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              {Array.from({ length: 3 }).map((_, j) => (
                <div key={j} className="flex justify-between py-2 border-t border-white/[0.04]">
                  <Skeleton className="h-3.5 w-40" />
                  <Skeleton className="h-3.5 w-10" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Ränge */}
      <div>
        <Skeleton className="h-3 w-28 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
