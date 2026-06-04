import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-white/[0.05]", className)} />
  );
}

// ── Preset-Skeletons ───────────────────────────────────────────────────────

export function SkeletonHero() {
  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center gap-5">
        <Skeleton className="w-20 h-20 rounded-2xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-2 w-full max-w-xs mt-4" />
        </div>
        <Skeleton className="w-20 h-16 rounded-2xl hidden sm:block shrink-0" />
      </div>
      <div className="flex gap-8 mt-5 pt-4 border-t border-white/[0.05]">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-28" />
      </div>
    </div>
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-4 space-y-3">
          <Skeleton className="w-8 h-8 rounded-xl" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="glass rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3.5 px-4 py-3.5">
          <Skeleton className="w-10 h-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("glass rounded-2xl p-5 space-y-3", className)}>
      <div className="flex items-start gap-4">
        <Skeleton className="w-12 h-14 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2 w-full mt-3" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonLeaderboardRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="w-6 h-4 rounded" />
      <Skeleton className="w-8 h-8 rounded-full shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}
