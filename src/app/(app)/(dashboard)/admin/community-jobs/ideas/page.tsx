import { requireRole } from "@/lib/roles";
import AdminJobsNav from "../AdminJobsNav";
import IdeasBoardClient from "./IdeasBoardClient";

export const dynamic = "force-dynamic";

export default async function AdminIdeasPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs — Ideen</h1>
        <p className="text-xs text-gray-500 mt-0.5">Ideen per Drag &amp; Drop (oder Auswahl) in die passende Spalte schieben. Der Autor wird bei jedem Statuswechsel benachrichtigt.</p>
      </div>
      <AdminJobsNav />
      <IdeasBoardClient />
    </div>
  );
}
