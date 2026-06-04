import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { CalendarDays, ExternalLink, Users, Zap, Clock } from "lucide-react";
import SyncButton from "./SyncButton";
import RegisterButton from "./RegisterButton";

const STATUS_CONFIG: Record<string, {
  label: string;
  badge: string;
  bar: string;
  glow: string;
  dot: string;
}> = {
  open:     { label: "Offen",   badge: "text-blue-300 bg-blue-500/10 border border-blue-500/20",   bar: "bg-blue-400",    glow: "from-blue-500/5",    dot: "bg-blue-400" },
  active:   { label: "Läuft",   badge: "text-emerald-300 bg-emerald-500/10 border border-emerald-500/20", bar: "bg-emerald-400 shadow-[0_0_8px_#34d399]", glow: "from-emerald-500/5", dot: "bg-emerald-400 animate-pulse" },
  closed:   { label: "Voll",    badge: "text-amber-300 bg-amber-500/10 border border-amber-500/20",   bar: "bg-amber-400",   glow: "from-amber-500/5",   dot: "bg-amber-400" },
  finished: { label: "Beendet", badge: "text-gray-500 bg-white/[0.04] border border-white/[0.06]",   bar: "bg-gray-700",    glow: "from-transparent",   dot: "bg-gray-600" },
};

const GUILD_ID = process.env.DISCORD_GUILD_ID ?? "";

export default async function EventsPage() {
  const session = await auth();
  const userId = session?.user?.id;

  const events = await prisma.event.findMany({
    orderBy: [{ status: "asc" }, { startAt: "asc" }],
    include: {
      _count: { select: { registrations: true } },
      registrations: userId ? { where: { userId } } : false,
    },
  });

  const openCount = events.filter(e => e.status === "open" || e.status === "active").length;

  return (
    <div className="p-5 sm:p-6 max-w-4xl mx-auto space-y-5 animate-fade-in">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Events</h1>
          </div>
          <p className="text-sm text-gray-500 ml-10">
            {openCount > 0
              ? <><span className="text-emerald-400 font-medium">{openCount}</span> aktive Events · synchronisiert mit Discord</>
              : "Synchronisiert mit Discord"}
          </p>
        </div>
        <SyncButton />
      </div>

      {/* ── Event List ─────────────────────────────────────────────── */}
      <div className="space-y-3">
        {events.length === 0 && (
          <div className="glass rounded-2xl p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">Keine Events vorhanden</p>
            <p className="text-gray-600 text-sm mt-1">Klicke auf "Discord sync" um Events zu laden.</p>
          </div>
        )}

        {events.map((ev, idx) => {
          const s = STATUS_CONFIG[ev.status] ?? STATUS_CONFIG.finished;
          const isRegistered = userId
            ? (ev.registrations as { userId: string }[])?.some((r) => r.userId === userId)
            : false;
          const isFull = !!(ev.maxPlayers && ev._count.registrations >= ev.maxPlayers);
          const canRegister = ev.status === "open" || ev.status === "active";

          const cleanDescription = ev.description
            ?.replace(/\n?\ndiscord:[^\n]*/g, "")
            .trim() || null;

          const discordEventUrl = ev.discordEventId && GUILD_ID
            ? `https://discord.com/events/${GUILD_ID}/${ev.discordEventId}`
            : null;

          const date = new Date(ev.startAt);

          return (
            <div
              key={ev.id}
              className="card-hover card-shine glass rounded-2xl p-5 flex items-start gap-5 relative overflow-hidden group animate-slide-up"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {/* Status accent left bar */}
              <div className={`absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full ${s.bar}`} />

              {/* Subtle status glow */}
              <div className={`absolute inset-0 bg-gradient-to-r ${s.glow} to-transparent opacity-60 pointer-events-none`} />

              {/* ── Date badge ──────────────────────────────────────── */}
              <div className="relative glass-heavy rounded-xl px-3 py-2.5 text-center min-w-[52px] shrink-0">
                <p className="text-xl font-bold text-white leading-none tabular-nums">
                  {date.getDate()}
                </p>
                <p className="text-[10px] text-gray-500 uppercase tracking-wide mt-0.5 font-medium">
                  {date.toLocaleString("de-DE", { month: "short" })}
                </p>
                <div className="flex items-center justify-center gap-0.5 mt-1.5 text-gray-600">
                  <Clock className="w-2.5 h-2.5" />
                  <span className="text-[9px] tabular-nums">
                    {date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>

              {/* ── Content ─────────────────────────────────────────── */}
              <div className="relative flex-1 min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-white text-base">{ev.title}</p>
                  {ev.discordEventId && (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/15 px-1.5 py-0.5 rounded-full font-medium">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5">
                        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.053.182.112.245a19.89 19.89 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
                      </svg>
                      Discord
                    </span>
                  )}
                  {ev.type === "tournament" && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-300 border border-amber-500/20 px-1.5 py-0.5 rounded-full font-medium">
                      Turnier
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {ev.game && (
                    <span className="text-xs text-gray-400 font-medium">{ev.game}</span>
                  )}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3 h-3" />
                    {ev._count.registrations}{ev.maxPlayers ? ` / ${ev.maxPlayers}` : ""}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-rose-400 font-semibold">
                    <Zap className="w-3 h-3" />
                    +{ev.pointReward} Pts
                  </span>
                  {isRegistered && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 px-1.5 py-0.5 rounded-full font-medium">
                      ✓ Angemeldet
                    </span>
                  )}
                </div>

                {cleanDescription && (
                  <p className="text-xs text-gray-600 mt-1.5 line-clamp-1">{cleanDescription}</p>
                )}

                {isRegistered && discordEventUrl && (
                  <a href={discordEventUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 mt-2 transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    Auch auf Discord anmelden
                  </a>
                )}
              </div>

              {/* ── Actions ─────────────────────────────────────────── */}
              <div className="relative flex flex-col items-end gap-2 shrink-0">
                <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${s.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {isFull && !isRegistered ? "Voll" : s.label}
                </span>
                {userId && canRegister && (
                  <RegisterButton
                    eventId={ev.id}
                    isRegistered={isRegistered}
                    isFull={isFull && !isRegistered}
                    discordEventUrl={discordEventUrl}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
