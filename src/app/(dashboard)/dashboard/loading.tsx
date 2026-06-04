import { SkeletonHero, SkeletonStatCards, SkeletonList } from "@/components/Skeleton";
import { Skeleton } from "@/components/Skeleton";

export default function DashboardLoading() {
  return (
    <div className="animate-fade-in">
      {/* Hero Banner */}
      <div className="relative overflow-hidden border-b border-white/[0.05] px-5 pt-8 pb-6">
        <SkeletonHero />
      </div>

      <div className="px-4 sm:px-6 py-5 max-w-5xl mx-auto space-y-6">
        {/* Stats */}
        <SkeletonStatCards count={4} />

        {/* Quick Actions */}
        <div>
          <Skeleton className="h-3 w-24 mb-3" />
          <div className="flex gap-2.5 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-[72px] h-[88px] rounded-2xl shrink-0" />
            ))}
          </div>
        </div>

        {/* Events + Top Players */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-3 space-y-3">
            <Skeleton className="h-4 w-32" />
            <SkeletonList rows={4} />
          </div>
          <div className="lg:col-span-2 space-y-3">
            <Skeleton className="h-4 w-24" />
            <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="w-6 h-4 rounded" />
                  <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-24" />
                    <Skeleton className="h-3 w-12" />
                  </div>
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
