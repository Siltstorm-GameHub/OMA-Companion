// ============================================
// /games/blocks/versus — OMA Blocks Versus (Echtzeit-Multiplayer)
// ============================================
// Verbindet sich mit dem Multiplayer-Server (src/blocks-server). ?raum=CODE tritt direkt einem Raum bei.

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import BlocksVersusClient from "@/components/blocks/BlocksVersusClient";

export const metadata = {
  title: "OMA Blocks Versus | Games | OMA",
};

export default async function BlocksVersusPage({ searchParams }: { searchParams: Promise<{ raum?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?notice=login_required&callbackUrl=/games/blocks/versus");
  const { raum } = await searchParams;

  return (
    <div className="p-3 sm:p-6 max-w-6xl mx-auto animate-fade-in">
      <BlocksVersusClient initialRoomCode={typeof raum === "string" ? raum.toUpperCase() : null} />
    </div>
  );
}
