import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [transactions, registrations, tournamentWins] = await Promise.all([
    // Punkte-Ereignisse (Level-Ups, Streak-Boni, etc.)
    prisma.pointTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    }),
    // Event-Anmeldungen
    prisma.eventRegistration.findMany({
      orderBy: { joinedAt: "desc" },
      take: 20,
      include: {
        user:  { select: { id: true, name: true, username: true, image: true } },
        event: { select: { title: true } },
      },
    }),
    // Turnier-Siege
    prisma.match.findMany({
      where: { winnerId: { not: null }, playedAt: { not: null } },
      orderBy: { playedAt: "desc" },
      take: 10,
      include: {
        winner: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
  ]);

  // Alle Ereignisse zusammenführen und nach Datum sortieren
  type FeedItem = {
    id: string; type: string; userId: string; userName: string;
    userImage: string | null; text: string; subtext?: string;
    amount?: number; createdAt: Date;
  };

  const items: FeedItem[] = [
    ...transactions.map(tx => ({
      id:        `tx-${tx.id}`,
      type:      tx.reason.includes("Level")   ? "levelup"  :
                 tx.reason.includes("Streak")  ? "streak"   :
                 tx.reason.includes("Turnier") ? "tournament" :
                 tx.reason.includes("Event")   ? "event"    : "points",
      userId:    tx.user.id,
      userName:  tx.user.username ?? tx.user.name ?? "?",
      userImage: tx.user.image,
      text:      tx.reason,
      amount:    tx.amount,
      createdAt: tx.createdAt,
    })),
    ...registrations.map(reg => ({
      id:        `reg-${reg.id}`,
      type:      "registration",
      userId:    reg.user.id,
      userName:  reg.user.username ?? reg.user.name ?? "?",
      userImage: reg.user.image,
      text:      `hat sich für "${reg.event.title}" angemeldet`,
      createdAt: reg.joinedAt,
    })),
    ...tournamentWins
      .filter(m => m.winner)
      .map(m => ({
        id:        `win-${m.id}`,
        type:      "win",
        userId:    m.winner!.id,
        userName:  m.winner!.username ?? m.winner!.name ?? "?",
        userImage: m.winner!.image,
        text:      "hat ein Match gewonnen 🏆",
        createdAt: m.playedAt!,
      })),
  ];

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return NextResponse.json(items.slice(0, 30));
}
