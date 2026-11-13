import { requireRole } from "@/lib/roles";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { getBlocksRewards } from "@/lib/blocks/rewards-config";
import { getBlocksGoals, MAX_GOALS } from "@/lib/blocks/goals-config";
import { MinigamesConfigPanel } from "./MinigamesConfigPanel";
import { BlocksRewardsPanel } from "./BlocksRewardsPanel";
import { BlocksGoalsPanel } from "./BlocksGoalsPanel";

// Minigames-Einstellungen inkl. der Monatsbelohnungen von OMA Blocks (Top 3 und Monatsziele).
export default async function AdminMinigamesPage() {
  await requireRole("admin");
  const [config, blocksRewards, blocksGoals] = await Promise.all([getMinigamesConfig(), getBlocksRewards(), getBlocksGoals()]);

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
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🎯 OMA Blocks · Monatsziele
        </h2>
        <BlocksGoalsPanel initial={blocksGoals} max={MAX_GOALS} />
      </section>
    </div>
  );
}
