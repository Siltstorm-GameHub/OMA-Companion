import { requireRole } from "@/lib/roles";
import AdminJobsNav from "../AdminJobsNav";
import ModerationClient from "./ModerationClient";

export const dynamic = "force-dynamic";

export default async function ModerationPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs — Moderation</h1>
        <p className="text-xs text-gray-500 mt-0.5">Beiträge ausblenden oder wieder einblenden, Kommentare, Alben, Kampagnen und Bildwünsche entfernen. Alles wird im Protokoll festgehalten.</p>
      </div>
      <AdminJobsNav />
      <ModerationClient />
    </div>
  );
}
