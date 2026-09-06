import { requireRole } from "@/lib/roles";
import { getMancaveConfig, effectiveCosts } from "@/lib/mancave-config";
import { MANCAVE_ITEMS } from "@/lib/mancave-items";
import { MancaveConfigPanel } from "./MancaveConfigPanel";
import { MancavePricesPanel } from "./MancavePricesPanel";

export default async function AdminMancavePage() {
  await requireRole("admin");
  const config = await getMancaveConfig();

  const priceRows = MANCAVE_ITEMS.map(def => ({
    key: def.key, label: def.label, baseline: def.baseline,
    defaultCosts: def.costs, costs: effectiveCosts(def, config),
    overridden: def.key in config.priceOverrides,
  }));

  return (
    <div className="space-y-10 max-w-4xl">
      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🖥️ Mancave-Profilseite
        </h2>
        <MancaveConfigPanel initial={config} />
      </section>

      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          🪙 Ausbau-Preise
        </h2>
        <p className="text-xs text-gray-500 mb-4 -mt-2">
          Kosten je Stufenübergang, in Münzen. Gelbe Punkte markieren Objekte mit eigenem
          Preis (weicht vom Katalog-Default ab). Gilt für alle außer Admins im Testmodus (oben).
        </p>
        <MancavePricesPanel initial={priceRows} />
      </section>
    </div>
  );
}
