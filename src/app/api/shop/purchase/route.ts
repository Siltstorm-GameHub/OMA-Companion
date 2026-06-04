import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { purchaseItem } from "@/lib/shop";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { itemId } = await req.json();
  if (!itemId) return NextResponse.json({ error: "itemId fehlt" }, { status: 400 });

  const result = await purchaseItem(session.user.id, itemId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true, item: result.item });
}
