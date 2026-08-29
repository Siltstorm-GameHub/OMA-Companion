import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { toCardData, resolveAvatarsForCards } from "@/lib/battle-cards/card-view";
import MyCardEditor from "@/components/battle-cards/MyCardEditor";

export const metadata = {
  title: "Meine Community-Karte | OMA Battle Cards",
};

export default async function MyCardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=login_required&callbackUrl=/battle-cards/my-card");
  }

  const me = await prisma.user.findUnique({ where: { id: session.user.id }, select: { discordId: true } });
  const card = me?.discordId
    ? await prisma.card.findUnique({ where: { linkedDiscordId: me.discordId } })
    : null;

  if (!card) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6">
        <h1 className="text-lg font-black text-white">Meine Community-Karte</h1>
        <p className="text-sm text-gray-500 mt-2">
          Du hast noch keine eigene Community-Karte — die wird automatisch angelegt, sobald deine
          Discord-Verknüpfung aktiv ist.
        </p>
      </div>
    );
  }

  const avatarByDiscordId = await resolveAvatarsForCards([card]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-lg font-black text-white">Meine Community-Karte</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          Untertitel und Beschreibung deiner eigenen Karte anpassen — Stats/Klasse werden automatisch
          aus deiner Aktivität berechnet.
        </p>
      </div>
      <MyCardEditor card={toCardData(card, avatarByDiscordId)} />
    </div>
  );
}
