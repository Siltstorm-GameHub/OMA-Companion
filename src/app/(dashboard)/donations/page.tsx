import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Image from "next/image";
import { Heart, Flame, CalendarDays, Users, Euro } from "lucide-react";

const MONTH_NAMES = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

function calcStreak(entries: { year: number; month: number }[]): number {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) =>
    a.year !== b.year ? b.year - a.year : b.month - a.month
  );
  const now = new Date();
  let checkYear  = now.getFullYear();
  let checkMonth = now.getMonth() + 1;
  let streak = 0;
  for (const entry of sorted) {
    if (entry.year === checkYear && entry.month === checkMonth) {
      streak++;
      checkMonth--;
      if (checkMonth === 0) { checkMonth = 12; checkYear--; }
    } else break;
  }
  return streak;
}

function streakBadge(streak: number): { label: string; color: string; bg: string } | null {
  if (streak >= 12) return { label: "12 Monate 🔥", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
  if (streak >= 6)  return { label: "6 Monate ⭐",  color: "#14b8a6", bg: "rgba(20,184,166,0.12)" };
  if (streak >= 3)  return { label: "3 Monate 💚",  color: "#4ade80", bg: "rgba(74,222,128,0.10)" };
  return null;
}

export default async function DonationsPage() {
  const session = await auth();
  const myId = session?.user?.id;

  const donations = await prisma.donation.findMany({
    include: { user: { select: { id: true, name: true, image: true } } },
    orderBy: [{ year: "asc" }, { month: "asc" }],
  });

  const totalPool = donations.reduce((s, d) => s + d.amount, 0);

  // Monats-Historie
  const monthlyMap = new Map<string, { year: number; month: number; total: number; donors: number }>();
  for (const d of donations) {
    const key = `${d.year}-${d.month}`;
    const ex = monthlyMap.get(key);
    if (ex) { ex.total += d.amount; ex.donors++; }
    else monthlyMap.set(key, { year: d.year, month: d.month, total: d.amount, donors: 1 });
  }
  const months = Array.from(monthlyMap.values())
    .sort((a, b) => a.year !== b.year ? b.year - a.year : b.month - a.month);

  // Spender (ohne individuelle Beträge)
  const userMap = new Map<string, { user: { id: string; name: string | null; image: string | null }; entries: { year: number; month: number }[] }>();
  for (const d of donations) {
    if (!userMap.has(d.userId)) userMap.set(d.userId, { user: d.user, entries: [] });
    userMap.get(d.userId)!.entries.push({ year: d.year, month: d.month });
  }
  const donors = Array.from(userMap.values())
    .map(({ user, entries }) => ({ user, streak: calcStreak(entries), totalMonths: entries.length }))
    .sort((a, b) => b.streak - a.streak || b.totalMonths - a.totalMonths);

  const myEntry = myId ? userMap.get(myId) : null;
  const myStreak = myEntry ? calcStreak(myEntry.entries) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-teal-400 mb-1">
          <Heart className="w-5 h-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">Community Spendenpool</span>
        </div>
        <h1 className="text-2xl font-black text-white">Gemeinsam für die Community</h1>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
          Wir sammeln freiwillig Geld, um uns gemeinsam etwas leisten zu können.
          Kein Wettbewerb — nur gegenseitige Unterstützung.
        </p>
      </div>

      {/* Pool-Gesamtbetrag */}
      <div
        className="rounded-2xl p-6 text-center"
        style={{
          background: "linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))",
          border: "1px solid rgba(20,184,166,0.20)",
          boxShadow: "0 0 40px rgba(20,184,166,0.08)",
        }}
      >
        <p className="text-xs text-teal-400/70 font-semibold uppercase tracking-widest mb-1">Gesamter Pool</p>
        <p className="text-5xl font-black text-white">
          {totalPool.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="text-2xl text-teal-400 ml-1">€</span>
        </p>
        <p className="text-xs text-gray-500 mt-2">{donors.length} Unterstützer · {months.length} aktive Monate</p>
      </div>

      {/* Meine Streak (nur wenn eingeloggt & gespendet) */}
      {myEntry && myStreak > 0 && (
        <div
          className="rounded-2xl p-4 flex items-center gap-4"
          style={{ background: "rgba(20,184,166,0.08)", border: "1px solid rgba(20,184,166,0.15)" }}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(20,184,166,0.15)" }}>
            <Flame className="w-5 h-5 text-teal-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Du bist seit <span className="text-teal-400">{myStreak} Monat{myStreak !== 1 ? "en" : ""} in Folge</span> dabei!</p>
            <p className="text-xs text-gray-500">Danke für deine Unterstützung 💚</p>
          </div>
          {streakBadge(myStreak) && (
            <span
              className="ml-auto text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
              style={{ color: streakBadge(myStreak)!.color, background: streakBadge(myStreak)!.bg }}
            >
              {streakBadge(myStreak)!.label}
            </span>
          )}
        </div>
      )}

      {/* Monats-Historie */}
      {months.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Monats-Historie</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {months.map(m => (
              <div
                key={`${m.year}-${m.month}`}
                className="rounded-xl px-4 py-3 flex items-center justify-between"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">{MONTH_NAMES[m.month - 1]} {m.year}</p>
                  <p className="text-xs text-gray-500">{m.donors} Spender</p>
                </div>
                <div className="flex items-center gap-0.5 text-teal-400 font-bold text-sm">
                  <Euro className="w-3 h-3" />
                  {m.total.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Spender-Wall */}
      {donors.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Unsere Unterstützer</h2>
          </div>
          <div className="space-y-2">
            {donors.map(({ user, streak, totalMonths }) => {
              const badge = streakBadge(streak);
              const isMe = user.id === myId;
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{
                    background: isMe ? "rgba(20,184,166,0.07)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isMe ? "rgba(20,184,166,0.18)" : "rgba(255,255,255,0.06)"}`,
                  }}
                >
                  {user.image ? (
                    <Image src={user.image} alt={user.name ?? ""} width={36} height={36} className="w-9 h-9 rounded-full shrink-0" style={{ outline: "1px solid rgba(20,184,166,0.2)" }} />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>
                      {user.name?.[0] ?? "?"}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {user.name ?? "Unbekannt"}
                      {isMe && <span className="text-teal-400 ml-1 text-xs">(Du)</span>}
                    </p>
                    <p className="text-xs text-gray-500">
                      {totalMonths} Monat{totalMonths !== 1 ? "e" : ""} gespendet
                      {streak >= 2 && <span className="text-teal-400 ml-1">· {streak} in Folge</span>}
                    </p>
                  </div>
                  {badge && (
                    <span
                      className="text-xs font-bold px-2 py-1 rounded-lg shrink-0"
                      style={{ color: badge.color, background: badge.bg }}
                    >
                      {badge.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {donations.length === 0 && (
        <div className="text-center py-12 text-gray-600">
          <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Spenden eingetragen.</p>
        </div>
      )}
    </div>
  );
}
