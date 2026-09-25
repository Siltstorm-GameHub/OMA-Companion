import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getBuilderAccess } from "@/lib/dnd/custom-worlds";
import WorldList from "@/components/te-map/editor/WorldList";

export const metadata = { title: "Locations bauen | OMA Quest" };

export default async function EditorHomePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=%2Foma-quest%2Feditor");
  const access = await getBuilderAccess(session.user.id);

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="font-battle text-lg text-white">Locations bauen</h1>
        <p className="text-xs text-gray-500">Gestalte eigene Orte für OMA Quest — mit Karte, NPCs und Quest. Sobald du veröffentlichst, erscheint sie auf dem Feld, das du auf der Weltkarte gewählt hast.</p>
      </div>
      {access.allowed ? (
        <WorldList />
      ) : (
        <p className="text-sm text-gray-400 moba-panel rounded-2xl p-4">Locations bauen dürfen Mitglieder mit einem aktiven Community-Job. Bewirb dich im Profil auf einen Job.</p>
      )}
    </div>
  );
}
