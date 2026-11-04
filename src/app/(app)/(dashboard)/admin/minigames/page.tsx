import Link from "next/link";
import { requireRole } from "@/lib/roles";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { getBlocksRewards } from "@/lib/blocks/rewards-config";
import { getSeasonConfig } from "@/lib/season/season-config";
import { ArrowRight } from "@/components/icons";
import { MinigamesConfigPanel } from "./MinigamesConfigPanel";
import { BlocksRewardsPanel } from "./BlocksRewardsPanel";
import { SeasonConfigPanel } from "../gems/SeasonConfigPanel";

// Enthält auch OMA Gems (früher eigener Reiter /admin/gems — die Adresse leitet hierher um;
// die Unterseiten /admin/gems/cards und /admin/gems/helden bleiben bestehen).
export default async function AdminMinigamesPage() {
  await requireRole("admin");
  const [config, blocksRewards, gemsSeasonConfig] = await Promise.all([
    getMinigamesConfig(),
    getBlocksRewards(),
    getSeasonConfig(),
  ]);

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🎮 Minigames
        </h2>
        <MinigamesConfigPanel initial={config} />
      </section>
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🧱 OMA Blocks · Monatssieger-Belohnung
        </h2>
        <BlocksRewardsPanel initial={blocksRewards} />
      </section>
      <section id="gems">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🎴 OMA Gems — Community-Karten
        </h2>
        <SeasonConfigPanel initial={gemsSeasonConfig} />
        <div className="space-y-3 mt-3">
          <Link
            href="/admin/gems/cards"
            className="flex items-center justify-between gap-3 glass rounded-2xl p-4 hover:bg-white/[0.04] transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-white">Community-Karten bearbeiten</p>
              <p className="text-xs text-gray-500">Untertitel & Beschreibung pro Mitglied setzen</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
          </Link>
          <Link
            href="/admin/gems/helden"
            className="flex items-center justify-between gap-3 glass rounded-2xl p-4 hover:bg-white/[0.04] transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-white">Helden-Prüfbogen</p>
              <p className="text-xs text-gray-500">Alle Figuren-Teile groß und in Kartengröße, gelieferte Zeichnungen markiert</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-500 shrink-0" />
          </Link>
        </div>
      </section>
    </div>
  );
}
