import { Skeleton } from "@/components/Skeleton";

export default function DonationsLoading() {
  return (
    <div className="px-4 pt-0 pb-8 sm:py-8 animate-fade-in">
      {/* Reiter */}
      <Skeleton className="h-12 max-w-sm mx-auto rounded-2xl mb-7" />

      <div className="mx-auto max-w-5xl space-y-4">
        {/* Nächstes Ziel + Spenden-Button */}
        <Skeleton className="h-48 lg:h-40 rounded-2xl" />

        {/* Bilanz + Meine Unterstützung */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>

        {/* Laufende Kosten + Ziele, Kassenbuch + Unterstützer */}
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-56 rounded-2xl" />
            <Skeleton className="h-56 rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
