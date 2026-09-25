// ============================================
// /oma-quest — Weltkarte (Hauptmenü von OMA Quest)
// ============================================
// Der Charakter entsteht in der Helden-Einrichtung von OMA Battle Cards (Aussehen, Klasse, Werte, Start-
// Pack). Wer sie noch nicht abgeschlossen hat, wird dorthin geschickt.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getHeroSetup } from "@/lib/battle-cards/hero-setup";
import Link from "next/link";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";
import DndHome from "@/components/dnd/DndHome";

export const metadata = { title: "OMA Quest | OMA" };

export default async function DndPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=%2Foma-quest");

  const setup = await getHeroSetup(session.user.id);
  if (!setup || setup.step !== "done") redirect("/battle-cards");
  const card = setup.card;
  const builder = await getBuilderAccess(session.user.id);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <Link href="/battle-cards" className="inline-flex text-xs font-semibold text-gray-400 hover:text-white transition-colors">
        ← Battle Cards
      </Link>
      <div>
        <h1 className="font-battle text-lg text-white">OMA Quest</h1>
        <p className="text-xs text-gray-500">Dein Held ist dein Charakter — reise, erlebe Story-Ereignisse, erfülle Quests.</p>
      </div>
      <DndHome myCardId={card.id} rerollCredits={card.dndRerollCredits} />
      {builder.allowed && (
        <Link href="/oma-quest/editor" className="inline-flex text-xs font-semibold text-violet-300 hover:text-violet-200">
          Eigene Location bauen →
        </Link>
      )}
    </div>
  );
}
