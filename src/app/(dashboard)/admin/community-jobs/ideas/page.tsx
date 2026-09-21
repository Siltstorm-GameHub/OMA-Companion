import Link from "next/link";
import { requireRole } from "@/lib/roles";
import IdeasBoardClient from "./IdeasBoardClient";

export const dynamic = "force-dynamic";

export default async function AdminIdeasPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4">
      <div>
        <Link href="/admin/community-jobs" className="text-xs text-gray-500 hover:text-teal-400 transition-colors">← Community-Jobs</Link>
        <h1 className="text-lg font-bold text-white mt-1">Ideen — Team-Ansicht</h1>
        <p className="text-xs text-gray-500 mt-0.5">Ideen per Drag &amp; Drop (oder Auswahl) in die passende Spalte schieben. Der Autor wird bei jedem Statuswechsel benachrichtigt.</p>
      </div>
      <IdeasBoardClient />
    </div>
  );
}
