import { requireRole } from "@/lib/roles";
import { Shield } from "lucide-react";
import AdminNav from "./AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole("moderator");

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-700 to-purple-950 flex items-center justify-center shadow-lg shadow-purple-900/40">
          <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Admin-Bereich</h1>
          <p className="text-xs text-gray-500">Verwaltung von Events, Turnieren und Nutzern</p>
        </div>
      </div>

      <AdminNav />
      {children}
    </div>
  );
}
