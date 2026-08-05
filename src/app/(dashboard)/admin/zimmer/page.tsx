import { requireRole } from "@/lib/roles";
import { getRoomConfig } from "@/lib/room-config";
import { RoomConfigPanel } from "./RoomConfigPanel";

export default async function AdminZimmerPage() {
  await requireRole("admin");
  const config = await getRoomConfig();

  return (
    <div className="space-y-10 max-w-2xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🛋 Gaming-Zimmer &amp; Idle-Jobs
        </h2>
        <RoomConfigPanel initial={config} />
      </section>
    </div>
  );
}
