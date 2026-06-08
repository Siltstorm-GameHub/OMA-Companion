import { Skeleton } from "@/components/Skeleton";

export default function ShopLoading() {
  return (
    <div className="p-5 sm:p-6 max-w-7xl mx-auto space-y-8 animate-fade-in">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-7 w-20" />
          </div>
          <Skeleton className="h-4 w-56 ml-10" />
        </div>
        <Skeleton className="w-28 h-16 rounded-2xl" />
      </div>
      {["Kosmetik", "Boosts", "Privilegien"].map(cat => (
        <div key={cat}>
          <Skeleton className="h-3 w-24 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass rounded-2xl p-4 space-y-3">
                <div className="flex justify-between">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
                <div className="flex justify-between pt-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-7 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
