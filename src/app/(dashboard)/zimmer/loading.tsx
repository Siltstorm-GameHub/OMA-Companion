import { Skeleton, SkeletonStatCards } from "@/components/Skeleton";

export default function ZimmerLoading() {
  return (
    <div className="px-5 pb-5 pt-0 sm:p-6 max-w-7xl mx-auto space-y-5 animate-fade-in">
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

      <SkeletonStatCards count={6} />

      {/* Zonen-Umschalter */}
      <div className="flex gap-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Bühne — gleiches Seitenverhältnis wie das Zimmer (768×576) */}
      <div className="glass rounded-2xl p-2 sm:p-3">
        <Skeleton className="w-full rounded-xl" style={{ aspectRatio: "768 / 576" }} />
      </div>
    </div>
  );
}
