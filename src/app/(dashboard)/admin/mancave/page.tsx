import { requireRole } from "@/lib/roles";
import { getMancaveConfig } from "@/lib/mancave-config";
import { MancaveConfigPanel } from "./MancaveConfigPanel";

export default async function AdminMancavePage() {
  await requireRole("admin");
  const config = await getMancaveConfig();

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🖥️ Mancave-Profilseite
        </h2>
        <MancaveConfigPanel initial={config} />
      </section>
    </div>
  );
}
