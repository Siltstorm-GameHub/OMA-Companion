import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Swords } from "lucide-react";
import RankPointsIcon from "@/components/RankPointsIcon";
import WinIcon from "@/components/WinIcon";
import Link from "next/link";
import Image from "next/image";

async function fetchUserData(id: string) {
  const [user, eventCount, matchWins, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, image: true, points: true, rankPoints: true },
    }),
    prisma.eventRegistration.count({ where: { userId: id } }),
    prisma.match.count({ where: { winnerId: id } }),
    prisma.pointTransaction.findMany({ where: { userId: id }, select: { reason: true } }),
  ]);
  if (!user) return null;
  const voiceHours   = transactions.filter(t => t.reason.includes("Sprachkanal")).length;
  const messageCount = transactions.filter(t => t.reason.includes("Nachrichten")).length * 10;
  return { ...user, eventCount, matchWins, voiceHours, messageCount };
}

type UserData = NonNullable<Awaited<ReturnType<typeof fetchUserData>>>;

function StatBar({ labelA, labelB, valA, valB, colorA = "bg-rose-500", colorB = "bg-blue-500" }: {
  labelA: string; labelB: string; valA: number; valB: number;
  colorA?: string; colorB?: string;
}) {
  const total = valA + valB || 1;
  const pctA  = Math.round((valA / total) * 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1.5">
        <span className={`font-bold ${valA >= valB ? "text-white" : "text-gray-500"}`}>{valA.toLocaleString("de-DE")}</span>
        <span className={`font-bold ${valB >= valA ? "text-white" : "text-gray-500"}`}>{valB.toLocaleString("de-DE")}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden flex bg-white/[0.05]">
        <div className={`${colorA} transition-all duration-700`} style={{ width: `${pctA}%` }} />
        <div className={`${colorB} flex-1 transition-all duration-700`} />
      </div>
    </div>
  );
}

function Avatar({ user, accent }: { user: UserData; accent: string }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden ring-2 ${accent}`}>
        {user.image
          ? <Image src={user.image} alt={user.username ?? user.name ?? ""} width={80} height={80} className="w-full h-full object-cover" />
          : <div className="w-full h-full bg-gradient-to-br from-rose-600 to-rose-950 flex items-center justify-center text-2xl font-bold text-white">
              {(user.username ?? user.name ?? "?")[0].toUpperCase()}
            </div>}
      </div>
      <div className="text-center">
        <p className="font-bold text-white text-sm">{user.username ?? user.name ?? "?"}</p>
        <p className="text-xs font-medium text-amber-400">{(user.rankPoints ?? 0).toLocaleString("de-DE")} Pts</p>
      </div>
    </div>
  );
}

export default async function CompareProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const meId    = session?.user?.id;
  if (!meId) notFound();

  const [me, opponent] = await Promise.all([
    fetchUserData(meId),
    fetchUserData(id),
  ]);

  if (!me || !opponent) notFound();

  const [myRank, oppRank] = await Promise.all([
    prisma.user.count({ where: { rankPoints: { gt: me.rankPoints ?? 0 } } }).then(c => c + 1),
    prisma.user.count({ where: { rankPoints: { gt: opponent.rankPoints ?? 0 } } }).then(c => c + 1),
  ]);

  const STATS = [
    { icon: <RankPointsIcon size={16} />,         label: "Rangpunkte",     valA: me.rankPoints ?? 0,    valB: opponent.rankPoints ?? 0,    colorA: "bg-amber-500",  colorB: "bg-amber-400/50"  },
    { icon: <WinIcon size={16} />,                 label: "Turnier-Siege",  valA: me.matchWins,    valB: opponent.matchWins,    colorA: "bg-rose-500",   colorB: "bg-rose-400/50"   },
    { icon: <CalendarDays className="w-4 h-4" />, label: "Events",         valA: me.eventCount,   valB: opponent.eventCount,   colorA: "bg-blue-500",   colorB: "bg-blue-400/50"   },
    { icon: <Swords className="w-4 h-4" />,       label: "Voice-Stunden",  valA: me.voiceHours,   valB: opponent.voiceHours,   colorA: "bg-teal-500", colorB: "bg-teal-400/50" },
  ];

  return (
    <div className="p-5 sm:p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">

      {/* Back */}
      <Link href={`/profile/${id}`}
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Zurück zum Profil
      </Link>

      {/* Header */}
      <div className="glass card-shine rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 via-transparent to-blue-500/8 pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4">
          <Avatar user={me}       accent="ring-rose-500/30" />

          <div className="text-center flex-1">
            <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-1">VS</p>
            <div className="flex justify-center gap-3 text-xs">
              <div className="text-center">
                <p className="text-gray-500">Rang</p>
                <p className="font-bold text-white">#{myRank}</p>
              </div>
              <div className="w-px bg-white/[0.06]" />
              <div className="text-center">
                <p className="text-gray-500">Rang</p>
                <p className="font-bold text-white">#{oppRank}</p>
              </div>
            </div>
          </div>

          <Avatar user={opponent} accent="ring-blue-500/30" />
        </div>
      </div>

      {/* Stats comparison */}
      <div className="glass card-shine rounded-2xl p-5 space-y-5">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Statistik-Vergleich</p>

        {STATS.map(s => (
          <div key={s.label}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-600">{s.icon}</span>
              <span className="text-xs text-gray-400">{s.label}</span>
            </div>
            <StatBar
              labelA={me.username ?? me.name ?? "Du"}
              labelB={opponent.username ?? opponent.name ?? "?"}
              valA={s.valA} valB={s.valB}
              colorA={s.colorA} colorB={s.colorB}
            />
          </div>
        ))}
      </div>

      {/* Winner summary */}
      <div className="glass rounded-2xl p-4 text-center">
        {(me.rankPoints ?? 0) > (opponent.rankPoints ?? 0) ? (
          <p className="text-sm text-white">
            Du führst mit <span className="text-amber-400 font-bold">{((me.rankPoints ?? 0) - (opponent.rankPoints ?? 0)).toLocaleString("de-DE")} Punkten</span> Vorsprung 🏆
          </p>
        ) : (me.rankPoints ?? 0) < (opponent.rankPoints ?? 0) ? (
          <p className="text-sm text-white">
            <span className="font-semibold">{opponent.username ?? opponent.name}</span> führt mit{" "}
            <span className="text-rose-400 font-bold">{((opponent.rankPoints ?? 0) - (me.rankPoints ?? 0)).toLocaleString("de-DE")} Punkten</span> — hol auf! 💪
          </p>
        ) : (
          <p className="text-sm text-gray-400">Gleichstand — ein fairer Kampf! 🤝</p>
        )}
      </div>
    </div>
  );
}
