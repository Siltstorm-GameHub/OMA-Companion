import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import BotConfigPanel from "./BotConfigPanel";

export default async function AdminBotPage() {
  await requireRole("admin");

  const rows = await prisma.botConfig.findMany();
  const config = Object.fromEntries(rows.map(r => [r.key, r.value]));

  return (
    <div className="max-w-2xl">
      <BotConfigPanel initial={config} />
    </div>
  );
}
