import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { purchaseCollectible } from "@/lib/collectibles";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht eingeloggt" }, { status: 401 });

  const { collectibleItemId } = await req.json();
  if (!collectibleItemId) return NextResponse.json({ error: "Item-ID fehlt" }, { status: 400 });

  const result = await purchaseCollectible(session.user.id, collectibleItemId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json({ ok: true });
}
