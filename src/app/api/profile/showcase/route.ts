import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { updateShowcase } from "@/lib/collectibles";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { itemIds } = await req.json() as { itemIds: string[] };
  if (!Array.isArray(itemIds)) return NextResponse.json({ error: "itemIds muss ein Array sein" }, { status: 400 });

  const result = await updateShowcase(session.user.id, itemIds);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
