import { requireRole } from "@/lib/roles";
import AdminJobsNav from "../AdminJobsNav";
import PayoutsClient from "./PayoutsClient";

export const dynamic = "force-dynamic";

export default async function PayoutsPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs — Auszahlungen</h1>
        <p className="text-xs text-gray-500 mt-0.5">Was pro Woche ausgezahlt wurde, was der nächste Lauf auszahlen würde und ob der tägliche Lauf sauber durchgelaufen ist.</p>
      </div>
      <AdminJobsNav />
      <PayoutsClient />
    </div>
  );
}
