import { requireRole } from "@/lib/roles";
import AdminJobsNav from "../AdminJobsNav";
import AuditClient from "./AuditClient";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs — Protokoll</h1>
        <p className="text-xs text-gray-500 mt-0.5">Wer hat wann was entschieden: Bewerbungen, Entzüge, Verwarnungen, Moderation, Einstellungen.</p>
      </div>
      <AdminJobsNav />
      <AuditClient />
    </div>
  );
}
