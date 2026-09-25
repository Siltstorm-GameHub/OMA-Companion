// ============================================
// /oma-quest/karte — Prototyp: begehbares Dorf mit Time-Elements-Figur
// ============================================

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import TeQuestPrototype from "@/components/te-map/TeQuestPrototype";

export const metadata = { title: "OMA Quest – Prototyp | OMA" };

export default async function QuestMapPrototypePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=%2Foma-quest%2Fkarte");

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div>
        <h1 className="font-battle text-lg text-white">OMA Quest — Prototyp</h1>
        <p className="text-xs text-gray-500">
          Gestalte deine Figur und laufe durch das Dorf Krähbach. Eine kleine Quest zeigt, wie Aufgaben auf der Karte ablaufen könnten.
        </p>
      </div>
      <TeQuestPrototype />
    </div>
  );
}
