import { requireRole } from "@/lib/roles";
import AdminNotificationsPanel from "./AdminNotificationsPanel";

export default async function AdminNotificationsPage() {
  await requireRole("admin");
  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-lg font-bold text-white">Benachrichtigungen</h1>
        <p className="text-xs text-gray-500 mt-1">In-App-Nachrichten an User senden.</p>
      </div>
      <AdminNotificationsPanel />
    </div>
  );
}
