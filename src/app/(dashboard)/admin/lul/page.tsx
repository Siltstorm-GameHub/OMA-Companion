import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import LulAdminPanel from "./LulAdminPanel";

async function fetchLulData() {
  return Promise.all([
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
}

export type LulAdminSeasons = Awaited<ReturnType<typeof fetchLulData>>[0];

export default async function AdminLulPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin" && session.user.role !== "moderator") redirect("/dashboard");

  const [seasons, allUsers] = await fetchLulData();

  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Level-Up-League Verwaltung</h1>
        <p className="text-sm text-gray-500 mt-1">Saisons und Spieltage erstellen, Ergebnisse eintragen.</p>
      </div>
      <LulAdminPanel seasons={seasons} allUsers={allUsers} />
    </>
  );
}
