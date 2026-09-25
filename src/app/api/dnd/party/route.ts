import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getMyDndCard } from "@/lib/dnd/quest-log";
import { followLeader, getInvitesFor, getPartyOf, invite, kick, leave, partyLeaderboard, renameParty, respond, setRaid, transferLead } from "@/lib/dnd/party";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  const party = await getPartyOf(card.id);
  return NextResponse.json({ myCardId: card.id, party, invites: await getInvitesFor(card.id), leaderboard: await partyLeaderboard(5, party?.id) });
}

/** { action: "invite", cardId } | { action: "accept" | "decline", inviteId } | { action: "leave" } */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nicht angemeldet" }, { status: 401 });
  const card = await getMyDndCard(session.user.id);
  if (!card) return NextResponse.json({ error: "Kein OMA-Quest-Charakter" }, { status: 400 });
  const body = await req.json().catch(() => ({}));

  let r: { ok: true } | { error: string };
  if (body?.action === "invite" && typeof body.cardId === "string") r = await invite(card.id, body.cardId);
  else if ((body?.action === "accept" || body?.action === "decline") && typeof body.inviteId === "string") r = await respond(card.id, body.inviteId, body.action === "accept");
  else if (body?.action === "leave") { await leave(card.id); r = { ok: true }; }
  else if (body?.action === "kick" && typeof body.cardId === "string") r = await kick(card.id, body.cardId);
  else if (body?.action === "raid") r = await setRaid(card.id, body.on === true);
  else if (body?.action === "rename") r = await renameParty(card.id, body.name);
  else if (body?.action === "lead" && typeof body.cardId === "string") r = await transferLead(card.id, body.cardId);
  else if (body?.action === "follow") r = await followLeader(card.id);
  else r = { error: "Ungültige Aktion" };
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, party: await getPartyOf(card.id), invites: await getInvitesFor(card.id) });
}
