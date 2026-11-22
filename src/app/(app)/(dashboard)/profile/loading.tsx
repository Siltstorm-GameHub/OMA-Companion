import { Skeleton } from "@/components/Skeleton";

/** Platzhalter im Aufbau des Profils: Visitenkarte · "Ich"-Kacheln · Reiter · Inhalt */
export default function ProfileLoading() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5" aria-busy="true" aria-label="Profil lädt">
      <div className="rounded-card border border-line bg-surface p-4 sm:p-6">
        <div className="flex items-start gap-4">
          <Skeleton className="size-[72px] rounded-card shrink-0" />
          <div className="flex-1 space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-32" /></div>
        </div>
        <div className="mt-4 flex gap-6 border-t border-line pt-4">
          {[0, 1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10 w-14" />)}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-card" />)}
      </div>
      <div className="flex gap-2">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-28 rounded-control" />)}</div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="h-80 rounded-card lg:col-span-2" />
        <Skeleton className="h-80 rounded-card" />
      </div>
    </div>
  );
}
