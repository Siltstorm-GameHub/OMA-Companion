import { Skeleton, SkeletonCard } from "@/components/Skeleton";

export default function EventsLoading() {
  return (
    <div className="p-5 sm:p-6 max-w-4xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-7 w-24" />
          </div>
          <Skeleton className="h-4 w-56 ml-10" />
        </div>
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>

      {/* Event Cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}
