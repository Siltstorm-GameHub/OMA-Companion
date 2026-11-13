import { requireRole } from "@/lib/roles";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { getBlocksRewards } from "@/lib/blocks/rewards-config";
import { MinigamesConfigPanel } from "./MinigamesConfigPanel";
import { BlocksRewardsPanel } from "./BlocksRewardsPanel";

// Minigames-Einstellungen inkl. der Monatssieger-Belohnungen von OMA Blocks.
export default async function AdminMinigamesPage() {
  await requireRole("admin");
  const [config, blocksRewards] = await Promise.all([getMinigamesConfig(), getBlocksRewards()]);

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
    </div>
  );
}
