import { auth } from "@/auth";
import { upgradeUserCard } from "@/lib/battle-cards/upgrade";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: "Nicht eingeloggt." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const userCardId = body?.userCardId;
  if (typeof userCardId !== "string" || !userCardId) {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const result = await upgradeUserCard(session.user.id, userCardId);
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 400 });
  }
  return Response.json(result);
}
