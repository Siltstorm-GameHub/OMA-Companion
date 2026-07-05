import { requireRole } from "@/lib/roles";
import { getMinigamesConfig } from "@/lib/minigames-config";
import { MinigamesConfigPanel } from "./MinigamesConfigPanel";

export default async function AdminMinigamesPage() {
  await requireRole("admin");
  const config = await getMinigamesConfig();

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🎮 Minigames
        </h2>
        <MinigamesConfigPanel initial={config} />
      </section>
    </div>
  );
}
