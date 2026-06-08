import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { Package, Layers } from "lucide-react";
import CollectiblesAdminPanel from "./CollectiblesAdminPanel";

export default async function AdminShopPage() {
  await requireRole("admin");

  const collections = await prisma.collectibleCollection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  const totalItems  = collections.reduce((s, c) => s + c.items.length, 0);
  const activeCount = collections.filter(c => c.active).length;

  return (
    <div className="space-y-5 max-w-4xl">

      {/* Header */}
      <div className="glass card-shine relative overflow-hidden rounded-2xl p-5">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/8 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-500/25 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Sammlungen</h1>
            <p className="text-xs text-gray-500">Collectible-Sammlungen verwalten und im Shop ein-/ausblenden</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Sammlungen",  value: collections.length, color: "text-white" },
          { label: "Im Shop",     value: activeCount,         color: "text-emerald-400" },
          { label: "Figuren ges.", value: totalItems,          color: "text-indigo-400" },
        ].map(s => (
          <div key={s.label} className="glass card-shine rounded-2xl p-4 text-center">
            <p className={`text-2xl font-black tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <CollectiblesAdminPanel collections={collections} />
    </div>
  );
}
