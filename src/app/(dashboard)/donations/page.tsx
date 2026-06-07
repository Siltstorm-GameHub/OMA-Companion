import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import Image from "next/image";
import { Heart, Flame, CalendarDays, Users, Euro, ShoppingCart, TrendingDown, Wallet } from "lucide-react";
import DonationAdminPanel from "./DonationAdminPanel";

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
  const myId  = session?.user?.id;
  const role  = (session?.user as { role?: string } | undefined)?.role ?? "user";
  const isAdmin = role === "admin";

  const [donations, expenses, allUsers, adminDonations, adminExpenses] = await Promise.all([
    prisma.donation.findMany({
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    }),
    prisma.poolExpense.findMany({ orderBy: { date: "desc" } }),
    isAdmin ? prisma.user.findMany({ select: { id: true, name: true, image: true }, orderBy: { name: "asc" } }) : Promise.resolve([]),
    isAdmin ? prisma.donation.findMany({
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { createdAt: "desc" }],
    }) : Promise.resolve([]),
    isAdmin ? prisma.poolExpense.findMany({ orderBy: { date: "desc" } }) : Promise.resolve([]),
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

      {/* ── Admin-Panel ─────────────────────────────────────────────── */}
      {isAdmin && (
        <DonationAdminPanel
          users={allUsers}
          initialDonations={adminDonations as Parameters<typeof DonationAdminPanel>[0]["initialDonations"]}
          initialExpenses={adminExpenses}
        />
      )}

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
