import { requireRole } from "@/lib/roles";
import AdminJobsNav from "../AdminJobsNav";
import IdeasBoardClient from "./IdeasBoardClient";

export const dynamic = "force-dynamic";

export default async function AdminIdeasPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg">Community-Jobs — Ideen</h1>
        <p className="text-xs text-subtle mt-0.5">Oben, was eine Antwort braucht. Statuswechsel gehen an Autor, Unterstützer, Helfer und Bewerter. Abgelehnt und Umgesetzt brauchen eine kurze Begründung.</p>
      </div>
      <AdminJobsNav />
      <IdeasBoardClient />
    </div>
  );
}
