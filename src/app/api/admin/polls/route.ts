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

// GET — alle PollJobs laden (neueste zuerst)
export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.pollJob.findMany({
    orderBy: { scheduledAt: "desc" },
  });
  return NextResponse.json(jobs);
}

// POST — neuen PollJob anlegen
export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { type, refId, channelId, scheduledAt, duration, question, excludedUserIds, customAnswers, allowMultiselect } = body;

  if (!type || !refId || !channelId || !scheduledAt) {
    return NextResponse.json({ error: "Fehlende Pflichtfelder" }, { status: 400 });
  }

  const job = await prisma.pollJob.create({
    data: {
      type,
      refId,
      channelId,
      scheduledAt:     new Date(scheduledAt),
      duration:        duration ?? 168,
      question:        question?.trim() || null,
      excludedUserIds:  Array.isArray(excludedUserIds) ? excludedUserIds : [],
      customAnswers:    Array.isArray(customAnswers) ? customAnswers : [],
      allowMultiselect: allowMultiselect === true,
      status:           "pending",
    },
  });

  return NextResponse.json(job, { status: 201 });
}
