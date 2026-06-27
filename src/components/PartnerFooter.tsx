import { prisma } from "@/lib/prisma";
import PartnerFooterClient from "./PartnerFooterClient";

export default async function PartnerFooter() {
  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  if (partners.length === 0) return null;

  return <PartnerFooterClient partners={partners} />;
}
