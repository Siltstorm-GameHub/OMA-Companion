import { requireRole } from "@/lib/roles";
import { getRoomConfig, getPriceOverrides } from "@/lib/room-config";
import { RoomConfigPanel } from "./RoomConfigPanel";
import { RoomPricesPanel } from "./RoomPricesPanel";

export default async function AdminZimmerPage() {
  await requireRole("admin");
  const [config, priceOverrides] = await Promise.all([getRoomConfig(), getPriceOverrides()]);

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🛋 Gaming-Zimmer &amp; Idle-Jobs
        </h2>
        <RoomConfigPanel initial={config} />
      </section>

      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          💰 Item-Preise
        </h2>
        <RoomPricesPanel initial={priceOverrides} />
      </section>
    </div>
  );
}
