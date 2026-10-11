import { Skeleton } from "@/components/Skeleton";

export default function DonationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 sm:py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-3">
        <Skeleton className="h-4 w-40 mx-auto" />
        <Skeleton className="h-7 w-64 mx-auto" />
        <Skeleton className="h-4 w-72 mx-auto" />
        <Skeleton className="h-10 w-36 rounded-xl mx-auto mt-2" />
      </div>

      {/* Bilanz-Karten */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="rounded-2xl h-20" />
        ))}
      </div>

      {/* Ideen */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-56 mb-3" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>

      {/* Monats-Historie */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-40 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>

      {/* Spender */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-44 mb-3" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
