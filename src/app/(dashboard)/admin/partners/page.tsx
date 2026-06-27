import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import PartnerManager from "./PartnerManager";

export default async function AdminPartnersPage() {
  await requireRole("moderator");

  const partners = await prisma.partner.findMany({
    orderBy: { order: "asc" },
    include: { user: { select: { id: true, name: true, username: true, image: true, twitchLogin: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Partner</h1>
        <p className="text-sm text-gray-400 mt-1">
          Twitch-Kanäle von Community-Partnern verwalten. Logos werden automatisch von Twitch übernommen.
        </p>
      </div>
      <PartnerManager initialPartners={partners} />
    </div>
  );
}
