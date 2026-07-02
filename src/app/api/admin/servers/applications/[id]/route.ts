import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/roles";
import { countOccupiedSlots } from "@/lib/gameservers";
import { createNotification } from "@/lib/notifications";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireRole("moderator");
  const { id } = await params;
  const body = (await req.json()) as { action?: "approve" | "deny" | "revoke"; adminNote?: string };

  if (!body.action || !["approve", "deny", "revoke"].includes(body.action)) {
    return NextResponse.json({ error: "Ungültige Aktion" }, { status: 400 });
  }

  const application = await prisma.serverApplication.findUnique({
    where: { id },
    include: { server: true },
  });
  if (!application) return NextResponse.json({ error: "Bewerbung nicht gefunden" }, { status: 404 });

  if (body.action === "approve") {
    const occupied = await countOccupiedSlots(application.serverId);
    if (occupied >= application.server.maxSlots) {
      return NextResponse.json({ error: "Server ist bereits voll" }, { status: 400 });
    }

    const updated = await prisma.serverApplication.update({
      where: { id },
      data: {
        status: "approved",
        decidedAt: new Date(),
        decidedBy: admin.id,
        adminNote: body.adminNote?.trim() || null,
      },
    });

    await createNotification(application.userId, {
      type: "server",
      title: "Bewerbung angenommen",
      body: `Du hast Zugang zu „${application.server.name}" erhalten.`,
      url: "/servers",
    });

    return NextResponse.json(updated);
  }

  if (body.action === "deny") {
    const updated = await prisma.serverApplication.update({
      where: { id },
      data: { status: "denied", decidedAt: new Date(), decidedBy: admin.id, adminNote: body.adminNote?.trim() || null },
    });

    await createNotification(application.userId, {
      type: "server",
      title: "Bewerbung abgelehnt",
      body: `Deine Bewerbung für „${application.server.name}" wurde abgelehnt.`,
      url: "/servers",
    });

    return NextResponse.json(updated);
  }

  // revoke
  const updated = await prisma.serverApplication.update({
    where: { id },
    data: { status: "revoked", decidedAt: new Date(), decidedBy: admin.id, adminNote: body.adminNote?.trim() || null },
  });

  await createNotification(application.userId, {
    type: "server",
    title: "Zugriff entzogen",
    body: `Dein Zugang zu „${application.server.name}" wurde entzogen.`,
    url: "/servers",
  });

  return NextResponse.json(updated);
}
