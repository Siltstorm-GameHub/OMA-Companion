import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import AdminNav from "../AdminNav";
import LulAdminPanel from "./LulAdminPanel";

export default async function AdminLulPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin" && session.user.role !== "moderator") redirect("/dashboard");

  const [seasons, allUsers] = await Promise.all([
    prisma.lulSeason.findMany({
      orderBy: { number: "desc" },
      include: {
        spieltage: {
          orderBy: { number: "asc" },
          include: {
            entries: {
              include: { user: { select: { id: true, name: true, username: true, image: true } } },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, username: true, image: true },
    }),
  ]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <AdminNav />
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Level-Up-League Verwaltung</h1>
        <p className="text-sm text-gray-500 mt-1">Saisons und Spieltage erstellen, Ergebnisse eintragen.</p>
      </div>
      <LulAdminPanel seasons={seasons as Parameters<typeof LulAdminPanel>[0]["seasons"]} allUsers={allUsers} />
    </div>
  );
}
