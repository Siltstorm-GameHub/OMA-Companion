import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import AdminDonationsClient from "./AdminDonationsClient";

export default async function AdminDonationsPage() {
  await requireRole("admin");

  const [donations, users] = await Promise.all([
    prisma.donation.findMany({
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, image: true },
    }),
  ]);

  return <AdminDonationsClient donations={donations} users={users} />;
}
