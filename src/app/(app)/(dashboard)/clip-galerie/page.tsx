import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { Images, Trophy } from "@/components/icons";
import ClipWinnerCard from "@/components/ClipWinnerCard";
import ClipsNav from "@/components/clips/ClipsNav";
import { clipYearOf } from "@/lib/clip-order";

const MONTH_NAMES = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

type Nomination = {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  clipTitle: string | null;
  customTitle: string | null;
  submittedBy: { name: string | null; username: string | null } | null;
  twitchCreatorLogin: string | null;
  partnerTwitchLogin: string | null;
};

/**
 * Clips → Reiter "Galerie": nach Clip-Jahren (Dez–Nov) gruppiert. Oben im Jahr der Clip des Jahres
 * groß, darunter ALLE Monatssieger als Raster — Monatssieger bleiben dauerhaft sichtbar (früher
 * verschwanden sie, sobald der Clip des Jahres gewählt war).
 */
export default async function ClipGaleriePage() {
  const embedParent = ((await headers()).get("host") ?? "localhost").split(":")[0];

  const [finishedYearly, finishedMonthly] = await Promise.all([
    prisma.yearlyClipContest.findMany({ where: { status: "finished" }, orderBy: { year: "desc" } }),
    prisma.monthlyClipContest.findMany({ where: { status: "finished" }, orderBy: [{ year: "desc" }, { month: "desc" }] }),
  ]);

  const allWinnerIds = [...new Set([...finishedYearly, ...finishedMonthly].flatMap((c) => c.winnerNominationIds))];
  const nominations = allWinnerIds.length
    ? await prisma.clipNomination.findMany({
        where: { id: { in: allWinnerIds } },
        include: { submittedBy: { select: { name: true, username: true } } },
      })
    : [];
  const nominationById = new Map<string, Nomination>(nominations.map((n) => [n.id, n]));
  const resolve = (ids: string[]) => ids.map((id) => nominationById.get(id)).filter((n): n is Nomination => !!n);

  // Clip-Jahre: Jahressieger + Monatssieger (Dezember zählt zum Folgejahr)
  const years = new Map<number, { yearly: (typeof finishedYearly)[number] | null; months: (typeof finishedMonthly)[number][] }>();
  for (const y of finishedYearly) years.set(y.year, { yearly: y, months: [] });
  for (const m of finishedMonthly) {
    const cy = clipYearOf(m.month, m.year);
    if (!years.has(cy)) years.set(cy, { yearly: null, months: [] });
    years.get(cy)!.months.push(m);
  }
  const sortedYears = [...years.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <ClipsNav active="galerie" />

      {sortedYears.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center text-gray-400">
          <Images className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Noch keine Sieger-Clips.</p>
        </div>
      )}

      {sortedYears.map(([year, { yearly, months }]) => {
        const yearlyWinners = yearly ? resolve(yearly.winnerNominationIds) : [];
        return (
          <section key={year} aria-label={`Clip-Jahr ${year}`} className="space-y-4">
            <h2 className="flex items-center gap-3 text-sm font-semibold text-gray-300">
              {year} <span className="h-px flex-1 bg-white/[0.06]" />
            </h2>

            {yearlyWinners.length > 0 && yearly && (
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                  <Trophy className="w-3.5 h-3.5" /> Clip des Jahres {year}
                  {yearlyWinners.length > 1 && <span className="font-normal text-amber-300/70">· Gleichstand</span>}
                </p>
                <div className={`grid gap-4 ${yearlyWinners.length > 1 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1 lg:max-w-3xl"}`}>
                  {yearlyWinners.map((w) => (
                    <ClipWinnerCard key={w.id} winner={w} embedParent={embedParent} rewardCoins={yearly.rewardCoins} badgeLabel="Clip des Jahres" />
                  ))}
                </div>
              </div>
            )}

            {months.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-gray-400">Clips des Monats</p>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {months.flatMap((m) => resolve(m.winnerNominationIds).map((w) => (
                    <ClipWinnerCard key={`${m.id}-${w.id}`} winner={w} embedParent={embedParent} rewardCoins={m.rewardCoins}
                      badgeLabel={`${MONTH_NAMES[m.month - 1]} ${m.year}`} />
                  )))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
