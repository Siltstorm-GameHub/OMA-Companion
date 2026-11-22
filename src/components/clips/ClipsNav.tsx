import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Clapperboard } from "@/components/icons";

export type ClipsTab = "abstimmung" | "galerie" | "jahr";

const TABS: { key: ClipsTab; label: string; href: string }[] = [
  { key: "abstimmung", label: "Clip des Monats", href: "/clip-des-monats" },
  { key: "jahr",       label: "Clip des Jahres", href: "/clip-des-jahres" },
  { key: "galerie",    label: "Galerie",         href: "/clip-galerie" },
];

/**
 * Gemeinsamer Kopf der drei Clip-Seiten: ein Bereich "Clips" mit Reitern statt drei loser Seiten.
 * Die Adressen bleiben dieselben (Links aus Benachrichtigungen/Discord, Gast-Zugang zur Galerie).
 * Ein Punkt am Reiter zeigt, wo gerade abgestimmt wird.
 */
export default async function ClipsNav({ active }: { active: ClipsTab }) {
  const [monthly, yearly] = await Promise.all([
    prisma.monthlyClipContest.findFirst({ where: { status: "voting" }, select: { id: true } }),
    prisma.yearlyClipContest.findFirst({ where: { status: "voting" }, select: { id: true } }),
  ]);
  const voting: Record<ClipsTab, boolean> = { abstimmung: !!monthly, jahr: !!yearly, galerie: false };

  return (
    <header className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#9146ff]/15 border border-[#9146ff]/30">
          <Clapperboard className="w-4.5 h-4.5 text-[#b794ff]" />
        </div>
        <h1 className="font-display text-2xl font-black text-white tracking-tight">Clips</h1>
      </div>
      <nav aria-label="Clip-Bereiche" className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <Link key={t.key} href={t.href} aria-current={active === t.key ? "page" : undefined}
            className={`shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active === t.key ? "border-violet-400 bg-violet-500 text-white" : "border-line-strong text-gray-300 hover:border-line-strong hover:bg-line"
            }`}>
            {t.label}
            {voting[t.key] && (
              <span className={`h-1.5 w-1.5 rounded-full ${active === t.key ? "bg-white" : "bg-violet-400"} animate-pulse`} title="Abstimmung läuft" />
            )}
          </Link>
        ))}
      </nav>
    </header>
  );
}
