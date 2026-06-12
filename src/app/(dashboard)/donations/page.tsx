import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Image from "next/image";
import { Heart, Flame, CalendarDays, Users, Euro, ShoppingCart, TrendingDown, Wallet, Lightbulb } from "lucide-react";

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

function fmt(n: number) {
  return n.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function DonationsPage() {
  const session = await auth();
  const myId    = session?.user?.id;
  const [donations, expenses, ideas] = await Promise.all([
    prisma.donation.findMany({
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.poolExpense.findMany({ orderBy: { date: "desc" } }),
    prisma.poolIdea.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const totalPool  = donations.reduce((s, d) => s + d.amount, 0);
  const totalSpent = expenses.reduce((s, e) => s + e.amount, 0);
  const balance    = totalPool - totalSpent;

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

  const myEntry  = myId ? userMap.get(myId) : null;
  const myStreak = myEntry ? calcStreak(myEntry.entries) : 0;

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-8 sm:py-8 space-y-8">

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

        {/* PayPal Spenden-Button */}
        <div className="pt-2">
          <a
            href="https://www.paypal.com/donate/?business=communitykstv%40googlemail.com&currency_code=EUR"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #0070BA, #003087)",
              color: "#fff",
              boxShadow: "0 4px 16px rgba(0,112,186,0.35)",
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
            </svg>
            Jetzt Spenden
          </a>
          <p className="text-[11px] text-gray-600 mt-1.5">Bis zu 5 € / Monat · PayPal</p>
        </div>
      </div>

      {/* Bilanz-Karten */}
      <div className="grid grid-cols-3 gap-3">
        {/* Einnahmen */}
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(20,184,166,0.12), rgba(20,184,166,0.04))",
            border: "1px solid rgba(20,184,166,0.20)",
          }}
        >
          <div className="flex items-center justify-center gap-1.5 text-teal-400/70 mb-2">
            <Euro className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Gesamt</span>
          </div>
          <p className="text-2xl font-black text-white tabular-nums">{fmt(totalPool)}<span className="text-sm text-teal-400 ml-0.5">€</span></p>
        </div>

        {/* Ausgaben */}
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: "rgba(239,68,68,0.06)",
            border: "1px solid rgba(239,68,68,0.15)",
          }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2" style={{ color: "rgba(239,68,68,0.6)" }}>
            <TrendingDown className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Ausgaben</span>
          </div>
          <p className="text-2xl font-black text-white tabular-nums">{fmt(totalSpent)}<span className="text-sm text-red-400 ml-0.5">€</span></p>
        </div>

        {/* Guthaben */}
        <div
          className="rounded-2xl p-4 text-center"
          style={{
            background: balance >= 0 ? "rgba(74,222,128,0.07)" : "rgba(239,68,68,0.07)",
            border: `1px solid ${balance >= 0 ? "rgba(74,222,128,0.20)" : "rgba(239,68,68,0.20)"}`,
          }}
        >
          <div className="flex items-center justify-center gap-1.5 mb-2" style={{ color: balance >= 0 ? "rgba(74,222,128,0.7)" : "rgba(239,68,68,0.7)" }}>
            <Wallet className="w-3.5 h-3.5" />
            <span className="text-[10px] font-semibold uppercase tracking-widest">Guthaben</span>
          </div>
          <p className="text-2xl font-black text-white tabular-nums">
            {fmt(Math.abs(balance))}<span className="text-sm ml-0.5" style={{ color: balance >= 0 ? "#4ade80" : "#f87171" }}>€</span>
          </p>
        </div>
      </div>

      {/* Meine Streak */}
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
            <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-lg shrink-0"
              style={{ color: streakBadge(myStreak)!.color, background: streakBadge(myStreak)!.bg }}>
              {streakBadge(myStreak)!.label}
            </span>
          )}
        </div>
      )}

      {/* Ideen-Liste */}
      {ideas.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-yellow-400/70" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Wofür könnte das Geld ausgegeben werden?</h2>
          </div>
          <div className="space-y-2">
            {ideas.map((idea, i) => (
              <div
                key={idea.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(234,179,8,0.04)", border: "1px solid rgba(234,179,8,0.12)" }}
              >
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold tabular-nums"
                  style={{ background: "rgba(234,179,8,0.10)", color: "rgba(234,179,8,0.7)" }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{idea.title}</p>
                  {idea.description && <p className="text-xs text-gray-500 mt-0.5">{idea.description}</p>}
                </div>
                {idea.estimatedCost != null && (
                  <span className="text-sm font-bold text-yellow-400/80 shrink-0 tabular-nums">
                    ~{fmt(idea.estimatedCost)} €
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ausgaben-Liste */}
      {expenses.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Wofür wurde gespendet?</h2>
          </div>
          <div className="space-y-2">
            {expenses.map(e => (
              <div
                key={e.id}
                className="flex items-start gap-3 px-4 py-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.15)" }}
                >
                  <ShoppingCart className="w-4 h-4 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{e.title}</p>
                  {e.description && <p className="text-xs text-gray-500 mt-0.5">{e.description}</p>}
                  <p className="text-xs text-gray-600 mt-1">
                    {new Date(e.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                  </p>
                </div>
                <span className="text-sm font-bold text-red-400 shrink-0 tabular-nums">−{fmt(e.amount)} €</span>
              </div>
            ))}
          </div>
        </section>
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
                  {fmt(m.total)}
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
              const isMe  = user.id === myId;
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
                    <Image src={user.image} alt={user.name ?? ""} width={36} height={36}
                      className="w-9 h-9 rounded-full shrink-0" style={{ outline: "1px solid rgba(20,184,166,0.2)" }} />
                  ) : (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                      style={{ background: "linear-gradient(135deg,#0d9488,#115e59)" }}>
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
                    <span className="text-xs font-bold px-2 py-1 rounded-lg shrink-0"
                      style={{ color: badge.color, background: badge.bg }}>
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
