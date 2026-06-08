import { Skeleton, SkeletonStatCards } from "@/components/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
      {/* Hero */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-5 flex-wrap">
          <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-2 w-full max-w-xs mt-3" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <SkeletonStatCards count={4} />

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Badges */}
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-7 w-24 rounded-full" />
              ))}
            </div>
          </div>
          {/* Quests */}
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
