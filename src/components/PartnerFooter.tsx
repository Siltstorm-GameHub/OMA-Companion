import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import PartnerFooterClient from "./PartnerFooterClient";

// Läuft bei jedem Seitenaufruf im Dashboard-Layout mit — Partner ändern sich selten, daher 5 min
// gecacht. Admin-Änderungen sind spätestens nach Ablauf sichtbar (Tag "partners" für sofort).
const getActivePartners = unstable_cache(
  () => prisma.partner.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ["partner-footer"],
  { revalidate: 300, tags: ["partners"] },
);

export default async function PartnerFooter() {
  const partners = await getActivePartners();

  if (partners.length === 0) return null;

  return <PartnerFooterClient partners={partners} />;
}
