import { requireRole } from "@/lib/roles";
import AdminJobsNav from "../AdminJobsNav";
import TextsClient from "./TextsClient";

export const dynamic = "force-dynamic";

export default async function TextsPage() {
  await requireRole("moderator");
  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-white">Community-Jobs — Job-Texte</h1>
        <p className="text-xs text-gray-500 mt-0.5">Beschreibung (Job-Übersicht) und Büro-Anleitung („So funktioniert dein Job“) je Job — ohne Deploy änderbar. Leer lassen = Standardtext.</p>
      </div>
      <AdminJobsNav />
      <TextsClient />
    </div>
  );
}
