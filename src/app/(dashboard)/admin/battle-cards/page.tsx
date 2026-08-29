import Link from "next/link";
import { ArrowRight } from "lucide-react";
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

      <section>
        <Link
          href="/admin/battle-cards/cards"
          className="flex items-center justify-between gap-3 glass rounded-2xl p-4 hover:bg-white/[0.04] transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-white">Community-Karten bearbeiten</p>
            <p className="text-xs text-gray-500">Untertitel & Beschreibung pro Mitglied setzen</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
        </Link>
      </section>
    </div>
  );
}
