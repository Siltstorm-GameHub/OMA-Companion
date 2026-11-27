import { requireRole } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import type { HubDownloadDTO } from "@/lib/hub-downloads";
import AdminDownloadsClient from "./AdminDownloadsClient";

export default async function AdminDownloadsPage() {
  await requireRole("moderator");

  const items = await prisma.hubDownload.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
  });
  const initial: HubDownloadDTO[] = items.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-fg">Downloads</h1>
        <p className="text-sm text-muted mt-1">
          Dateien für den Reiter „Downloads“ im OMA Hub: Hintergrundbilder, Setup-Dateien und mehr.
        </p>
      </div>
      <AdminDownloadsClient initial={initial} />
    </div>
  );
}
