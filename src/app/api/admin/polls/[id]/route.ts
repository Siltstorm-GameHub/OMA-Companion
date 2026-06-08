import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const u = session.user as { role?: string };
  if (u.role !== "admin" && u.role !== "moderator") return null;
  return session;
}

// DELETE — PollJob stornieren
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const job = await prisma.pollJob.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Nicht gefunden" }, { status: 404 });
  if (job.status === "sent") return NextResponse.json({ error: "Bereits gesendet" }, { status: 400 });

  await prisma.pollJob.update({ where: { id }, data: { status: "cancelled" } });
  return NextResponse.json({ ok: true });
}
