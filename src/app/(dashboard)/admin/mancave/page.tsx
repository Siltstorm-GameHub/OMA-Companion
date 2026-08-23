import { requireRole } from "@/lib/roles";
import { getMancaveConfig, effectiveCosts } from "@/lib/mancave-config";
import { MANCAVE_ITEMS } from "@/lib/mancave-items";
import { JOBS } from "@/lib/jobs";
import { getJobOverrides, getEffectiveJobs } from "@/lib/job-config";
import { MancaveConfigPanel } from "./MancaveConfigPanel";
import { MancavePricesPanel } from "./MancavePricesPanel";
import { MancaveJobsPanel } from "./MancaveJobsPanel";

export default async function AdminMancavePage() {
  await requireRole("admin");
  const [config, jobOverrides, effectiveJobs] = await Promise.all([
    getMancaveConfig(), getJobOverrides(), getEffectiveJobs(),
  ]);

  const priceRows = MANCAVE_ITEMS.map(def => ({
    key: def.key, label: def.label, baseline: def.baseline,
    defaultCosts: def.costs, costs: effectiveCosts(def, config),
    overridden: def.key in config.priceOverrides,
  }));

  const effectiveJobMap = new Map(effectiveJobs.map(j => [j.key, j]));
  const jobRows = JOBS.map(def => ({
    key: def.key, label: def.label, emoji: def.emoji, minTier: def.minTier,
    defaultCoinsPerHour: def.coinsPerHour, defaultMinRoomTier: def.minRoomTier,
    coinsPerHour: effectiveJobMap.get(def.key)?.coinsPerHour ?? def.coinsPerHour,
    minRoomTier:  effectiveJobMap.get(def.key)?.minRoomTier ?? def.minRoomTier,
    overridden: def.key in jobOverrides,
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
          Preis (weicht vom Katalog-Default ab). Greift nur, solange die Testphase oben aus ist.
        </p>
        <MancavePricesPanel initial={priceRows} />
      </section>

      <section>
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-4">
          💼 Idle-Jobs
        </h2>
        <p className="text-xs text-gray-500 mb-4 -mt-2">
          Lohn pro Stunde und ab welcher Mancave-Gesamtstufe ein Job zusätzlich zum Rang
          verfügbar wird.
        </p>
        <MancaveJobsPanel initial={jobRows} />
      </section>
    </div>
  );
}
