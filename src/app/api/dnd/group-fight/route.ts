import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { actInFight, beginFight, cancelLobby, closeFight, groupInfo, pollFight, respondLobby, startLobby } from "@/lib/dnd/group-fight-server";
import { RAID_BOSSES } from "@/lib/dnd/combat";

export const dynamic = "force-dynamic";

async function me() {
  const session = await auth();
  if (!session?.user?.id) return { error: NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 }) } as const;
  const card = await getMyDndCard(session.user.id);
  if (!card) return { error: NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 }) } as const;
  return { card } as const;
}

async function snapshot(card: NonNullable<Awaited<ReturnType<typeof getMyDndCard>>>) {
  const [fight, group] = await Promise.all([pollFight(card), groupInfo(card.id)]);
  return { fight, group, raidBosses: group.raid ? RAID_BOSSES : [] };
}

/** Abfrage (alle paar Sekunden von der Spielfläche): laufender Vorraum/Kampf, Einladung, Gruppen-Infos. */
export async function GET() {
  const m = await me();
  if ("error" in m) return m.error;
  return NextResponse.json(await snapshot(m.card));
}

/** { action: "start", monster, slug?, actor? } | { action: "join" | "decline", fightId } | { action: "begin" | "cancel" | "close", fightId } | { action: "act", fightId, act, target? } */
export async function POST(req: NextRequest) {
  const m = await me();
  if ("error" in m) return m.error;
  const b = await req.json().catch(() => ({}));
  const fightId = typeof b?.fightId === "string" ? b.fightId : "";
  const source = typeof b?.slug === "string" && typeof b?.actor === "string" ? { slug: b.slug, actor: b.actor } : undefined;

  const r = b?.action === "start" && typeof b.monster === "string" ? await startLobby(m.card, b.monster, source)
    : (b?.action === "join" || b?.action === "decline") && fightId ? await respondLobby(m.card, fightId, b.action === "join")
    : b?.action === "begin" && fightId ? await beginFight(m.card, fightId)
    : b?.action === "cancel" && fightId ? await cancelLobby(m.card, fightId)
    : b?.action === "close" && fightId ? await closeFight(m.card, fightId)
    : b?.action === "act" && fightId ? await actInFight(m.card, fightId, b.act, typeof b.target === "string" ? b.target : undefined)
    : { error: "Ungültige Aktion" };
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json(await snapshot(m.card));
}
