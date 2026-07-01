import { notFound } from "next/navigation";
import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import ApplicationsManager from "./ApplicationsManager";

export default async function ServerApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole("moderator");
  const { id: serverId } = await params;

  const server = await prisma.gameServer.findUnique({ where: { id: serverId } });
  if (!server) notFound();

  const applications = await prisma.serverApplication.findMany({
    where: { serverId },
    orderBy: { appliedAt: "desc" },
    include: { user: { select: { id: true, name: true, username: true, image: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-black text-white">Bewerbungen — {server.name}</h1>
        <p className="text-sm text-gray-400 mt-1">{server.game} · max. {server.maxSlots} Plätze</p>
      </div>
      <ApplicationsManager
        initialApplications={applications.map((a) => ({
          ...a,
          appliedAt: a.appliedAt.toISOString(),
          expiresAt: a.expiresAt ? a.expiresAt.toISOString() : null,
        }))}
      />
    </div>
  );
}
