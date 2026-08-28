import { requireRole } from "@/lib/roles";
import { getSeasonConfig } from "@/lib/season/season-config";
import { SeasonConfigPanel } from "./SeasonConfigPanel";

export default async function AdminBattleCardsPage() {
  await requireRole("admin");
  const config = await getSeasonConfig();

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🎴 Battle Cards — Saison
        </h2>
        <SeasonConfigPanel initial={config} />
      </section>
    </div>
  );
}
