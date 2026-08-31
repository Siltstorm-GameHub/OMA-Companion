import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { awardProfileCompletionIfNeeded } from "@/lib/profile-completion-award";

const MAX_BIO = 200;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { bio } = await req.json();
  const cleaned = typeof bio === "string" ? bio.trim().slice(0, MAX_BIO) : null;

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { bio: cleaned || null },
  });

  if (cleaned) await awardProfileCompletionIfNeeded(session.user.id, "PROFILE_BIO");

  return NextResponse.json({ ok: true });
}
