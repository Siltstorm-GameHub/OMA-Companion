import { requireEventManager } from "@/lib/roles";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "@/components/icons";
import ResultReviewClient from "./ResultReviewClient";
import { loadReviewData } from "@/lib/tournaments/review-data";

export default async function AdminEventResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireEventManager(id);

  const data = await loadReviewData(id);
  if (!data) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/admin/events/${data.event.id}/bracket`} className="flex items-center gap-1 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> {data.event.title}
        </Link>
        <span>/</span>
        <span className="text-gray-300">Ergebnis-Prüfung</span>
      </div>
      <ResultReviewClient eventId={data.event.id} matches={data.matches} statFields={data.statFields} />
    </div>
  );
}
