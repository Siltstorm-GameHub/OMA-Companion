import { requireRole } from "@/lib/roles";
import AdminJobsNav from "../AdminJobsNav";
import AnomaliesClient from "./AnomaliesClient";

export const dynamic = "force-dynamic";

export default async function AnomaliesPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs — Auffälligkeiten</h1>
        <p className="text-xs text-gray-500 mt-0.5">Muster bei den Bewertungen der letzten 30 Tage. Das sind nur Hinweise, es gibt keine automatischen Strafen — vieles davon ist harmlos (Freunde, Stammleser).</p>
      </div>
      <AdminJobsNav />
      <AnomaliesClient />
    </div>
  );
}
