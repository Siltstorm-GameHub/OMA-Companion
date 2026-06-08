import { Skeleton, SkeletonLeaderboardRow } from "@/components/Skeleton";

export default function LeaderboardLoading() {
  return (
    <div className="p-5 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-7 w-28" />
        </div>
        <Skeleton className="h-4 w-24 ml-10" />
      </div>

      {/* Podium */}
      <div className="grid grid-cols-3 gap-3">
        {[48, 64, 40].map((h, i) => (
          <Skeleton key={i} className={`rounded-2xl`} style={{ height: `${h + 80}px` }} />
        ))}
      </div>

      {/* List */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="flex gap-3 px-4 py-2.5 border-b border-white/[0.05]">
          <Skeleton className="h-3 w-6" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="divide-y divide-white/[0.04]">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonLeaderboardRow key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
