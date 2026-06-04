import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import Image from "next/image";
import { RelativeTime } from "@/components/RelativeTime";
import Link from "next/link";

const TYPE_CONFIG: Record<string, { emoji: string; color: string }> = {
  levelup:     { emoji: "⬆️", color: "text-purple-400"  },
  streak:      { emoji: "🔥", color: "text-orange-400"  },
  tournament:  { emoji: "🏆", color: "text-amber-400"   },
  win:         { emoji: "⚔️", color: "text-rose-400"    },
  event:       { emoji: "📅", color: "text-blue-400"    },
  registration:{ emoji: "✅", color: "text-emerald-400" },
  points:      { emoji: "⭐", color: "text-amber-300"   },
};

export default async function FeedPage() {
  await auth();

  const [transactions, registrations, tournamentWins] = await Promise.all([
    prisma.pointTransaction.findMany({
      orderBy: { createdAt: "desc" }, take: 40,
      include: { user: { select: { id: true, name: true, username: true, image: true } } },
    }),
    prisma.eventRegistration.findMany({
      orderBy: { joinedAt: "desc" }, take: 25,
      include: {
        user:  { select: { id: true, name: true, username: true, image: true } },
        event: { select: { title: true } },
      },
    }),
    prisma.match.findMany({
      where: { winnerId: { not: null }, playedAt: { not: null } },
      orderBy: { playedAt: "desc" }, take: 15,
      select: { id: true, winnerId: true, playedAt: true },
    }),
  ]);

  // Gewinner-User separat laden
  const winnerIds = [...new Set(tournamentWins.map(m => m.winnerId!))];
  const winnerUsers = winnerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: winnerIds } },
        select: { id: true, name: true, username: true, image: true },
      })
    : [];
  const winnerMap = new Map(winnerUsers.map(u => [u.id, u]));

  type Item = { id: string; type: string; userId: string; userName: string; userImage: string | null; text: string; amount?: number; createdAt: Date };

  const items: Item[] = [
    ...transactions.map(tx => ({
      id:        `tx-${tx.id}`,
      type:      tx.reason.includes("Streak") ? "streak" : tx.reason.includes("Turnier") ? "tournament" : tx.reason.includes("Event") ? "event" : "points",
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
      .filter(m => m.winnerId && winnerMap.has(m.winnerId))
      .map(m => {
        const winner = winnerMap.get(m.winnerId!)!;
        return {
          id:        `win-${m.id}`,
          type:      "win",
          userId:    winner.id,
          userName:  winner.username ?? winner.name ?? "?",
          userImage: winner.image,
          text:      "hat ein Match gewonnen 🏆",
          createdAt: m.playedAt!,
        };
      }),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, 50);

  return (
    <div className="p-5 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">

      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Aktivitäts-Feed</h1>
        </div>
        <p className="text-sm text-gray-500 ml-10">Was in der Community gerade passiert</p>
      </div>

      <div className="glass card-shine rounded-2xl overflow-hidden divide-y divide-white/[0.04]">
        {items.length === 0 && (
          <div className="p-4">
            <EmptyState
              type="feed"
              title="Noch keine Aktivitäten"
              description="Hier erscheinen Anmeldungen, Punkte und Turnier-Ergebnisse aus der Community."
            />
          </div>
        )}
        {items.map((item, i) => {
          const cfg = TYPE_CONFIG[item.type] ?? TYPE_CONFIG.points;
          return (
            <div key={item.id}
              className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-white/[0.02] transition-colors animate-slide-up"
              style={{ animationDelay: `${Math.min(i * 15, 300)}ms` }}>

              {/* Avatar */}
              <Link href={`/profile/${item.userId}`} className="shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-white/[0.08] hover:ring-rose-500/30 transition-all">
                  {item.userImage
                    ? <Image src={item.userImage} alt={item.userName} width={36} height={36} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-white/[0.05] flex items-center justify-center text-xs font-bold text-gray-400">
                        {item.userName[0].toUpperCase()}
                      </div>}
                </div>
              </Link>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white leading-snug">
                  <Link href={`/profile/${item.userId}`} className="font-semibold hover:text-rose-300 transition-colors">
                    {item.userName}
                  </Link>
                  {" "}
                  <span className="text-gray-400">{item.text}</span>
                </p>
                <RelativeTime date={item.createdAt} className="text-[10px] text-gray-600 mt-0.5 block" />
              </div>

              {/* Right side */}
              <div className="shrink-0 flex items-center gap-2">
                {item.amount !== undefined && item.amount > 0 && (
                  <span className="text-xs font-bold text-amber-400 tabular-nums">+{item.amount}</span>
                )}
                <span className="text-base leading-none" title={item.type}>{cfg.emoji}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
