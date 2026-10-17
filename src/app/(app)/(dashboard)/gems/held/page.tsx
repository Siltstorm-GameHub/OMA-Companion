import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ArrowLeft } from "@/components/icons";
import HeroEditor from "@/components/gems/HeroEditor";
import { getOwnCommunityCard, getOwnedCosmetics } from "@/lib/gems/hero/my-hero";
import { prisma } from "@/lib/prisma";
import { effectiveHeroLook, type HeroClass } from "@/lib/gems/hero/look";

export const metadata = {
  title: "Mein Held | OMA Gems | OMA",
};

// „Mein Held“: Jedes Mitglied gestaltet den Look seiner eigenen Community-Karte (siehe lib/gems/hero).
export default async function MyHeroPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/gems/held");
  }
  const userId = session.user.id;
  const card = await getOwnCommunityCard(userId);

  return (
    <div className="p-3 sm:p-6 max-w-5xl mx-auto space-y-5 animate-fade-in">
      <Link href="/gems?tab=sammlung" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Zurück zur Sammlung
      </Link>
      <div>
        <h1 className="font-display text-2xl font-black text-white">Mein Held</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Gestalte deine Community-Karte. Alle, die sie sammeln, sehen deinen Helden so.
        </p>
      </div>
      {card ? (
        <HeroEditor
          name={card.name}
          heroClass={card.class as HeroClass}
          initialLook={effectiveHeroLook(card)}
          owned={[...(await getOwnedCosmetics(userId))]}
          coins={(await prisma.user.findUnique({ where: { id: userId }, select: { points: true } }))?.points ?? 0}
        />
      ) : (
        <p className="glass rounded-2xl p-6 text-sm text-gray-400">
          Du hast noch keine eigene Community-Karte. Sie entsteht automatisch, sobald dein Discord-Konto verknüpft ist und du
          in der Community aktiv bist.
        </p>
      )}
    </div>
  );
}
